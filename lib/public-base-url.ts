export function getPublicBaseUrl(): string | null {
  const configured = process.env.PUBLIC_BASE_URL?.trim();
  if (configured) {
    try {
      const url = new URL(configured);
      if (url.protocol !== "https:" || url.username || url.password) return null;
      return url.origin;
    } catch {
      return null;
    }
  }

  const vercelHost = process.env.VERCEL_URL?.trim().toLowerCase();
  if (vercelHost && /^[a-z0-9.-]+$/.test(vercelHost)) {
    return `https://${vercelHost}`;
  }
  return process.env.NODE_ENV === "production" ? null : "http://localhost:3000";
}
