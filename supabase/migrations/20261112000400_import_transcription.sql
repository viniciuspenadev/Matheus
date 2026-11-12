-- =============================================================================
-- StudyFlow AI — 0004 Importação de transcrição pronta (TXT ou texto colado)
--
-- Operação atômica: cria a aula (se necessário), grava a transcrição original e
-- atualiza o status da aula, tudo na mesma transação. Executa com os privilégios
-- do dono da função, mas valida explicitamente que a aula/disciplina pertence ao
-- usuário autenticado (auth.uid()).
-- =============================================================================
create or replace function public.import_transcription(
  p_text            text,
  p_source          text,
  p_lesson_id       uuid default null,
  p_subject_id      uuid default null,
  p_title           text default null,
  p_lesson_date     date default null,
  p_source_filename text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid    uuid := auth.uid();
  v_lesson public.lessons;
  v_text   text;
  v_words  integer;
begin
  if v_uid is null then
    raise exception 'Não autenticado.' using errcode = '28000';
  end if;

  if p_source is null or p_source not in ('text_file', 'text_paste') then
    raise exception 'Origem da transcrição inválida.' using errcode = '22023';
  end if;

  v_text := btrim(coalesce(p_text, ''), E' \t\r\n');
  if char_length(v_text) = 0 then
    raise exception 'A transcrição está vazia.' using errcode = '22023';
  end if;
  if char_length(v_text) > 3000000 then
    raise exception 'A transcrição excede o limite de 3.000.000 de caracteres.' using errcode = '22001';
  end if;

  if p_lesson_id is not null then
    select * into v_lesson
    from public.lessons l
    where l.id = p_lesson_id and l.user_id = v_uid
    for update;

    if v_lesson.id is null then
      raise exception 'Aula não encontrada.' using errcode = 'P0002';
    end if;

    if exists (select 1 from public.transcriptions t where t.lesson_id = v_lesson.id) then
      raise exception 'Esta aula já possui uma transcrição.' using errcode = '23505';
    end if;

    if v_lesson.status <> 'draft' then
      raise exception 'A aula não está disponível para importação (status atual: %).', v_lesson.status
        using errcode = '55000';
    end if;
  else
    if p_subject_id is null or p_title is null or btrim(p_title) = '' then
      raise exception 'Informe a disciplina e o título da aula.' using errcode = '22023';
    end if;

    if not exists (
      select 1 from public.subjects s where s.id = p_subject_id and s.user_id = v_uid
    ) then
      raise exception 'Disciplina não encontrada.' using errcode = 'P0002';
    end if;

    insert into public.lessons (user_id, subject_id, title, lesson_date)
    values (v_uid, p_subject_id, btrim(p_title), p_lesson_date)
    returning * into v_lesson;
  end if;

  v_words := coalesce(array_length(regexp_split_to_array(v_text, '\s+'), 1), 0);

  insert into public.transcriptions (
    user_id, lesson_id, source, original_text, source_filename,
    word_count, char_count, content_sha256, integrity_status
  )
  values (
    v_uid, v_lesson.id, p_source, v_text, nullif(left(btrim(p_source_filename), 255), ''),
    v_words, char_length(v_text), encode(sha256(convert_to(v_text, 'UTF8')), 'hex'), 'not_applicable'
  );

  update public.lessons
     set source_type    = 'text',
         status         = 'transcribed',
         status_message = 'Transcrição importada.',
         last_error     = null
   where id = v_lesson.id;

  return v_lesson.id;
end;
$$;

revoke all on function public.import_transcription(text, text, uuid, uuid, text, date, text) from public, anon;
grant execute on function public.import_transcription(text, text, uuid, uuid, text, date, text) to authenticated;
