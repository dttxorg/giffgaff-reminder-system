import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/help/"],
      disallow: [
        "/api/",
        "/p/",
        "/me",
        "/admin",
        "/login",
        "/redeem",
      ],
    },
    sitemap: "https://baohao.681218.xyz/sitemap.xml",
    host: "https://baohao.681218.xyz",
  };
}
