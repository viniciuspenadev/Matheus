-- =============================================================================
-- StudyFlow AI — 0003 Materiais de estudo, pesquisa científica, biblioteca,
-- simulados e registro de consumo.
-- Todas estas tabelas são escritas pelo worker (service role). O usuário lê e,
-- quando faz sentido (biblioteca, tentativas), escreve campos específicos.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Materiais gerados (apostila, resumo, glossário, mapa mental)
-- `content` segue um JSON tipado e validado (Zod) identificado por schema_version.
-- -----------------------------------------------------------------------------
create table public.study_materials (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references auth.users (id) on delete cascade,
  lesson_id            uuid not null,
  kind                 text not null check (kind in ('handout', 'summary', 'glossary', 'mind_map')),
  schema_version       integer not null default 1 check (schema_version >= 1),
  content              jsonb not null,
  content_markdown     text,
  model                text check (char_length(model) <= 100),
  prompt_version       text check (char_length(prompt_version) <= 50),
  transcription_sha256 text check (transcription_sha256 ~ '^[0-9a-f]{64}$'),
  generated_at         timestamptz not null default now(),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (lesson_id, kind),
  foreign key (lesson_id, user_id)
    references public.lessons (id, user_id) on delete cascade
);

create index study_materials_user_generated_idx on public.study_materials (user_id, generated_at desc);

create trigger study_materials_set_updated_at
  before update on public.study_materials
  for each row execute function public.set_updated_at();

alter table public.study_materials enable row level security;

create policy study_materials_select_own on public.study_materials
  for select to authenticated using (user_id = (select auth.uid()));

revoke all on table public.study_materials from public, anon, authenticated;
grant select on table public.study_materials to authenticated;
grant all on table public.study_materials to service_role;

-- -----------------------------------------------------------------------------
-- Fontes científicas e bibliográficas (somente registros retornados por APIs reais)
-- evidence_level:
--   metadata  = apenas metadados bibliográficos verificados
--   abstract  = resumo (abstract) consultado
--   full_text = texto completo efetivamente analisado
-- -----------------------------------------------------------------------------
create table public.scientific_sources (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users (id) on delete cascade,
  source_type      text not null
                   check (source_type in ('article', 'book', 'book_chapter', 'preprint', 'dataset', 'other')),
  provider         text not null
                   check (provider in ('openalex', 'crossref', 'openlibrary', 'googlebooks', 'pubmed', 'scielo')),
  external_id      text not null check (char_length(external_id) between 1 and 300),
  doi              text check (doi is null or (doi = lower(doi) and doi ~ '^10\.[0-9]{4,9}/\S+$')),
  isbn             text[] not null default '{}',
  title            text not null check (char_length(btrim(title)) between 1 and 1000),
  authors          jsonb not null default '[]'::jsonb check (jsonb_typeof(authors) = 'array'),
  publication_year integer check (publication_year between 1400 and 2100),
  venue            text check (char_length(venue) <= 500),
  publisher        text check (char_length(publisher) <= 300),
  edition          text check (char_length(edition) <= 100),
  landing_url      text check (char_length(landing_url) <= 2000),
  open_access_url  text check (char_length(open_access_url) <= 2000),
  abstract         text,
  evidence_level   text not null default 'metadata'
                   check (evidence_level in ('metadata', 'abstract', 'full_text')),
  is_retracted     boolean not null default false,
  has_correction   boolean not null default false,
  verification     jsonb not null default '{}'::jsonb,
  verified_at      timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (id, user_id),
  unique (user_id, provider, external_id)
);

create unique index scientific_sources_user_doi_key
  on public.scientific_sources (user_id, doi) where doi is not null;

create trigger scientific_sources_set_updated_at
  before update on public.scientific_sources
  for each row execute function public.set_updated_at();

alter table public.scientific_sources enable row level security;

create policy scientific_sources_select_own on public.scientific_sources
  for select to authenticated using (user_id = (select auth.uid()));

revoke all on table public.scientific_sources from public, anon, authenticated;
grant select on table public.scientific_sources to authenticated;
grant all on table public.scientific_sources to service_role;

-- Associação fonte ↔ aula (por tema pesquisado)
create table public.lesson_sources (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  lesson_id       uuid not null,
  source_id       uuid not null,
  topic           text not null check (char_length(btrim(topic)) between 1 and 200),
  query           text check (char_length(query) <= 500),
  relevance_score numeric(5, 4) check (relevance_score between 0 and 1),
  relevance_note  text check (char_length(relevance_note) <= 1000),
  created_at      timestamptz not null default now(),
  unique (lesson_id, source_id, topic),
  foreign key (lesson_id, user_id)
    references public.lessons (id, user_id) on delete cascade,
  foreign key (source_id, user_id)
    references public.scientific_sources (id, user_id) on delete cascade
);

create index lesson_sources_source_idx on public.lesson_sources (source_id);

alter table public.lesson_sources enable row level security;

create policy lesson_sources_select_own on public.lesson_sources
  for select to authenticated using (user_id = (select auth.uid()));

revoke all on table public.lesson_sources from public, anon, authenticated;
grant select on table public.lesson_sources to authenticated;
grant all on table public.lesson_sources to service_role;

-- -----------------------------------------------------------------------------
-- Biblioteca pessoal (livros e publicações salvos pelo usuário)
-- -----------------------------------------------------------------------------
create table public.saved_books (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  source_id  uuid not null,
  lesson_id  uuid,
  topic      text check (char_length(topic) <= 200),
  note       text check (char_length(note) <= 2000),
  created_at timestamptz not null default now(),
  unique (user_id, source_id),
  foreign key (source_id, user_id)
    references public.scientific_sources (id, user_id) on delete cascade,
  foreign key (lesson_id, user_id)
    references public.lessons (id, user_id) on delete set null (lesson_id)
);

