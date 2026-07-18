// 推送渠道：Sever酱 / Bark / pushplus / Telegram

import { isIP } from "node:net";

export type ChannelType = "serverchan" | "bark" | "pushplus" | "telegram";

export interface SendResult {
  ok: boolean;
  errorMessage?: string;
}

const PUSH_TIMEOUT_MS = 10_000;
const MAX_PUSH_RESPONSE_BYTES = 64 * 1024;

class PushResponseTooLargeError extends Error {}

async function readJsonResponse<T>(response: Response): Promise<T> {
  const declaredLength = Number(response.headers.get("content-length"));
  if (
    Number.isFinite(declaredLength) &&
    declaredLength > MAX_PUSH_RESPONSE_BYTES
  ) {
    throw new PushResponseTooLargeError();
  }

  if (!response.body) {
    throw new SyntaxError("empty response body");
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    if (received > MAX_PUSH_RESPONSE_BYTES) {
      await reader.cancel().catch(() => {});
      throw new PushResponseTooLargeError();
    }
    chunks.push(value);
  }

  const body = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return JSON.parse(new TextDecoder().decode(body)) as T;
}

function pushRequestFailure(error: unknown): SendResult {
  if (error instanceof PushResponseTooLargeError) {
    return { ok: false, errorMessage: "推送响应过大" };
  }
  if (error instanceof SyntaxError) {
    return { ok: false, errorMessage: "推送响应格式错误" };
  }
  if (
    error instanceof Error &&
    (error.name === "AbortError" || error.name === "TimeoutError")
  ) {
    return { ok: false, errorMessage: "推送请求超时" };
  }
  // fetch 的底层异常可能包含完整 URL（其中带有推送密钥），不得回传或写入日志。
  return { ok: false, errorMessage: "推送请求失败" };
}

function outboundRequestInit(init: RequestInit): RequestInit {
  return {
    ...init,
    redirect: "error",
    signal: AbortSignal.timeout(PUSH_TIMEOUT_MS),
  };
}

function isPublicHostnameSyntax(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (!host || host.length > 253 || isIP(host) !== 0) return false;
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    [".local", ".internal", ".lan", ".home", ".test", ".invalid"].some(
      (suffix) => host.endsWith(suffix)
    )
  ) {
    return false;
  }
  const labels = host.split(".");
  return (
    labels.length >= 2 &&
    labels.every(
      (label) =>
        label.length >= 1 &&
        label.length <= 63 &&
        /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label)
    )
  );
}

function allowedBarkHosts(): Set<string> {
  const configured = (process.env.BARK_ALLOWED_HOSTS ?? "")
    .split(",")
    .map((host) => host.trim().toLowerCase())
    .filter(isPublicHostnameSyntax);
  return new Set(["api.day.app", ...configured]);
}

/** 只接受 HTTPS、无认证信息、无自定义端口且主机在显式白名单内的 Bark 地址。 */
export function normalizeBarkEndpoint(input: string): string | null {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;
  if (url.username || url.password || url.port) return null;
  if (url.search || url.hash) return null;
  const hostname = url.hostname.toLowerCase();
  if (!isPublicHostnameSyntax(hostname)) return null;
  if (!allowedBarkHosts().has(hostname)) return null;
  if (url.pathname === "/" || url.pathname === "") return null;
  return `${url.origin}${url.pathname.replace(/\/+$/, "")}`;
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
    const resp = await fetch(url, outboundRequestInit({
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ title, desp: body }).toString(),
    }));
    if (!resp.ok) {
      return { ok: false, errorMessage: `Sever酱 HTTP ${resp.status}` };
    }
    const data = await readJsonResponse<{ code?: number; message?: string; errno?: number }>(resp);
    if (data.code !== 0 && data.errno !== 0) {
      return { ok: false, errorMessage: data.message || "Sever酱 返回非 0" };
    }
    return { ok: true };
  } catch (error) {
    return pushRequestFailure(error);
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
  const base = normalizeBarkEndpoint(barkUrl);
  if (!base) {
    return { ok: false, errorMessage: "Bark 地址必须是已允许的 HTTPS 地址" };
  }
  // Bark 的 URL 路径是 /{title}/{body}
  // title 和 body 需要 URL encode
  const url = `${base}/${encodeURIComponent(title)}/${encodeURIComponent(body)}`;
  try {
    const resp = await fetch(url, outboundRequestInit({ method: "GET" }));
    if (!resp.ok) {
      return { ok: false, errorMessage: `Bark HTTP ${resp.status}` };
    }
    const data = await readJsonResponse<{ code?: number; message?: string }>(resp);
    if (data.code !== 200) {
      return { ok: false, errorMessage: data.message || "Bark 返回非 200" };
    }
    return { ok: true };
  } catch (error) {
    return pushRequestFailure(error);
  }
}

