-- =============================================================================
-- StudyFlow AI — 0001 Fundação
-- Perfis, lista de e-mails autorizados, cursos, disciplinas, aulas e transcrições.
--
-- Convenções adotadas em todas as migrações:
--   * Toda tabela de dados do usuário possui `user_id` e Row Level Security.
--   * Relações entre tabelas do usuário usam chaves estrangeiras compostas
--     (id, user_id) para impedir que um registro aponte para dados de outra conta,
--     mesmo que alguém conheça o UUID (FKs ignoram RLS).
--   * O papel `anon` não recebe nenhum privilégio. O papel `authenticated`
--     recebe apenas o mínimo necessário, inclusive no nível de coluna.
--   * Status e enumerações usam `text` + CHECK (mais fácil de evoluir que ENUM).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Funções utilitárias
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function public.set_updated_at() from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- Lista de e-mails autorizados (cadastro fechado)
-- Somente o service role / SQL editor acessa esta tabela.
-- -----------------------------------------------------------------------------
create table public.allowed_emails (
  email      text primary key
             check (email = lower(btrim(email)) and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  note       text check (char_length(note) <= 200),
  created_at timestamptz not null default now()
);

alter table public.allowed_emails enable row level security;
revoke all on table public.allowed_emails from public, anon, authenticated;
grant all on table public.allowed_emails to service_role;

comment on table public.allowed_emails is
  'E-mails autorizados a possuir conta. Inserções em auth.users com e-mail fora desta lista são rejeitadas.';

-- Bloqueia a criação (ou troca de e-mail) de contas não autorizadas no próprio banco,
-- independentemente da configuração "Allow new users to sign up" do painel.
create or replace function public.enforce_email_allowlist()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and new.email is not distinct from old.email then
    return new;
  end if;

  if new.email is null
     or not exists (
       select 1 from public.allowed_emails a
       where a.email = lower(btrim(new.email))
     ) then
    raise exception 'Cadastro não autorizado para este e-mail.'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_email_allowlist() from public, anon, authenticated;

create trigger enforce_email_allowlist
  before insert or update of email on auth.users
  for each row execute function public.enforce_email_allowlist();

-- -----------------------------------------------------------------------------
-- Perfis e preferências
-- Valores nulos nos limites significam "usar o padrão definido no servidor".
-- As variáveis de ambiente do servidor/worker são sempre o teto.
-- -----------------------------------------------------------------------------
create table public.profiles (
  id                             uuid primary key references auth.users (id) on delete cascade,
  display_name                   text check (char_length(display_name) <= 120),
  auto_delete_audio              boolean not null default true,
  audio_retention_hours          integer not null default 0
                                 check (audio_retention_hours between 0 and 168),
  monthly_budget_usd             numeric(10, 2) check (monthly_budget_usd >= 0),
  max_audio_hours_per_month      numeric(6, 2) check (max_audio_hours_per_month >= 0),
  max_lessons_per_month          integer check (max_lessons_per_month >= 0),
  max_research_topics_per_lesson integer check (max_research_topics_per_lesson between 0 and 20),
  max_sources_per_topic          integer check (max_sources_per_topic between 0 and 20),
  created_at                     timestamptz not null default now(),
  updated_at                     timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;

create policy profiles_select_own on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

revoke all on table public.profiles from public, anon, authenticated;
grant select on table public.profiles to authenticated;
grant update (
  display_name, auto_delete_audio, audio_retention_hours, monthly_budget_usd,
  max_audio_hours_per_month, max_lessons_per_month,
  max_research_topics_per_lesson, max_sources_per_topic
) on table public.profiles to authenticated;
grant all on table public.profiles to service_role;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id) on conflict (id) do nothing;
  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- Cursos (ex.: "Biotecnologia — Universidade X")
-- -----------------------------------------------------------------------------
create table public.courses (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name        text not null check (char_length(btrim(name)) between 1 and 160),
  institution text check (char_length(institution) <= 160),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (id, user_id)
);

create unique index courses_user_name_key on public.courses (user_id, lower(name));

create trigger courses_set_updated_at
  before update on public.courses
  for each row execute function public.set_updated_at();

alter table public.courses enable row level security;

create policy courses_select_own on public.courses
  for select to authenticated using (user_id = (select auth.uid()));
create policy courses_insert_own on public.courses
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy courses_update_own on public.courses
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy courses_delete_own on public.courses
  for delete to authenticated using (user_id = (select auth.uid()));

revoke all on table public.courses from public, anon, authenticated;
grant select, delete on table public.courses to authenticated;
grant insert (name, institution) on table public.courses to authenticated;
grant update (name, institution) on table public.courses to authenticated;
grant all on table public.courses to service_role;

-- -----------------------------------------------------------------------------
-- Disciplinas
-- `keywords` = vocabulário científico usado como contexto na transcrição.
-- -----------------------------------------------------------------------------
create table public.subjects (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  course_id   uuid,
  name        text not null check (char_length(btrim(name)) between 1 and 160),
  code        text check (char_length(code) <= 40),
  professor   text check (char_length(professor) <= 160),
  description text check (char_length(description) <= 2000),
  keywords    text[] not null default '{}'
              check (cardinality(keywords) <= 200),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (id, user_id),
  foreign key (course_id, user_id)
    references public.courses (id, user_id) on delete set null (course_id)
);

create unique index subjects_user_name_key on public.subjects (user_id, lower(name));
create index subjects_course_idx on public.subjects (course_id);

create trigger subjects_set_updated_at
  before update on public.subjects
  for each row execute function public.set_updated_at();

alter table public.subjects enable row level security;

create policy subjects_select_own on public.subjects
  for select to authenticated using (user_id = (select auth.uid()));
create policy subjects_insert_own on public.subjects
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy subjects_update_own on public.subjects
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy subjects_delete_own on public.subjects
  for delete to authenticated using (user_id = (select auth.uid()));

revoke all on table public.subjects from public, anon, authenticated;
grant select, delete on table public.subjects to authenticated;
grant insert (course_id, name, code, professor, description, keywords)
  on table public.subjects to authenticated;
grant update (course_id, name, code, professor, description, keywords)
  on table public.subjects to authenticated;
grant all on table public.subjects to service_role;

-- -----------------------------------------------------------------------------
-- Aulas
-- O status é controlado pelo sistema (RPCs e worker), não editável diretamente.
-- Excluir uma disciplina com aulas é bloqueado (ON DELETE RESTRICT) para evitar
-- perda acidental de transcrições e materiais.
-- -----------------------------------------------------------------------------
create table public.lessons (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  subject_id     uuid not null,
  title          text not null check (char_length(btrim(title)) between 1 and 200),
  lesson_date    date,
  notes          text check (char_length(notes) <= 4000),
  source_type    text check (source_type in ('audio', 'text')),
  status         text not null default 'draft'
                 check (status in (
                   'draft',                -- criada, sem conteúdo
                   'uploading',            -- envio de áudio em andamento
                   'queued',               -- aguardando o worker
                   'processing_audio',     -- reconstrução/preparo com FFmpeg
                   'transcribing',         -- segmentos em transcrição
                   'transcribed',          -- transcrição disponível
                   'generating_materials', -- apostila, resumo, mapa e simulado
                   'researching',          -- pesquisa científica
                   'ready',                -- tudo concluído
                   'needs_review',         -- requer confirmação do usuário
                   'error'                 -- falha; ver last_error
                 )),
  status_message text check (char_length(status_message) <= 500),
  last_error     text check (char_length(last_error) <= 2000),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (id, user_id),
  foreign key (subject_id, user_id)
    references public.subjects (id, user_id) on delete restrict
);

create index lessons_user_created_idx on public.lessons (user_id, created_at desc);
create index lessons_subject_idx on public.lessons (subject_id, lesson_date desc nulls last);

create trigger lessons_set_updated_at
  before update on public.lessons
  for each row execute function public.set_updated_at();

alter table public.lessons enable row level security;

create policy lessons_select_own on public.lessons
  for select to authenticated using (user_id = (select auth.uid()));
create policy lessons_insert_own on public.lessons
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy lessons_update_own on public.lessons
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy lessons_delete_own on public.lessons
  for delete to authenticated using (user_id = (select auth.uid()));

revoke all on table public.lessons from public, anon, authenticated;
grant select, delete on table public.lessons to authenticated;
grant insert (subject_id, title, lesson_date, notes) on table public.lessons to authenticated;
grant update (subject_id, title, lesson_date, notes) on table public.lessons to authenticated;
grant all on table public.lessons to service_role;

-- -----------------------------------------------------------------------------
-- Transcrições
-- `original_text` é imutável: preserva o que foi transcrito/importado.
-- `edited_text` guarda a versão revisada pelo usuário (null = sem edição).
-- -----------------------------------------------------------------------------
create table public.transcriptions (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users (id) on delete cascade,
  lesson_id        uuid not null unique,
  source           text not null check (source in ('audio', 'text_file', 'text_paste')),
  original_text    text not null check (char_length(btrim(original_text)) between 1 and 3000000),
  edited_text      text check (char_length(edited_text) <= 3000000),
  edited_at        timestamptz,
  language         text check (char_length(language) <= 16),
  model            text check (char_length(model) <= 100),
  source_filename  text check (char_length(source_filename) <= 255),
  segment_count    integer check (segment_count >= 0),
  integrity_status text not null default 'not_applicable'
                   check (integrity_status in ('not_applicable', 'verified', 'incomplete')),
  integrity_report jsonb not null default '{}'::jsonb,
  review_flags     jsonb not null default '[]'::jsonb
                   check (jsonb_typeof(review_flags) = 'array'),
  word_count       integer not null check (word_count >= 0),
  char_count       integer not null check (char_count >= 0),
  content_sha256   text not null check (content_sha256 ~ '^[0-9a-f]{64}$'),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  foreign key (lesson_id, user_id)
    references public.lessons (id, user_id) on delete cascade
);

create index transcriptions_user_created_idx on public.transcriptions (user_id, created_at desc);

create or replace function public.guard_transcription_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.original_text is distinct from old.original_text
     or new.content_sha256 is distinct from old.content_sha256 then
    raise exception 'A transcrição original é imutável. Edite a versão revisada.'
      using errcode = '42501';
  end if;

  if new.edited_text is distinct from old.edited_text then
    -- Uma edição idêntica ao original não precisa ser armazenada.
    if new.edited_text is not null and new.edited_text = new.original_text then
      new.edited_text := null;
    end if;
    new.edited_at := case when new.edited_text is null then null else now() end;
  end if;

  return new;
end;
$$;

revoke all on function public.guard_transcription_update() from public, anon, authenticated;

create trigger transcriptions_guard_update
  before update on public.transcriptions
  for each row execute function public.guard_transcription_update();

create trigger transcriptions_set_updated_at
  before update on public.transcriptions
  for each row execute function public.set_updated_at();

alter table public.transcriptions enable row level security;

create policy transcriptions_select_own on public.transcriptions
  for select to authenticated using (user_id = (select auth.uid()));
create policy transcriptions_update_own on public.transcriptions
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Inserções do usuário acontecem apenas via public.import_transcription (RPC).
revoke all on table public.transcriptions from public, anon, authenticated;
grant select on table public.transcriptions to authenticated;
grant update (edited_text) on table public.transcriptions to authenticated;
grant all on table public.transcriptions to service_role;
