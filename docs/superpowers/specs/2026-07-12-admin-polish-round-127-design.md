# Round 127 — Admin Polish 三件套 (ConfirmModal + not-found + empty-state)

> 设计日期：2026-07-12
> 起点：HEAD `f765606` (round 126)
> 范围：3 件独立 polish，可分 3 个 commit
> 估算：~3h 实现 + ~1h 测试 + ~30min commit/README
> 来源：`docs/audit/2026-07-09-ui-review/findings.md` 残留项 + round 126 后空白区域扫描

---

## 现状（事实）

最近 100+ 轮 polish 集中在 `/me` 用户中心（`app/me/page.tsx` 被改 47 次）。admin 和边缘组件被忽略很久。本轮挑出 3 件：

1. **`confirm()`/`alert()` 残留 7 处**（findings.md AX2 🔴 P0 未完成）—— `settings/settings-form.tsx:75` / `cards/delete-button.tsx:11,19,24` / `sims/[id]/page.tsx:80` / `sims/new/page.tsx:46` / `sims/_components/sims-bulk-table.tsx:69-74` / `reminders/_components/resend-button.tsx:20`
2. **`app/admin/not-found.tsx` 是全项目被改次数最少的页面之一（仅 1 次）**，极简、无图标、无 breadcrumb
3. **`app/_components/empty-state.tsx` 用 `○` 字符当图标**，无 a11y，被 11 个页面引用却从未 polish

---

## 设计 1：抽 `<ConfirmModal>` 替换 7 处 confirm/alert

### 目标

- 消除 7 处残留的 `confirm()`/`alert()`，所有确认走统一组件
- a11y: focus trap 简化版 + Esc 关闭 + aria-modal + aria-labelledby
- 视觉与 `me/settings/settings-client.tsx:738` 已有的自定义 Modal 对齐

### 新组件

**位置**：`app/_components/confirm-modal.tsx`（client component）

**Props**：
```ts
interface ConfirmModalProps {
  open: boolean;
  title: string;
  description?: ReactNode;          // 描述内容,可以是 string 或 JSX(列表/代码块等)
  confirmLabel?: string;            // 默认 "确认"
  cancelLabel?: string;             // 默认 "取消"
  tone?: "danger" | "primary";      // 默认 "primary",danger 时按钮用 rose-600
  loading?: boolean;                // 提交中状态,禁用两个按钮 + 显示 loading 文案
  onConfirm: () => void;            // 点确认回调(loading=true 时禁用)
  onClose: () => void;              // 关闭回调(loading 时禁止关闭)
}
```

**视觉**（沿用 `settings-client.tsx:738` 已有模式）：
- 遮罩：`fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4`
- 卡片：`bg-white rounded-xl shadow-xl max-w-md w-full p-6`
- 标题：`text-lg font-semibold mb-2`,`id={titleId}` 用于 aria-labelledby
- 内容：`text-sm text-slate-700`
- 按钮区：`mt-5 flex gap-2 justify-end`
  - 取消:`px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-100 text-sm disabled:opacity-50`
  - 确认:tone 决定颜色
    - danger: `bg-rose-600 text-white hover:bg-rose-700`
    - primary: `bg-indigo-600 text-white hover:bg-indigo-700`

**键盘交互**：
- Esc 键关闭（loading 时不响应）
- 遮罩点击关闭（loading 时不响应）
- 关闭时清空焦点（防止残留的 focus 指向隐藏元素）

### 替换的 7 处

| # | 文件 | 原文 | 改法 |
|---|---|---|---|
| 1 | `app/admin/cards/delete-button.tsx:11` | `if (!confirm("确认删除该未兑换的卡密?")) return;` | 改 ConfirmModal，title="确认删除该卡密",tone="danger",confirmLabel="删除" |
| 2 | `app/admin/cards/delete-button.tsx:19` | `alert(data.error \|\| "删除失败");` | 改成 inline error state（`const [error, setError] = useState<string \| null>(null)`），显示在按钮上方红字 |
| 3 | `app/admin/cards/delete-button.tsx:24` | `alert(e instanceof Error ? e.message : "网络错误");` | 同 #2 |
| 4 | `app/admin/sims/[id]/page.tsx:80` | `if (!confirm("确认删除该号码?所有相关 user / reminder 也会被级联删除。")) return;` | 改 ConfirmModal，title="确认删除该号码",description 中列出影响（user / reminder 级联）,tone="danger" |
| 5 | `app/admin/sims/new/page.tsx:46` | `if (initialPassword && !window.confirm("已输入的密码会被新的随机密码覆盖,继续?")) { return; }` | 改 ConfirmModal，title="覆盖已输入的密码？"，tone="primary"（不是危险操作，只是提示）|
| 6 | `app/admin/sims/_components/sims-bulk-table.tsx:69-74` | `if (... !confirm(action === "delete" ? "..." : "..."))` | 改 ConfirmModal,动态 description（删除 N 个 / 测试推送 N 个）|
| 7 | `app/admin/reminders/_components/resend-button.tsx:20` | `if (!confirm("确认重发这条提醒?将按当前 sim 状态重新渲染模板并推送给绑定渠道。"))` | 改 ConfirmModal，title="确认重发这条提醒",description 含详细影响 |
| 8 | `app/admin/settings/settings-form.tsx:75` | `!confirm("确认恢复默认模板?当前编辑的内容会被覆盖。")` | 改 ConfirmModal，title="确认恢复默认模板",description 含"当前编辑内容会丢失"警告 |

### 测试

