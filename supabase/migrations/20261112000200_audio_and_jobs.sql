-- =============================================================================
-- StudyFlow AI — 0002 Pipeline de áudio e fila de tarefas
-- audio_uploads, audio_parts, transcription_segments, processing_jobs
-- e as funções da fila persistente usada pelo worker.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Uploads de áudio (arquivo original dividido em partes no navegador)
-- -----------------------------------------------------------------------------
create table public.audio_uploads (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references auth.users (id) on delete cascade,
  lesson_id             uuid not null,
  original_filename     text not null check (char_length(original_filename) between 1 and 255),
  mime_type             text check (char_length(mime_type) <= 100),
  size_bytes            bigint not null check (size_bytes > 0 and size_bytes <= 2147483648),
  part_size_bytes       integer not null check (part_size_bytes between 1048576 and 52428800),
  total_parts           integer not null check (total_parts between 1 and 2048),
  duration_seconds      numeric(10, 2) check (duration_seconds >= 0),
  status                text not null default 'pending'
                        check (status in (
                          'pending',     -- registro criado, envio não iniciado
                          'uploading',   -- partes sendo enviadas
                          'uploaded',    -- todas as partes confirmadas
                          'assembling',  -- worker reconstruindo o arquivo
                          'ready',       -- arquivo preparado para transcrição
                          'transcribed', -- transcrição consolidada salva
                          'deleted',     -- arquivos removidos do armazenamento
                          'failed'
                        )),
  storage_bucket        text not null default 'lesson-audio',
  storage_prefix        text not null check (char_length(storage_prefix) between 1 and 300),
  retain_until          timestamptz,
  deletion_confirmed_at timestamptz,
  deleted_at            timestamptz,
  cleanup_report        jsonb not null default '{}'::jsonb,
  last_error            text check (char_length(last_error) <= 2000),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (id, user_id),
  foreign key (lesson_id, user_id)
    references public.lessons (id, user_id) on delete cascade
);

create index audio_uploads_lesson_idx on public.audio_uploads (lesson_id);
create index audio_uploads_cleanup_idx on public.audio_uploads (status, retain_until)
  where deleted_at is null;

create trigger audio_uploads_set_updated_at
  before update on public.audio_uploads
  for each row execute function public.set_updated_at();

alter table public.audio_uploads enable row level security;

create policy audio_uploads_select_own on public.audio_uploads
  for select to authenticated using (user_id = (select auth.uid()));

revoke all on table public.audio_uploads from public, anon, authenticated;
grant select on table public.audio_uploads to authenticated;
grant all on table public.audio_uploads to service_role;

-- -----------------------------------------------------------------------------
-- Partes enviadas (ordem + integridade)
-- -----------------------------------------------------------------------------
create table public.audio_parts (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  upload_id    uuid not null,
  part_index   integer not null check (part_index >= 0),
  size_bytes   integer not null check (size_bytes > 0),
  sha256       text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  storage_path text not null check (char_length(storage_path) between 1 and 400),
  status       text not null default 'pending'
               check (status in ('pending', 'uploaded', 'verified', 'deleted')),
  uploaded_at  timestamptz,
  verified_at  timestamptz,
  deleted_at   timestamptz,
  created_at   timestamptz not null default now(),
  unique (upload_id, part_index),
  foreign key (upload_id, user_id)
    references public.audio_uploads (id, user_id) on delete cascade
);

alter table public.audio_parts enable row level security;

create policy audio_parts_select_own on public.audio_parts
  for select to authenticated using (user_id = (select auth.uid()));

revoke all on table public.audio_parts from public, anon, authenticated;
grant select on table public.audio_parts to authenticated;
grant all on table public.audio_parts to service_role;

-- -----------------------------------------------------------------------------
-- Segmentos de transcrição (resultado individual de cada trecho de áudio)
-- -----------------------------------------------------------------------------
create table public.transcription_segments (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  lesson_id       uuid not null,
  upload_id       uuid not null,
  segment_index   integer not null check (segment_index >= 0),
  start_seconds   numeric(10, 3) not null check (start_seconds >= 0),
  end_seconds     numeric(10, 3) not null,
  overlap_seconds numeric(6, 3) not null default 0 check (overlap_seconds >= 0),
  status          text not null default 'pending'
                  check (status in ('pending', 'processing', 'done', 'failed')),
  text            text,
  model           text check (char_length(model) <= 100),
  attempts        integer not null default 0 check (attempts >= 0),
  last_error      text check (char_length(last_error) <= 2000),
  review_flags    jsonb not null default '[]'::jsonb check (jsonb_typeof(review_flags) = 'array'),
  usage           jsonb not null default '{}'::jsonb,
  completed_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  check (end_seconds > start_seconds),
  check (status <> 'done' or text is not null),
  unique (upload_id, segment_index),
  foreign key (lesson_id, user_id)
    references public.lessons (id, user_id) on delete cascade,
  foreign key (upload_id, user_id)
    references public.audio_uploads (id, user_id) on delete cascade
);

