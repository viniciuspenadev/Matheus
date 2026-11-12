import Link from "next/link";

export default function RootNotFound() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <div className="text-center">
        <p className="text-sm font-semibold text-royal-600">404</p>
        <h1 className="mt-1 text-xl font-semibold text-navy-900">Página não encontrada</h1>
        <Link href="/" className="mt-4 inline-block text-sm font-medium text-royal-700 hover:underline">
          Voltar ao início
        </Link>
      </div>
    </main>
  );
}