/**
 * pushplus 推送
 * 官方文档: https://www.pushplus.plus/doc/guide/api.html
 * API: POST http://www.pushplus.plus/send
 *   Body (JSON): { token, title, content, template: "markdown" }
 *   - token: 用户 token (必填)
 *   - title: 消息标题 (选填)
 *   - content: 消息内容 (必填)
 *   - template: 默认 html;我们用 markdown 支持多行
 *   - channel: 默认 wechat (微信公众号),可省略
 * 返回:
 *   成功: { code: 200, msg: "请求成功", data: "短码" }  (200 仅代表收到请求,异步发送)
 *   失败: { code: 非200, msg: "错误信息" }
 */
export async function sendPushPlus(
  channelKey: string,
  title: string,
  body: string
): Promise<SendResult> {
  const token = channelKey.trim();
  if (!token) {
    return { ok: false, errorMessage: "token 不能为空" };
  }
  const url = "https://www.pushplus.plus/send";
  try {
    const resp = await fetch(url, outboundRequestInit({
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        title,
        content: body,
        template: "markdown",
        channel: "wechat",
      }),
    }));
    if (!resp.ok) {
      return { ok: false, errorMessage: `pushplus HTTP ${resp.status}` };
    }
    const data = await readJsonResponse<{
      code?: number;
      msg?: string;
      data?: string | null;
    }>(resp);
    if (data.code !== 200) {
      return { ok: false, errorMessage: data.msg || `pushplus 返回 code=${data.code}` };
    }
    return { ok: true };
  } catch (error) {
    return pushRequestFailure(error);
  }
}

/**
 * Telegram Bot 推送
 *
 * channelKey 格式: "<botToken>|<chatId>"
 *   - botToken: 用户在 @BotFather 创建 bot 时拿到的 token，形如 123456:ABC-DEF...
 *   - chatId: 用户在 Telegram 里的数字 ID（私聊 bot 后用 @userinfobot 或 getUpdates 拿到）
 *
 * API: POST https://api.telegram.org/bot<token>/sendMessage
 *   Body (JSON): { chat_id, text, parse_mode: "HTML" | "Markdown" }
 *   - 限流：每秒 30 条到不同 chat，每秒 1 条到同一 chat（本系统一天最多推 20 条/号，绰绰有余）
 *   - 返回: { ok: true, result: {...} } 或 { ok: false, description, error_code }
 */
export async function sendTelegram(
  channelKey: string,
  title: string,
  body: string
): Promise<SendResult> {
  const parts = channelKey.split("|");
  if (parts.length !== 2) {
    return { ok: false, errorMessage: "channelKey 格式错误，应为 botToken|chatId" };
  }
  const [botToken, chatIdRaw] = parts;
  const token = botToken.trim();
  const chatId = chatIdRaw.trim();
  if (!token || !chatId) {
    return { ok: false, errorMessage: "botToken 和 chatId 不能为空" };
  }
  // chatId 必须是数字（私聊）/ 数字字符串（群组以 - 开头）
  if (!/^-?\d+$/.test(chatId)) {
    return { ok: false, errorMessage: "chatId 应为纯数字（含负号表示群组）" };
  }

  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  // HTML 模式：title 走 <b>，body 走换行；安全地 escape HTML
  const escapeHtml = (s: string) =>
    s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  const text = `<b>${escapeHtml(title)}</b>\n\n${escapeHtml(body)}`;

  try {
    const resp = await fetch(url, outboundRequestInit({
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    }));
    if (!resp.ok) {
      return { ok: false, errorMessage: `Telegram HTTP ${resp.status}` };
    }
    const data = (await resp.json()) as { ok?: boolean; description?: string; error_code?: number };
    if (!data.ok) {
      return { ok: false, errorMessage: data.description || `Telegram 返回 error_code=${data.error_code}` };
    }
    return { ok: true };
  } catch (error) {
    return pushRequestFailure(error);
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
  if (channel === "pushplus") return sendPushPlus(channelKey, title, body);
  if (channel === "telegram") return sendTelegram(channelKey, title, body);
  return { ok: false, errorMessage: `未知渠道: ${channel}` };
}