create index transcription_segments_lesson_idx
  on public.transcription_segments (lesson_id, segment_index);

create trigger transcription_segments_set_updated_at
  before update on public.transcription_segments
  for each row execute function public.set_updated_at();

alter table public.transcription_segments enable row level security;

create policy transcription_segments_select_own on public.transcription_segments
  for select to authenticated using (user_id = (select auth.uid()));

revoke all on table public.transcription_segments from public, anon, authenticated;
grant select on table public.transcription_segments to authenticated;
grant all on table public.transcription_segments to service_role;

-- -----------------------------------------------------------------------------
-- Fila persistente de tarefas
-- Uma tarefa ativa (queued/running) por aula e tipo, garantida por índice único.
-- -----------------------------------------------------------------------------
create table public.processing_jobs (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  lesson_id    uuid,
  job_type     text not null
               check (job_type in ('transcribe_audio', 'generate_materials', 'research_sources', 'cleanup_audio')),
  status       text not null default 'queued'
               check (status in ('queued', 'running', 'succeeded', 'failed', 'cancelled')),
  priority     smallint not null default 100,
  payload      jsonb not null default '{}'::jsonb,
  progress     jsonb not null default '{}'::jsonb,
  result       jsonb,
  attempts     integer not null default 0 check (attempts >= 0),
  max_attempts integer not null default 5 check (max_attempts between 1 and 20),
  run_after    timestamptz not null default now(),
  locked_by    text check (char_length(locked_by) <= 200),
  locked_at    timestamptz,
  heartbeat_at timestamptz,
  last_error   text check (char_length(last_error) <= 2000),
  started_at   timestamptz,
  finished_at  timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  foreign key (lesson_id, user_id)
    references public.lessons (id, user_id) on delete cascade
);

create unique index processing_jobs_one_active_key
  on public.processing_jobs (lesson_id, job_type)
  where status in ('queued', 'running');
create index processing_jobs_claim_idx
  on public.processing_jobs (priority, run_after, created_at)
  where status = 'queued';
create index processing_jobs_running_idx
  on public.processing_jobs (heartbeat_at)
  where status = 'running';
create index processing_jobs_lesson_idx
  on public.processing_jobs (lesson_id, created_at desc);

create trigger processing_jobs_set_updated_at
  before update on public.processing_jobs
  for each row execute function public.set_updated_at();

alter table public.processing_jobs enable row level security;

create policy processing_jobs_select_own on public.processing_jobs
  for select to authenticated using (user_id = (select auth.uid()));

revoke all on table public.processing_jobs from public, anon, authenticated;
grant select on table public.processing_jobs to authenticated;
grant all on table public.processing_jobs to service_role;

-- -----------------------------------------------------------------------------
-- Funções da fila (uso exclusivo do worker via service role)
-- -----------------------------------------------------------------------------

-- Enfileira uma tarefa. Se já existir uma tarefa ativa do mesmo tipo para a aula,
-- devolve a existente em vez de duplicar.
create or replace function public.enqueue_job(
  p_user_id      uuid,
  p_lesson_id    uuid,
  p_job_type     text,
  p_payload      jsonb default '{}'::jsonb,
  p_priority     smallint default 100,
  p_max_attempts integer default 5,
  p_run_after    timestamptz default now()
)
returns public.processing_jobs
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_job public.processing_jobs;
begin
  insert into public.processing_jobs (user_id, lesson_id, job_type, payload, priority, max_attempts, run_after)
  values (p_user_id, p_lesson_id, p_job_type, coalesce(p_payload, '{}'::jsonb), p_priority, p_max_attempts, p_run_after)
  on conflict (lesson_id, job_type) where status in ('queued', 'running') do nothing
  returning * into v_job;

  if v_job.id is null then
    select * into v_job
    from public.processing_jobs j
    where j.lesson_id = p_lesson_id
      and j.job_type = p_job_type
      and j.status in ('queued', 'running');
  end if;

  return v_job;
end;
$$;

-- Reserva a próxima tarefa disponível. Antes, devolve à fila (ou marca como falha,
-- se as tentativas se esgotaram) tarefas cujo worker parou de enviar sinais.
create or replace function public.claim_next_job(
  p_worker_id           text,
  p_job_types           text[] default null,
  p_stale_after_seconds integer default 900
)
returns setof public.processing_jobs
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_job public.processing_jobs;
begin
  if p_worker_id is null or btrim(p_worker_id) = '' then
    raise exception 'worker_id é obrigatório';
  end if;

  update public.processing_jobs j
     set status       = case when j.attempts >= j.max_attempts then 'failed' else 'queued' end,
         last_error   = left('Execução interrompida: o worker parou de responder.', 2000),
         locked_by    = null,
         locked_at    = null,
         heartbeat_at = null,
         finished_at  = case when j.attempts >= j.max_attempts then now() else null end
   where j.status = 'running'
     and coalesce(j.heartbeat_at, j.locked_at, j.updated_at)
         < now() - make_interval(secs => greatest(p_stale_after_seconds, 30));

  select * into v_job
  from public.processing_jobs j
  where j.status = 'queued'
    and j.run_after <= now()
    and (p_job_types is null or j.job_type = any (p_job_types))
  order by j.priority, j.run_after, j.created_at
  for update skip locked
  limit 1;

  if v_job.id is null then
    return;
  end if;

  update public.processing_jobs
     set status       = 'running',
         attempts     = attempts + 1,
         locked_by    = p_worker_id,
         locked_at    = now(),
         heartbeat_at = now(),
         started_at   = coalesce(started_at, now()),
         last_error   = null
   where id = v_job.id
  returning * into v_job;

  return next v_job;
