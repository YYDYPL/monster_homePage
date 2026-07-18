import { AdminShell } from "@/components/admin-shell";
import { requireAdmin } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return <AdminShell>{children}</AdminShell>;
}