alter table public.saved_books enable row level security;

create policy saved_books_select_own on public.saved_books
  for select to authenticated using (user_id = (select auth.uid()));
create policy saved_books_insert_own on public.saved_books
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy saved_books_update_own on public.saved_books
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy saved_books_delete_own on public.saved_books
  for delete to authenticated using (user_id = (select auth.uid()));

revoke all on table public.saved_books from public, anon, authenticated;
grant select, delete on table public.saved_books to authenticated;
grant insert (source_id, lesson_id, topic, note) on table public.saved_books to authenticated;
grant update (note) on table public.saved_books to authenticated;
grant all on table public.saved_books to service_role;

-- -----------------------------------------------------------------------------
-- Simulados
-- -----------------------------------------------------------------------------
create table public.quizzes (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references auth.users (id) on delete cascade,
  lesson_id            uuid not null,
  title                text not null check (char_length(btrim(title)) between 1 and 200),
  model                text check (char_length(model) <= 100),
  prompt_version       text check (char_length(prompt_version) <= 50),
  transcription_sha256 text check (transcription_sha256 ~ '^[0-9a-f]{64}$'),
  question_count       integer not null check (question_count between 1 and 50),
  generated_at         timestamptz not null default now(),
  created_at           timestamptz not null default now(),
  unique (id, user_id),
  foreign key (lesson_id, user_id)
    references public.lessons (id, user_id) on delete cascade
);

create index quizzes_lesson_idx on public.quizzes (lesson_id, generated_at desc);

alter table public.quizzes enable row level security;

create policy quizzes_select_own on public.quizzes
  for select to authenticated using (user_id = (select auth.uid()));

revoke all on table public.quizzes from public, anon, authenticated;
grant select on table public.quizzes to authenticated;
grant all on table public.quizzes to service_role;

create table public.quiz_questions (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users (id) on delete cascade,
  quiz_id          uuid not null,
  position         smallint not null check (position between 1 and 50),
  statement        text not null check (char_length(btrim(statement)) between 1 and 2000),
  options          text[] not null check (cardinality(options) = 4),
  correct_index    smallint not null check (correct_index between 0 and 3),
  explanation      text not null check (char_length(btrim(explanation)) between 1 and 4000),
  source_reference text check (char_length(source_reference) <= 1000),
  origin           text not null default 'lesson' check (origin in ('lesson', 'complement')),
  created_at       timestamptz not null default now(),
  unique (quiz_id, position),
  foreign key (quiz_id, user_id)
    references public.quizzes (id, user_id) on delete cascade
);

alter table public.quiz_questions enable row level security;

create policy quiz_questions_select_own on public.quiz_questions
  for select to authenticated using (user_id = (select auth.uid()));

revoke all on table public.quiz_questions from public, anon, authenticated;
grant select on table public.quiz_questions to authenticated;
grant all on table public.quiz_questions to service_role;

create table public.quiz_attempts (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  quiz_id    uuid not null,
  answers    jsonb not null check (jsonb_typeof(answers) = 'array'),
  score      integer not null check (score >= 0),
  total      integer not null check (total >= 1 and score <= total),
  created_at timestamptz not null default now(),
  foreign key (quiz_id, user_id)
    references public.quizzes (id, user_id) on delete cascade
);

create index quiz_attempts_quiz_idx on public.quiz_attempts (quiz_id, created_at desc);

alter table public.quiz_attempts enable row level security;

create policy quiz_attempts_select_own on public.quiz_attempts
  for select to authenticated using (user_id = (select auth.uid()));

-- A correção é calculada no banco (RPC da Etapa 3) para não confiar no cliente.
revoke all on table public.quiz_attempts from public, anon, authenticated;
grant select on table public.quiz_attempts to authenticated;
grant all on table public.quiz_attempts to service_role;

-- -----------------------------------------------------------------------------
-- Registro de consumo (minutos de áudio, tokens, chamadas e custo estimado)
-- -----------------------------------------------------------------------------
create table public.usage_records (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users (id) on delete cascade,
  lesson_id           uuid,
  job_id              uuid references public.processing_jobs (id) on delete set null,
  provider            text not null check (char_length(provider) between 1 and 50),
  operation           text not null
                      check (operation in ('transcription', 'text_generation', 'research', 'other')),
  model               text check (char_length(model) <= 100),
  audio_seconds       numeric(12, 3) check (audio_seconds >= 0),
  input_tokens        integer check (input_tokens >= 0),
  output_tokens       integer check (output_tokens >= 0),
  cached_input_tokens integer check (cached_input_tokens >= 0),
  request_count       integer not null default 1 check (request_count >= 0),
  estimated_cost_usd  numeric(12, 6) not null default 0 check (estimated_cost_usd >= 0),
  cost_is_estimate    boolean not null default true,
  pricing             jsonb not null default '{}'::jsonb,
  occurred_at         timestamptz not null default now(),
  foreign key (lesson_id, user_id)
    references public.lessons (id, user_id) on delete set null (lesson_id)
);

create index usage_records_user_time_idx on public.usage_records (user_id, occurred_at desc);

alter table public.usage_records enable row level security;

create policy usage_records_select_own on public.usage_records
  for select to authenticated using (user_id = (select auth.uid()));

revoke all on table public.usage_records from public, anon, authenticated;
grant select on table public.usage_records to authenticated;
grant all on table public.usage_records to service_role;
