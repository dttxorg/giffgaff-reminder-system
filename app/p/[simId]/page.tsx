import PortClient from "./port-client";

// 页面外壳不读取服务端 params 或数据库；未知 token 路径首次访问后可进入 Full Route Cache。
export const dynamic = "force-static";
export const dynamicParams = true;
export const revalidate = 86_400;

export function generateStaticParams() {
  return [];
}

export default function PortPage() {
  return <PortClient />;
}
