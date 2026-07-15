import { unstable_cache, revalidateTag } from "next/cache";
import { findSimByParam } from "./port-token-db";

function publicSimTag(param: string | number): string {
  return `public-sim:${param}`;
}

/** 安全 token 的公开 SIM 数据缓存；旧数字 URL 迁移流程不使用它。 */
export function getCachedPublicSim(param: string) {
  return unstable_cache(
    () => findSimByParam(param),
    ["public-sim", param],
    { revalidate: 300, tags: [publicSimTag(param)] }
  )();
}

/** 数据写入后立即过期 id/token 两种可能的缓存键。 */
export function invalidatePublicSimCache(sim: {
  id: number;
  portToken: string | null;
}) {
  revalidateTag(publicSimTag(sim.id), { expire: 0 });
  if (sim.portToken) {
    revalidateTag(publicSimTag(sim.portToken), { expire: 0 });
  }
}
