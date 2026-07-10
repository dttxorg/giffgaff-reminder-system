"use client";

import { useState } from "react";

/**
 * 渠道 key 展示组件
 *
 * 默认只显示前 12 位 + "****" mask,避免在屏幕共享/截图时泄露完整 key。
 * 点击"显示完整"可临时展开;再次点击收回。
 *
 * 完整 key 在浏览器内存里,不写到 localStorage(防 XSS)。
 */
export function ChannelKeyReveal({ channelKey }: { channelKey: string }) {
  const [revealed, setRevealed] = useState(false);
  const masked = `${channelKey.slice(0, 12)}****`;
  const isShort = channelKey.length <= 16;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <code
        className="text-xs text-slate-400 font-mono break-all"
        title={revealed ? "点击收回" : "点击显示完整 key(仅本地,不上传)"}
      >
        {revealed || isShort ? channelKey : masked}
      </code>
      {!isShort && (
        <button
          type="button"
          onClick={() => setRevealed((v) => !v)}
          className="text-[10px] text-indigo-600 hover:text-indigo-700 hover:underline"
          aria-pressed={revealed}
        >
          {revealed ? "收回" : "显示完整"}
        </button>
      )}
    </div>
  );
}
