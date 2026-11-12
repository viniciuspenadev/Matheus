import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/auth/session";

export default async function PrivateLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return <AppShell email={user.email}>{children}</AppShell>;
}
