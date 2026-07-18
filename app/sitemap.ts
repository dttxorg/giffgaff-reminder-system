import type { MetadataRoute } from "next";
import { DEFAULT_PUBLIC_BASE_URL } from "@/lib/public-base-url";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    "",
    "/help",
    "/help/bark",
    "/help/pushplus",
    "/help/serverchan",
    "/help/telegram",
  ];
  return routes.map((path) => ({
    url: `${DEFAULT_PUBLIC_BASE_URL}${path}`,
    changeFrequency: path === "" ? "weekly" : "monthly",
    priority: path === "" ? 1 : path === "/help" ? 0.7 : 0.5,
  }));
}
