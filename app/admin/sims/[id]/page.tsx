import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin-guard";
import { getAdminSimDetail } from "@/lib/admin-sim-detail";
import { EditSimClient } from "./edit-sim-client";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditSimPage({ params }: PageProps) {
  await requireAdmin();
  const { id } = await params;
  const simId = Number(id);
  if (!Number.isInteger(simId) || simId <= 0) notFound();

  const sim = await getAdminSimDetail(simId);
  if (!sim) notFound();

  return <EditSimClient initialSim={sim} />;
}
