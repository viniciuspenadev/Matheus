# StudyFlow AI

Assistente acadêmico pessoal que transforma aulas gravadas em materiais de estudo
organizados, com inteligência artificial e pesquisa científica rastreável.
Interface em português do Brasil, pensada para o iPhone e também para computador.

> **Estado atual: Etapa 1 (Fundação) concluída.** Já funciona: login privado,
> disciplinas e cursos, aulas, importação de transcrição (.txt ou texto colado),
> visualização, cópia, impressão e revisão da transcrição com o original preservado.
> Upload de áudio, worker, materiais gerados por IA e pesquisa científica chegam nas
> Etapas 2 a 4 (o banco de dados já está pronto para elas). Veja o [roteiro](#roteiro).

- Arquitetura, modelo de dados, custos e limitações: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)

## Sumário

1. [Tecnologias](#tecnologias)
2. [Estrutura de pastas](#estrutura-de-pastas)
3. [Pré-requisitos e instalação do Node.js](#pré-requisitos)
4. [Instalação das dependências](#instalação)
5. [Configurar o Supabase](#configurar-o-supabase) (tabelas, conta, armazenamento)
6. [Variáveis de ambiente](#variáveis-de-ambiente)
7. [Executar o site](#executar-o-site)
8. [Testar com uma transcrição TXT](#testar-com-uma-transcrição-txt)
9. [Testes automatizados](#testes-automatizados)
10. [OpenAI, APIs acadêmicas, FFmpeg e worker](#openai-apis-acadêmicas-ffmpeg-e-worker-etapas-2-a-4)
11. [Ver erros](#ver-erros)
12. [Backup](#backup-das-transcrições-e-materiais)
13. [Implantação](#implantação)
14. [Serviços gratuitos × pagos](#serviços-gratuitos--pagos)
15. [Roteiro](#roteiro)

## Tecnologias

- **Next.js 16** (App Router, Server Actions, Proxy) · **React 19** · **TypeScript** estrito
- **Tailwind CSS 4** · fonte **Inter** servida localmente · ícones **lucide-react**
- **Supabase**: Auth, PostgreSQL (RLS), Storage privado (a partir da Etapa 2)
- **Zod 4** para validação · **Vitest** e **Playwright** para testes
- Planejado: worker Node.js + **FFmpeg**; **OpenAI** (`gpt-transcribe`, `gpt-5.6-luna`, configuráveis);
  **OpenAlex**, **Crossref**, **Open Library/Google Books**

## Estrutura de pastas

```
src/app/            rotas (login e área privada em (app)/)
src/components/     interface (ui/, forms/, shell e navegação)
src/lib/            lógica pura: auth, supabase, texto, validação
src/server/         acesso a dados (somente servidor, sempre sob RLS)
supabase/           migrações SQL versionadas e config do CLI
scripts/            criação de usuário e execução de testes
tests/              unit/, db/ (PostgreSQL real) e e2e/ (Playwright)
docs/               documentação técnica
```

Detalhes em [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md#2-estrutura-de-pastas).

## Pré-requisitos

- **Node.js 22 LTS** (mínimo 20.12). Instale por <https://nodejs.org> (botão "LTS") ou,
  no macOS, `brew install node@22`; no Windows, o instalador `.msi` do site.
  Confira com `node -v` e `npm -v`.
- Uma conta gratuita no **Supabase** (<https://supabase.com>).
- Opcional para os testes de banco: **PostgreSQL 15+** instalado localmente
  (`brew install postgresql@16`, `apt install postgresql`) ou o Supabase CLI.

## Instalação

```bash
git clone <url-do-repositório> studyflow-ai
cd studyflow-ai
npm install
cp .env.example .env.local
```

## Configurar o Supabase

### 1. Criar o projeto

No painel do Supabase: **New project**, escolha uma região próxima (ex.: São Paulo) e
guarde a senha do banco.

### 2. Criar as tabelas (migrações)

Escolha **uma** das opções:

- **SQL Editor (mais simples):** abra *SQL Editor → New query*, cole e execute, **em ordem**,
  o conteúdo de cada arquivo de `supabase/migrations/`:
  1. `20261112000100_foundation.sql`
  2. `20261112000200_audio_and_jobs.sql`
  3. `20261112000300_materials_research_usage.sql`
  4. `20261112000400_import_transcription.sql`
- **Supabase CLI:** `npx supabase login`, `npx supabase link --project-ref <ref>` e
  `npx supabase db push`.

As migrações criam todas as tabelas, Row Level Security, privilégios mínimos, a fila
de tarefas e o bloqueio de cadastro para e-mails não autorizados.

### 3. Desativar o cadastro público

*Authentication → Sign In / Providers*: mantenha **Email** habilitado e **desative
"Allow new users to sign up"**. (Mesmo que fique ativado, o banco recusa contas cujo
e-mail não esteja em `allowed_emails`.)

### 4. Copiar as chaves

*Project Settings → API Keys*:

- **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
- **Publishable key** (`sb_publishable_…`) → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
  (a chave `anon` legada também funciona como `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
- **Secret key** (`sb_secret_…`, ou `service_role` legada) → `SUPABASE_SECRET_KEY`
  — **somente** no `.env.local` local e no worker. Nunca no navegador.

### 5. Criar a sua conta

Coloque seu e-mail em `ALLOWED_EMAILS` no `.env.local` e rode:

```bash
npm run setup:user -- --email voce@exemplo.com
```

O script autoriza o e-mail no banco e cria o usuário já confirmado; a senha é digitada
sem aparecer na tela. Alternativa manual: insira o e-mail em `public.allowed_emails`
pelo SQL Editor e crie o usuário em *Authentication → Users → Add user*.
Para trocar a senha depois, use *Authentication → Users*.

### 6. Armazenamento

A Etapa 1 não usa o Storage. Na Etapa 2 uma migração criará o bucket **privado**
`lesson-audio` com políticas por usuário; nada precisará ser configurado à mão.

## Variáveis de ambiente

Todas estão documentadas em [`.env.example`](.env.example). Para a Etapa 1 bastam:

| Variável | Descrição |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | chave publicável |
| `ALLOWED_EMAILS` | e-mails autorizados (vírgula). **Vazio = ninguém entra** |
| `SUPABASE_SECRET_KEY` | apenas para `npm run setup:user` (e o worker futuro) |
| `APP_TIMEZONE` | fuso para exibir datas (padrão `America/Sao_Paulo`) |

## Executar o site

```bash
npm run dev        # desenvolvimento: http://localhost:3000
npm run build      # build de produção
npm run start      # servidor de produção (após o build)
```

Para abrir no iPhone durante o desenvolvimento, conecte-o à mesma rede e acesse
`http://<ip-do-computador>:3000` (para uso diário, prefira a versão implantada com HTTPS).

## Testar com uma transcrição TXT

1. Entre com sua conta.
2. **Disciplinas → Nova disciplina** (ex.: "Bioquímica I", vocabulário: `enzimas, glicólise`).
3. **Importar** → escolha a disciplina, informe o título, selecione um `.txt`
   (UTF-8, UTF-16 ou Windows-1252, até 4 MB) ou cole o texto → **Importar transcrição**.
4. Na página da aula: leia, **Copiar**, **Imprimir** (gera PDF pelo navegador) e **Editar**.
   A versão revisada é salva separadamente; a original continua disponível
   (aba **Original**) e pode ser restaurada.

Também é possível criar a aula antes (**Aulas → Nova aula**) e importar o texto na página dela.

## Testes automatizados

| Comando | O que testa | Requisitos |
| --- | --- | --- |
| `npm test` | Unidade: allowlist, login, proxy de rotas, validação, decodificação de TXT | nenhum |
| `npm run test:db` | PostgreSQL real: migrações, RLS e isolamento entre contas, privilégios por coluna, gatilhos, importação, fila de tarefas, tipos gerados | PostgreSQL 15+ local **ou** `TEST_DATABASE_URL` |
| `npm run test:e2e` | Navegador (Chromium, desktop e emulação de iPhone 13 Pro Max) contra um **Supabase simulado** em memória | Playwright + Chromium (`npx playwright install chromium`) |
| `npm run lint` · `npm run typecheck` | Qualidade estática | nenhum |
| `npm run test:all` | lint + tipos + unidade + banco | PostgreSQL |

- `npm run test:db` sobe um cluster PostgreSQL temporário em `.cache/` (removido ao final)
  se encontrar `initdb`/`pg_ctl`; ou use `TEST_DATABASE_URL=postgres://postgres:postgres@127.0.0.1:54322/postgres`
  (banco do `supabase start`). Cada arquivo cria e apaga seu próprio banco.
  **Nunca** aponte para o banco de produção.
- O Supabase simulado (`tests/e2e/mock-supabase.mjs`) exercita a interface, as Server Actions
  e a sessão; ele **não** substitui as regras do banco, que são verificadas em `test:db`.
- Após mudar migrações, regenere os tipos: `npm run db:types`.

## OpenAI, APIs acadêmicas, FFmpeg e worker (Etapas 2 a 4)

Ainda **não implementados**; o preparo pode ser feito com antecedência.

- **Chave da OpenAI:** <https://platform.openai.com> → *API keys* → *Create new secret key*.
  Defina limites de gasto em *Billing → Limits*. A chave irá apenas no worker
  (`OPENAI_API_KEY`). Modelos configuráveis: `OPENAI_TRANSCRIPTION_MODEL=gpt-transcribe`,
  `OPENAI_TEXT_MODEL=gpt-5.6-luna` (com `OPENAI_TEXT_MODEL_FALLBACK` caso não esteja disponível na conta).
- **APIs acadêmicas:** OpenAlex e Crossref não exigem chave; informe um e-mail de contato em
  `ACADEMIC_CONTACT_EMAIL`. Google Books aceita chave opcional (`GOOGLE_BOOKS_API_KEY`).
- **FFmpeg:** macOS `brew install ffmpeg`; Ubuntu/Debian `sudo apt install ffmpeg`;
  Windows `winget install Gyan.FFmpeg`. Confira com `ffmpeg -version`.
- **Worker local × hospedado:** rodando no computador pessoal, o processamento só acontece com
  ele ligado e conectado (gratuito). Para processar com o computador desligado, o worker deve
  rodar num serviço sempre ativo (VM/contêiner pequeno, ≈ US$ 5/mês). Instruções completas
  virão com a Etapa 2.
- **Teste com áudio real (M4A do iPhone):** disponível a partir da Etapa 2.

## Ver erros

- **Na interface:** formulários mostram mensagens em português; páginas exibem estados de erro
  com botão "Tentar novamente" e um código (digest) para localizar o erro nos logs.
- **Servidor local:** o terminal de `npm run dev`/`npm run start` mostra os logs (`[db]`, `[auth]`,
  `[action]`). Conteúdo de transcrições nunca é registrado.
- **Vercel:** *Project → Logs*. **Supabase:** *Logs → API / Postgres / Auth*.

## Backup das transcrições e materiais

- **Planos pagos do Supabase** fazem backups diários automáticos.
- **Manual (qualquer plano):** *Project Settings → Database → Connection string* e então
  ```bash
  pg_dump "postgresql://postgres:<senha>@db.<ref>.supabase.co:5432/postgres" \
    --schema=public --data-only --format=custom -f studyflow-backup.dump
  ```
  Restauração: `pg_restore --data-only -d "<connection-string>" studyflow-backup.dump`
  (após aplicar as migrações num projeto novo).
- **Pontual:** *Table Editor → transcriptions → Export to CSV*.

## Implantação

**Site (Vercel, recomendado):**

1. Envie o repositório ao GitHub e importe-o em <https://vercel.com/new>.
2. Em *Settings → Environment Variables*, cadastre `NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `ALLOWED_EMAILS` e `APP_TIMEZONE`.
   **Não** cadastre a chave secreta no site.
3. Deploy. No Supabase, em *Authentication → URL Configuration*, defina o *Site URL* com o
   domínio da Vercel.
4. No iPhone, abra o site no Safari e use *Compartilhar → Adicionar à Tela de Início*.

Qualquer host com Node.js 20.12+ também serve (`npm run build && npm run start`).
O **worker** terá instruções próprias de implantação na Etapa 2.

## Serviços gratuitos × pagos

| Serviço | Gratuito | Pode gerar cobrança | Limites a observar |
| --- | --- | --- | --- |
| Supabase | Plano Free | Pro (US$ 25/mês) se exceder | 500 MB de banco, 1 GB de storage, objetos ≤ 50 MB, **pausa após ~7 dias sem uso** |
| Vercel | Hobby (uso pessoal) | Pro se exceder | 4,5 MB por requisição; tempo de execução das funções |
| OpenAI | — | Sim, por uso (Etapas 2–3) | Arquivos de áudio ≤ 25 MB por chamada; defina limite de gasto |
| OpenAlex / Crossref / Open Library | Sim | Não | Limites de taxa |
| Google Books | Sim (cota diária) | Não | Cota por chave |
| Host do worker | Computador pessoal | VM/contêiner (≈ US$ 5/mês) | Precisa estar sempre ligado |

Estimativas de custo por aula em [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md#7-custos-estimados-e-limitações).

## Roteiro

- [x] **Etapa 1 — Fundação:** autenticação fechada, banco completo com RLS, dashboard,
  disciplinas/cursos, aulas, importação de TXT/texto, visualização e revisão da transcrição.
- [ ] **Etapa 2 — Áudio:** upload TUS em partes, worker, FFmpeg, transcrição, status, exclusão segura, Configurações.
- [ ] **Etapa 3 — Materiais:** apostila, resumo, glossário, mapa mental, simulado, impressão.
- [ ] **Etapa 4 — Pesquisa científica:** OpenAlex, Crossref, livros, Biblioteca Acadêmica.
- [ ] **Etapa 5 — Estabilização:** testes com credenciais reais, áudio longo, Safari no iPhone, custos.
