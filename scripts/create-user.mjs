#!/usr/bin/env node
/**
 * Cria (ou autoriza) a conta pessoal do StudyFlow AI.
 *
 *   npm run setup:user -- --email voce@exemplo.com
 *
 * 1. Adiciona o e-mail à tabela public.allowed_emails (lista do banco).
 * 2. Cria o usuário no Supabase Auth com e-mail já confirmado.
 * A senha é digitada no terminal (não aparece na tela nem no histórico).
 *
 * Requer NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SECRET_KEY (ou
 * SUPABASE_SERVICE_ROLE_KEY) no .env.local. Lembre-se de incluir o mesmo e-mail
 * em ALLOWED_EMAILS.
 */
import { createClient } from "@supabase/supabase-js";
import { stdin, stdout } from "node:process";
import { createInterface } from "node:readline";

try {
  process.loadEnvFile(".env.local");
} catch {
  // Sem .env.local: usa as variáveis já definidas no ambiente.
}

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function askHidden(question) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: stdin, output: stdout, terminal: true });
    rl._writeToOutput = (s) => {
      if (s.includes(question)) stdout.write(s);
    };
    rl.question(question, (answer) => {
      rl.close();
      stdout.write("\n");
      resolve(answer);
    });
  });
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !secret) {
    console.error("Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SECRET_KEY no .env.local.");
    process.exit(1);
  }

  const email = (arg("email") ?? "").trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    console.error("Uso: npm run setup:user -- --email voce@exemplo.com");
    process.exit(1);
  }

  const password = process.env.SETUP_PASSWORD ?? (await askHidden("Senha (mín. 10 caracteres): "));
  if (password.length < 10) {
    console.error("A senha precisa ter pelo menos 10 caracteres.");
    process.exit(1);
  }

  const admin = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });

  const { error: allowError } = await admin.from("allowed_emails").upsert({ email, note: "conta pessoal" });
  if (allowError) {
    console.error("Não foi possível autorizar o e-mail. As migrações foram aplicadas?", allowError.message);
    process.exit(1);
  }
  console.log(`✓ E-mail autorizado no banco: ${email}`);

  const { error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) {
    if (/already|registered|exists/i.test(error.message)) {
      console.log("• O usuário já existe no Supabase Auth. Para trocar a senha, use o painel (Authentication → Users).");
    } else {
      console.error("Falha ao criar o usuário:", error.message);
      process.exit(1);
    }
  } else {
    console.log("✓ Usuário criado e confirmado.");
  }

  const allowed = (process.env.ALLOWED_EMAILS ?? "").toLowerCase();
  if (!allowed.split(/[,;\s]+/).includes(email)) {
    console.warn(`! Adicione ${email} à variável ALLOWED_EMAILS do servidor web, senão o login será recusado.`);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
