import { redirect } from "next/navigation";
import { dayOffsetFromBaseline } from "@/lib/bucket";
import { findSimByParam, ensureSimPortToken } from "@/lib/port-token-db";
import { getCachedPublicSim } from "@/lib/public-sim-cache";
import PortClient, { type SimInfo } from "./port-client";

// token 页面按路径进入 Full Route Cache；SIM 数据 tag 失效时同步刷新完整页面。
export const dynamic = "force-static";
export const dynamicParams = true;
export const revalidate = 86_400;

export function generateStaticParams() {
  return [];
}

interface PageProps {
  params: Promise<{ simId: string }>;
}

function isValidParam(value: string): boolean {
  return /^\d+$/.test(value) || /^[A-Za-z0-9_-]{16,64}$/.test(value);
}

export default async function PortPage({ params }: PageProps) {
  const { simId } = await params;
  if (!isValidParam(simId)) {
    return <PortClient simIdRaw={simId} initialSim={null} />;
  }

  const isLegacyNumericUrl = /^\d+$/.test(simId);
  const sim = isLegacyNumericUrl
    ? await findSimByParam(simId)
    : await getCachedPublicSim(simId);

  if (!sim) {
    return <PortClient simIdRaw={simId} initialSim={null} />;
  }

  if (isLegacyNumericUrl) {
    const portToken =
      sim.portToken ??
      (await ensureSimPortToken(sim.id, sim.portToken).catch(() => null));
    if (portToken) redirect(`/p/${portToken}`);
  }

  const baseline = sim.lastPortedAt ?? sim.activatedAt;
  const initialSim: SimInfo = {
    phoneNumber: sim.phoneNumber,
    activatedAt: sim.activatedAt.toISOString().slice(0, 10),
    lastPortedAt: sim.lastPortedAt?.toISOString().slice(0, 10) ?? null,
    dayOffset: dayOffsetFromBaseline(baseline),
    portToken: sim.portToken,
  };

  return <PortClient simIdRaw={simId} initialSim={initialSim} />;
}
