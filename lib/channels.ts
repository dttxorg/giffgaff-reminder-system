// 推送渠道：Sever酱 / Bark / pushplus

export type ChannelType = "serverchan" | "bark" | "pushplus";

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
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        title,
        content: body,
        template: "markdown",
        channel: "wechat",
      }),
    });
    if (!resp.ok) {
      return { ok: false, errorMessage: `pushplus HTTP ${resp.status}` };
    }
    const data = (await resp.json()) as {
      code?: number;
      msg?: string;
      data?: string | null;
    };
    if (data.code !== 200) {
      return { ok: false, errorMessage: data.msg || `pushplus 返回 code=${data.code}` };
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
  if (channel === "pushplus") return sendPushPlus(channelKey, title, body);
  return { ok: false, errorMessage: `未知渠道: ${channel}` };
}
