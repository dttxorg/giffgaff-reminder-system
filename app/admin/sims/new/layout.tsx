import { requireAdmin } from "@/lib/admin-guard";

export default async function NewSimLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();
  return children;
}