新建 `tests/client/confirm-modal.test.tsx`：
- 渲染：open=true 时显示标题、描述、按钮；open=false 时不渲染
- 交互：点确认 → onConfirm 调用 1 次
- 交互：点取消 → onClose 调用 1 次
- 交互：点遮罩 → onClose 调用 1 次
- 交互：loading=true 时点确认不触发 onConfirm（已被父级 disable）
- 键盘：open 时 Esc 触发 onClose
- a11y：dialog 有 `role="dialog"` + `aria-modal="true"` + `aria-labelledby`

### 风险与权衡

- 7 处替换一次性改完，可能引入回归 → 每个文件改完后跑相关测试
- sims-bulk-table 的 confirm 是动态消息（`action === "delete" ? "..." : "..."`），参数化后 confirmModal 的 description 可以是 ReactNode，足够灵活
- 保留 `confirm()` API 不变是为了**避免破坏未来新调用方**——但不在本轮范围内加 lint 规则

---

## 设计 2：admin/not-found.tsx polish

### 目标

把 `app/admin/not-found.tsx` 从 28 行极简文案升级为带 icon + breadcrumb + 智能回退的 admin 404 页。

### 改动

| 元素 | 原 | 新 |
|---|---|---|
| 顶部 | 无 | `<Breadcrumb items={[{label:"管理后台", href:"/admin"}, {label:"404"}]} />`（复用 `app/admin/_components/breadcrumb.tsx`） |
| 主图标 | "404" 灰色 4xl 文本 | 保留 + 加 SVG icon（"问号+文件"或"指南针"，16x16→64x64 scale-up,与 admin 卡片视觉一致） |
| 文案 | "页面不存在" + 一段 hint | 保留 + 加"链接可能因以下原因失效"列表（管理后台权限变更、号码/用户已被删除、URL 手敲错）|
| CTA 区 | "返回仪表盘" + "号码列表" | 保留 + 加"返回上一页"按钮（`onClick={() => history.back()}`，用 client wrapper） |
| 移动端 | `flex-col sm:flex-row` | 保留不变 |

### 需要的 client wrapper

新建 `app/admin/not-found-back-button.tsx`（client component）：
```tsx
"use client";
export function AdminNotFoundBackButton() {
  return <button onClick={() => history.back()} ...>← 返回上一页</button>;
}
```

### 测试

不需要（纯展示组件）

### 风险

- history.back() 在某些场景会跳到登录页或站外，体验不佳 → 文案补充"按 ← 上一步回到上一个 admin 页"
- 不改 schema / 不改 API

---

## 设计 3：empty-state.tsx 加 SVG icon + tone

### 目标

`app/_components/empty-state.tsx` 升级为带 SVG icon 的版本，统一全站 11 处空态视觉。

### 改动

```tsx
interface EmptyStateProps {
  title: string;
  hint?: string;
  actions?: EmptyStateAction[];
  icon?: ReactNode;             // 新增:允许调用方传自定义 icon
  tone?: "default" | "success" | "warning";  // 新增:影响 icon 颜色
}
```

**默认 icon**：inbox（Lucide 风格 SVG）：

```svg
<svg width={48} height={48} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
  <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
  <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
</svg>
```

**默认颜色**：
- `tone="default"` (slate-300)
- `tone="success"` (emerald-300)
- `tone="warning"` (amber-300)

**视觉**：替换 `text-3xl mb-2 text-slate-300` → `<div className="mb-3 text-slate-300">{icon ?? <DefaultInbox />}</div>`

### 测试

新建 `tests/client/empty-state.test.tsx`：
- 已存在（扩展）
- 新增：默认渲染带 SVG icon
- 新增：传 `icon` prop 时显示自定义 icon
- 新增：3 种 tone 渲染正确颜色 class

### 风险

- 11 处调用方都不传 prop 也能用默认值，**不破坏任何调用方**
- 测试已存在（`tests/client/empty-state.test.tsx`），只需扩展

---

## 实施批次与 commit

| Commit | 内容 | 文件数 | 估时 |
|---|---|---|---|
| `feat(admin): polish round 127 — 抽 ConfirmModal 替换 7 处残留 confirm/alert` | 新组件 + 8 处替换 + 新测试 | 9 个文件 | ~2h |
| `feat(admin): polish round 127 — admin/not-found 加 icon + breadcrumb + 返回上一页` | 1 文件 + 1 client wrapper | 2 个文件 | ~30min |
| `feat(ui): polish round 127 — empty-state 加 SVG icon + tone` | 1 文件 + 扩展测试 | 2 个文件 | ~30min |
| `docs: round 127 — README 测试章节同步` | 1 文件 | ~15min |

---

## 测试覆盖目标

- 新增 `tests/client/confirm-modal.test.tsx`(~7 测试)
- 扩展 `tests/client/empty-state.test.tsx`(~3 测试)
- 现有 335 测试不回归

---

## 不在本轮范围

- findigs.md 残留的：B1/B2/B3/B4/B5 (settings 重排 / users 列对齐 / settings 编辑器体验) —— 待 round 128+
- Lg3 reminders 时间显示(部分 round 35 已改)—— 已 polish
- 移动端 admin sidebar 进一步打磨(round 15 已做)—— 已 polish

---

## 验证标准

- [ ] 7 处 `confirm()`/`alert()` 全部消失（`grep -rn "confirm(\|alert(" app` 在新 components 中无残留，旧的已被替换）
- [ ] `tests/client/confirm-modal.test.tsx` 7 个测试通过
- [ ] `tests/client/empty-state.test.tsx` 扩展后 8 个测试通过
- [ ] admin 手动测试：访问不存在的 admin 路径 → 看到 icon + breadcrumb + 返回按钮
- [ ] 模拟批量删除 / 重发 / 恢复默认 / 删除号码 / 删除卡密 → 都弹统一的 ConfirmModal（不再是浏览器原生对话框）
- [ ] 4 个 commit 通过 CI / type-check / lint / test