end;
$$;

-- Sinal de vida + progresso. Retorna false se o worker perdeu a reserva.
create or replace function public.heartbeat_job(
  p_job_id    uuid,
  p_worker_id text,
  p_progress  jsonb default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.processing_jobs
     set heartbeat_at = now(),
         progress     = coalesce(p_progress, progress)
   where id = p_job_id
     and status = 'running'
     and locked_by = p_worker_id;
  return found;
end;
$$;

create or replace function public.complete_job(
  p_job_id    uuid,
  p_worker_id text,
  p_result    jsonb default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.processing_jobs
     set status       = 'succeeded',
         result       = p_result,
         finished_at  = now(),
         locked_by    = null,
         locked_at    = null,
         heartbeat_at = null,
         last_error   = null
   where id = p_job_id
     and status = 'running'
     and locked_by = p_worker_id;
  return found;
end;
$$;

-- Registra falha. Com p_retry = true e tentativas restantes, reagenda com
-- espera exponencial (30 s, 60 s, 120 s ... até 1 h).
create or replace function public.fail_job(
  p_job_id    uuid,
  p_worker_id text,
  p_error     text,
  p_retry     boolean default true
)
returns public.processing_jobs
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_job public.processing_jobs;
begin
  select * into v_job
  from public.processing_jobs
  where id = p_job_id and status = 'running' and locked_by = p_worker_id
  for update;

  if v_job.id is null then
    return null;
  end if;

  if p_retry and v_job.attempts < v_job.max_attempts then
    update public.processing_jobs
       set status       = 'queued',
           run_after    = now() + make_interval(secs => least(3600, 30 * power(2, greatest(v_job.attempts - 1, 0)))::integer),
           last_error   = left(p_error, 2000),
           locked_by    = null,
           locked_at    = null,
           heartbeat_at = null
     where id = p_job_id
    returning * into v_job;
  else
    update public.processing_jobs
       set status       = 'failed',
           finished_at  = now(),
           last_error   = left(p_error, 2000),
           locked_by    = null,
           locked_at    = null,
           heartbeat_at = null
     where id = p_job_id
    returning * into v_job;
  end if;

  return v_job;
end;
$$;

revoke all on function public.enqueue_job(uuid, uuid, text, jsonb, smallint, integer, timestamptz) from public, anon, authenticated;
revoke all on function public.claim_next_job(text, text[], integer) from public, anon, authenticated;
revoke all on function public.heartbeat_job(uuid, text, jsonb) from public, anon, authenticated;
revoke all on function public.complete_job(uuid, text, jsonb) from public, anon, authenticated;
revoke all on function public.fail_job(uuid, text, text, boolean) from public, anon, authenticated;

grant execute on function public.enqueue_job(uuid, uuid, text, jsonb, smallint, integer, timestamptz) to service_role;
grant execute on function public.claim_next_job(text, text[], integer) to service_role;
grant execute on function public.heartbeat_job(uuid, text, jsonb) to service_role;
grant execute on function public.complete_job(uuid, text, jsonb) to service_role;
grant execute on function public.fail_job(uuid, text, text, boolean) to service_role;

-- Pedido de nova tentativa feito pelo próprio usuário (tela de Processamento).
-- Só reabre tarefas da própria conta que falharam ou foram canceladas.
create or replace function public.request_job_retry(p_job_id uuid)
returns public.processing_jobs
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_job public.processing_jobs;
begin
  if v_uid is null then
    raise exception 'Não autenticado.' using errcode = '28000';
  end if;

  update public.processing_jobs j
     set status      = 'queued',
         attempts    = 0,
         run_after   = now(),
         finished_at = null
   where j.id = p_job_id
     and j.user_id = v_uid
     and j.status in ('failed', 'cancelled')
     and not exists (
       select 1 from public.processing_jobs other
       where other.lesson_id = j.lesson_id
         and other.job_type = j.job_type
         and other.status in ('queued', 'running')
     )
  returning * into v_job;

  if v_job.id is null then
    raise exception 'Tarefa não encontrada ou não pode ser reiniciada.' using errcode = 'P0002';
  end if;

  return v_job;
end;
$$;

revoke all on function public.request_job_retry(uuid) from public, anon;
grant execute on function public.request_job_retry(uuid) to authenticated, service_role;
