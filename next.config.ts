import type { NextConfig } from "next";

/**
 * Configuração do Next.js para o StudyFlow AI.
 *
 * - `cacheComponents` fica desativado: todo o conteúdo é privado e por usuário,
 *   então não há shell estático a pré-renderizar. O modelo dinâmico clássico é
 *   mais simples e evita leituras de sessão fora de <Suspense>.
 * - O limite das Server Actions é elevado para comportar transcrições longas
 *   (uma aula de 4 h gera ~250 mil caracteres ≈ 270 KB). O app aceita até 4 MB
 *   de texto; 4,5 MB inclui o overhead do multipart e respeita o teto de 4,5 MB
 *   por requisição das funções da Vercel.
 */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
];

const nextConfig: NextConfig = {
  // Permite builds isolados (ex.: testes E2E usam .next-e2e com variáveis próprias).
  distDir: process.env.NEXT_DIST_DIR || ".next",
  poweredByHeader: false,
  experimental: {
    serverActions: {
      bodySizeLimit: "4.5mb",
    },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
