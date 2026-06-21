// 推送渠道：Sever酱 和 Bark

export type ChannelType = "serverchan" | "bark";

export interface SendResult {
  ok: boolean;
  errorMessage?: string;
}

/**
 * Sever酱 推送
 * API: https://sctapi.ftqq.com/{SendKey}.send
 * Body: { title, desp }
 */
export async function sendServerChan(
  sendKey: string,
  title: string,
  body: string
): Promise<SendResult> {
  const url = `https://sctapi.ftqq.com/${sendKey}.send`;
  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ title, desp: body }).toString(),
    });
    if (!resp.ok) {
      return { ok: false, errorMessage: `Sever酱 HTTP ${resp.status}` };
    }
    const data = (await resp.json()) as { code?: number; message?: string; errno?: number };
    if (data.code !== 0 && data.errno !== 0) {
      return { ok: false, errorMessage: data.message || "Sever酱 返回非 0" };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, errorMessage: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * Bark 推送
 * URL: {BarkURL}/{title}/{body}?icon=...
 * 也可以 POST 到 Bark URL
 */
export async function sendBark(
  barkUrl: string,
  title: string,
  body: string
): Promise<SendResult> {
  // barkUrl 形如 https://api.day.app/abc123xyz
  // 去掉尾部 /
  const base = barkUrl.replace(/\/+$/, "");
  // Bark 的 URL 路径是 /{title}/{body}
  // title 和 body 需要 URL encode
  const url = `${base}/${encodeURIComponent(title)}/${encodeURIComponent(body)}`;
  try {
    const resp = await fetch(url, { method: "GET" });
    if (!resp.ok) {
      return { ok: false, errorMessage: `Bark HTTP ${resp.status}` };
    }
    const data = (await resp.json()) as { code?: number; message?: string };
    if (data.code !== 200) {
      return { ok: false, errorMessage: data.message || "Bark 返回非 200" };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, errorMessage: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * 路由：按 channel 类型选择推送器
 */
export async function sendPush(
  channel: ChannelType,
  channelKey: string,
  title: string,
  body: string
): Promise<SendResult> {
  if (channel === "serverchan") return sendServerChan(channelKey, title, body);
  if (channel === "bark") return sendBark(channelKey, title, body);
  return { ok: false, errorMessage: `未知渠道: ${channel}` };
}
