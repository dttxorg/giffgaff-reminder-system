interface UserHeaderProps {
  username: string;
  simCount: number;
}

/**
 * Round 221: /me 页面头部 — 用户头像 + 关键信息
 *
 * 设计:
 *  - 圆头像:取 username 首字母(字母 → 大写首字,数字/手机号 → "U")
 *  - indigo-100 底色 + indigo-600 文字
 *  - 用户名(font-mono)+ 副信息(SIM 卡数)
 *  - 右下角小三角"在线"小标(纯视觉,无数据)
 */
export function UserHeader({ username, simCount }: UserHeaderProps) {
  // 取首字母(字母 → 大写,其他 fallback "U")
  const initial = /^[a-zA-Z]/.test(username) ? username[0].toUpperCase() : "U";
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="relative shrink-0">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 text-white text-xl font-bold flex items-center justify-center shadow-sm">
          {initial}
        </div>
        {/* 在线小点(右下角) */}
        <span
          className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 ring-2 ring-white"
          aria-label="账号登录态:活跃"
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-slate-500">用户中心</p>
        <h1 className="text-xl font-bold font-mono truncate">{username}</h1>
        <p className="text-xs text-slate-500">
          {simCount === 0
            ? "尚未绑定 SIM 卡"
            : `已绑定 ${simCount} 张 SIM 卡`}
        </p>
      </div>
    </div>
  );
}
