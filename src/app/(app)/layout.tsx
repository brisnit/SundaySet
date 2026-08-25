import { AppShell } from "@/components/app/shell";
import { requireChurchContext } from "@/lib/auth/session";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const ctx = await requireChurchContext();
  return <AppShell ctx={ctx}>{children}</AppShell>;
}
