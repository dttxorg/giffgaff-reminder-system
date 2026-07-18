import { dayOffsetFromBaseline } from "@/lib/bucket";
import { looksLikeToken } from "@/lib/port-token";
import { getCachedPublicSim } from "@/lib/public-sim-cache";
import PortClient, { type SimInfo } from "./port-client";
import { maskPhoneForPublic } from "@/lib/phone";

// Bearer token 页面包含号码和日期，不进入共享 Full Route Cache。
export const dynamic = "force-dynamic";
export const revalidate = 0;

interface PageProps {
  params: Promise<{ simId: string }>;
}

export default async function PortPage({ params }: PageProps) {
  const { simId } = await params;
  if (!looksLikeToken(simId)) {
    return <PortClient simIdRaw={simId} initialSim={null} />;
  }

  const sim = await getCachedPublicSim(simId);

  if (!sim) {
    return <PortClient simIdRaw={simId} initialSim={null} />;
  }

  const baseline = sim.lastPortedAt ?? sim.activatedAt;
  const initialSim: SimInfo = {
    phoneNumber: maskPhoneForPublic(sim.phoneNumber),
    activatedAt: sim.activatedAt.toISOString().slice(0, 10),
    lastPortedAt: sim.lastPortedAt?.toISOString().slice(0, 10) ?? null,
    dayOffset: dayOffsetFromBaseline(baseline),
  };

  return <PortClient simIdRaw={simId} initialSim={initialSim} />;
}
