import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  sendServerChan,
  sendBark,
  sendPushPlus,
  sendTelegram,
  sendPush,
} from "../lib/channels";

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  };
}

// 每个测试 fresh mock(避免跨测试 state 泄漏)
let mockFetch: ReturnType<typeof vi.fn>;

beforeEach(() => {
  mockFetch = vi.fn();
  globalThis.fetch = mockFetch as unknown as typeof fetch;
});

afterEach(() => {
  // 还原 fetch(避免污染其他测试)
  // 不需要还原:下一轮 beforeEach 会重新设置
});

describe("sendServerChan", () => {
  it("成功(code=0)→ ok:true", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ code: 0 }));
    const r = await sendServerChan("SCT123", "title", "body");
    expect(r.ok).toBe(true);
    // URL 拼接正确
    expect(mockFetch).toHaveBeenCalledWith(
      "https://sctapi.ftqq.com/SCT123.send",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("HTTP 500 → ok:false + 状态码", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({}, 500));
    const r = await sendServerChan("SCT123", "t", "b");
    expect(r.ok).toBe(false);
    expect(r.errorMessage).toContain("500");
  });

  it("code != 0 → ok:false + message", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ code: 400, message: "SendKey 无效" })
    );
    const r = await sendServerChan("bad", "t", "b");
    expect(r.ok).toBe(false);
    expect(r.errorMessage).toBe("SendKey 无效");
  });

  it("fetch throw → ok:false + e.message", async () => {
    mockFetch.mockRejectedValueOnce(new Error("network down"));
    const r = await sendServerChan("SCT", "t", "b");
    expect(r.ok).toBe(false);
    expect(r.errorMessage).toBe("network down");
  });

  it("title/body 通过 URLSearchParams 传(form 格式)", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ code: 0 }));
    await sendServerChan("SCT", "标题", "正文");
    const call = mockFetch.mock.calls[0];
    const body = call[1].body as string;
    // URLSearchParams 编码
    expect(body).toContain("title=");
    expect(body).toContain("desp=");
  });
});

describe("sendBark", () => {
  it("成功(code=200)→ ok:true", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ code: 200 }));
    const r = await sendBark("https://api.day.app/key", "title", "body");
    expect(r.ok).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.day.app/key/title/body",
      expect.objectContaining({ method: "GET" })
    );
  });

  it("Bark URL 尾部斜杠去掉", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ code: 200 }));
    await sendBark("https://api.day.app/key/", "t", "b");
    const url = mockFetch.mock.calls[0][0];
    expect(url).toBe("https://api.day.app/key/t/b");
  });

  it("title/body 含中文/特殊字符 → URL encode", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ code: 200 }));
    await sendBark("https://api.day.app/k", "标题", "a/b c");
    const url = mockFetch.mock.calls[0][0];
    expect(url).toContain(encodeURIComponent("标题"));
    expect(url).toContain(encodeURIComponent("a/b c"));
  });

  it("code != 200 → ok:false", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ code: 400, message: "key 无效" }));
    const r = await sendBark("https://api.day.app/bad", "t", "b");
    expect(r.ok).toBe(false);
    expect(r.errorMessage).toBe("key 无效");
  });
});

describe("sendPushPlus", () => {
  it("成功(code=200)→ ok:true", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ code: 200, data: "ok" }));
    const r = await sendPushPlus("tok", "TITLE", "BODY");
    expect(r.ok).toBe(true);
    const call = mockFetch.mock.calls[0];
    const body = JSON.parse(call[1].body);
    expect(body).toMatchObject({
      token: "tok",
      title: "TITLE",
      content: "BODY",
      template: "markdown",
      channel: "wechat",
    });
  });

  it("空 token → ok:false,不发请求", async () => {
    const r = await sendPushPlus("", "t", "b");
    expect(r.ok).toBe(false);
    expect(r.errorMessage).toBe("token 不能为空");
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("token 两端空白 → 自动 trim", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ code: 200 }));
    await sendPushPlus("  tok  ", "t", "b");
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.token).toBe("tok");
  });

  it("code != 200 → ok:false + msg", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ code: 903, msg: "实名未完成" }));
    const r = await sendPushPlus("tok", "t", "b");
    expect(r.ok).toBe(false);
    expect(r.errorMessage).toBe("实名未完成");
  });
});

describe("sendTelegram", () => {
  it("成功(ok=true)→ ok:true", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ ok: true }));
    const r = await sendTelegram("bot123|456", "title", "body");
    expect(r.ok).toBe(true);
    const call = mockFetch.mock.calls[0];
    expect(call[0]).toBe("https://api.telegram.org/botbot123/sendMessage");
    const body = JSON.parse(call[1].body);
    expect(body.chat_id).toBe("456");
    expect(body.text).toContain("<b>title</b>");
    expect(body.text).toContain("body");
  });

  it("channelKey 格式错误(没 | 分隔)→ ok:false", async () => {
    const r = await sendTelegram("no-pipe-here", "t", "b");
    expect(r.ok).toBe(false);
    expect(r.errorMessage).toContain("格式错误");
  });

  it("botToken 或 chatId 空 → ok:false", async () => {
    expect((await sendTelegram("|456", "t", "b")).ok).toBe(false);
    expect((await sendTelegram("bot|", "t", "b")).ok).toBe(false);
  });

  it("chatId 非数字 → ok:false", async () => {
    const r = await sendTelegram("bot|abc123", "t", "b");
    expect(r.ok).toBe(false);
    expect(r.errorMessage).toContain("chatId");
  });

  it("chatId 含负号(群组)→ 允许", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ ok: true }));
    const r = await sendTelegram("bot|-100123456", "t", "b");
    expect(r.ok).toBe(true);
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.chat_id).toBe("-100123456");
  });

  it("HTML 转义 < > & 在标题/正文里", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ ok: true }));
    await sendTelegram("bot|1", "<script>", "a & b > c");
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.text).toContain("&lt;script&gt;");
    expect(body.text).toContain("a &amp; b &gt; c");
  });

  it("API 返回 ok:false → ok:false + description", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ ok: false, description: "Bad Request: chat not found" })
    );
    const r = await sendTelegram("bot|999", "t", "b");
    expect(r.ok).toBe(false);
    expect(r.errorMessage).toContain("chat not found");
  });
});

describe("sendPush router", () => {
  it("serverchan 路由到 sendServerChan", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ code: 0 }));
    const r = await sendPush("serverchan", "SCT", "t", "b");
    expect(r.ok).toBe(true);
  });
  it("bark 路由到 sendBark", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ code: 200 }));
    const r = await sendPush("bark", "https://api.day.app/k", "t", "b");
    expect(r.ok).toBe(true);
  });
  it("pushplus 路由到 sendPushPlus", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ code: 200 }));
    const r = await sendPush("pushplus", "tok", "t", "b");
    expect(r.ok).toBe(true);
  });
  it("telegram 路由到 sendTelegram", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ ok: true }));
    const r = await sendPush("telegram", "bot|1", "t", "b");
    expect(r.ok).toBe(true);
  });
});
