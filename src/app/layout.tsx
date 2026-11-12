import "@fontsource-variable/inter";
import "./globals.css";

import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: {
    default: "StudyFlow AI",
    template: "%s · StudyFlow AI",
  },
  description: "Assistente acadêmico pessoal: transforme aulas gravadas em materiais de estudo.",
  applicationName: "StudyFlow AI",
  robots: { index: false, follow: false },
  appleWebApp: { capable: true, title: "StudyFlow", statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0b1f3a",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className="h-full">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
