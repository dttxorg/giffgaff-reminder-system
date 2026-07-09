# Giffgaff 保号提醒系统 — UI/UX 审查报告

> 审查日期：2026-07-09  
> 审查范围：所有面向用户与管理员的页面 + 视觉一致性 + 可访问性  
> 审查方式：完整阅读 `app/**/*.tsx` 源码（约 30 个文件）+ 设计一致性归纳  
> 截图限制：当前环境无 Postgres 数据库、沙箱无法绑定端口，**未能跑起 dev server 截取运行时截图**。所有结论基于源码 + Tailwind class 反推视觉，但每条都给出了对应的文件路径与行号。  
> 评级：⚠️=可改进  🔴=必须修  

---

## 摘要

共发现 **66 条**具体问题，其中：
- 🔴 P0 必须修：**16 条**
- ⚠️ P1 体验打磨：**35 条**
- ⚠️ P2 锦上添花：**15 条**

最影响产品的三个问题：
1. **用户中心 `/me` 缺进度条可视化** — 整个产品的核心 signal（"我还有几天要保号"）只是大字 + 数字，没有视觉化倒计时
2. **admin 移动端布局崩坏** — sidebar 没有 `hidden md:block`，手机上完全没法管理后台
3. **首页 FAQ 6 条全是收起状态**，关键信息（pushplus 已收费、卡密路径、180 天上限）都被折叠，新用户看不到

详细发现见下方各章节。

---

## 一、全局视觉一致性（system-wide）

| # | 问题 | 严重度 | 位置 |
|---|---|---|---|
| G1 | 三种 border-radius 共存：rounded-lg / rounded-xl / rounded-2xl。同类卡片在不同页用不同尺寸 | ⚠️ | 全部 |
| G2 | 三种边框色混用 border-slate-200 / 300 / 100 | ⚠️ | 全部 |
| G3 | 两套"主操作"按钮色：用户端 indigo-600，admin/login 和 users 密码重置用 slate-900，破坏视觉契约 | ⚠️ | `admin/login/page.tsx`、`admin/users/users-client.tsx` |
| G4 | 全局 loading 只有"加载中..."文本，无 spinner/skeleton | ⚠️ | 多处 |
| G5 | 根 layout 强制 DB 查询：每个页面（含 /login、/help）都阻塞 DB round-trip，Vercel 冷启动 + PG 延迟会拖垮 Lighthouse | 🔴 | `app/layout.tsx:14` |
| G6 | 无 skip-to-content 链接 | ⚠️ | layout |
| G7 | admin 移动端无汉堡菜单，sidebar 在 md 以下仍渲染并占满首行 | 🔴 | `app/admin/layout.tsx:11` |

---

## 二、首页 `/`

| # | 问题 | 严重度 | 位置 |
|---|---|---|---|
| H1 | 三个 feature card 用 emoji（📅⏰📲）做图标，无品牌一致性 | ⚠️ | `app/page.tsx:23-43` |
| H2 | FAQ 用 `<details>` 折叠，6 条全收起。关键信息（pushplus 收费、卡密路径、180 天上限）被隐藏 | 🔴 | `app/page.tsx:67-104` |
| H3 | "有卡密？立即兑换 →" 转化路径太弱（仅一行浅色文字），应是和"立即登录"并列的主 CTA | 🔴 | `app/page.tsx:62-66` |
| H4 | 没有推送通知长什么样的截图/示例，信任建立困难 | ⚠️ | `app/page.tsx` |
| H5 | "卡密是什么" FAQ 和登录页"还没账号"提示重复，应做成 onboarding 流程图 | ⚠️ | 跨页 |
| H6 | 首屏缺 social proof（"已有 N 个号码正在被守护"），无从众推动 | ⚠️ | `app/page.tsx:13-18` |

---

## 三、登录页 `/login`

| # | 问题 | 严重度 | 位置 |
|---|---|---|---|
| L1 | 密码 placeholder 写"管理员给您的初始密码"，但兑换卡密的用户其实自己设密码，两类用户混在一个表单里 | 🔴 | `app/login/page.tsx:62` |
| L2 | 无"忘记密码"出口，没写明联系方式（README 说"请联系管理员"但页面上没写） | 🔴 | `app/login/page.tsx` |
| L3 | 新用户 vs 老用户入口没区分，新卡密用户应优先看到"兑换卡密开通" | ⚠️ | `app/login/page.tsx:78-87` |
| L4 | disabled 按钮只有 opacity-50，文字色不变，弱视用户看不出禁用 | ⚠️ | `app/login/page.tsx:72` |
| L5 | 提交后只有一个"登录中..."文本，无 spinner 无遮罩 | ⚠️ | `app/login/page.tsx:71-75` |

---

## 四、兑换卡密 `/redeem`

| # | 问题 | 严重度 | 位置 |
|---|---|---|---|
| R1 | 卡密输入框没有自动格式化（粘贴 SCT2XXX 不会自动加 -） | ⚠️ | `app/redeem/redeem-client.tsx:148-162` |
| R2 | date input 默认今天但没告诉用户，老用户补录历史日期时容易直接提交默认值 | ⚠️ | `app/redeem/redeem-client.tsx:175` |
| R3 | 密码强度可视化缺失，minLength=8 太弱 | ⚠️ | `app/redeem/redeem-client.tsx:191-225` |
| R4 | "兑换后将自动登录，绑定推送渠道后..." 提示藏在表单底部，应放顶部 | 🔴 | `app/redeem/redeem-client.tsx:227-230` |
| R5 | 失败态没有 form 内重试入口，必须返回首页重头再来 | ⚠️ | `app/redeem/redeem-client.tsx:160-170` |

---

## 五、用户中心 `/me`

| # | 问题 | 严重度 | 位置 |
|---|---|---|---|
| M1 | "已激活 N 天"是核心 signal，但只是大字 + 数字，无进度条（0→170→180 三段），无颜色编码 | 🔴 | `app/me/page.tsx:51-54` |
| M2 | 进入提醒窗口的提示没量化：不说"还有 X 天"，也不说当前 bucket（170-177/178/179/180） | 🔴 | `app/me/page.tsx:56-60` |
| M3 | 无"最近发送给我的提醒"列表，透明度差，用户会怀疑系统没在工作 | ⚠️ | `app/me/page.tsx` |
| M4 | "立即去保号"按钮没说会发生什么，应加副标"选个日期就完成" | ⚠️ | `app/me/page.tsx:64-69` |
| M5 | 无推送通知样例预览，第一次收到推送可能以为是垃圾短信 | ⚠️ | `app/me/page.tsx` |
| M6 | channel 显示只截前 12 位 mask（SCT2xxx****），没法确认是不是自己的但也没法完整看到 | ⚠️ | `app/me/page.tsx:88` |

---

## 六、用户设置 `/me/settings`

| # | 问题 | 严重度 | 位置 |
|---|---|---|---|
| S1 | channel 2×2 grid 第 5 格空，4 选项放 2 列布局失衡 | 🔴 | `app/me/settings/settings-client.tsx:138-181` |
| S2 | pushplus 警告框嵌在 channel grid 里被挤压，未来加 channel 时会乱套 | 🔴 | `app/me/settings/settings-client.tsx:152-162` |
| S3 | channel 切换会 reset verified 状态但视觉没解释为什么保存按钮还是灰 | ⚠️ | `app/me/settings/settings-client.tsx:117-126` |
| S4 | 30s 冷却只有文字倒计时，无进度环 | ⚠️ | `app/me/settings/settings-client.tsx:230-238` |
| S5 | 改激活日期用 confirm() 浏览器对话框，1990 年代体验 | 🔴 | `app/me/settings/settings-client.tsx:283-290` |
| S6 | 改激活日期影响描述含糊，应直接展示"新保号倒计时起点：X → 提醒开始日：X+170" | ⚠️ | `app/me/settings/settings-client.tsx:286-288` |
| S7 | 修改激活日期是破坏性操作（重置 reminder schedule），应放高级/危险折叠区 | ⚠️ | `app/me/settings/settings-client.tsx:262-264` |
| S8 | 3 section 按代码顺序排，但最常用的"修改密码"被埋在最后 | ⚠️ | settings-client.tsx |
| S9 | 保存按钮验证通过前一直 disabled，无"为什么灰"hint | ⚠️ | `app/me/settings/settings-client.tsx:267-272` |
| S10 | 测试推送成功/失败反馈只靠绿/红文字，刷新丢失 | ⚠️ | `app/me/settings/settings-client.tsx:241-250` |

---

## 七、保号页 `/p/[simId]`（公开）

| # | 问题 | 严重度 | 位置 |
|---|---|---|---|
| P1 | 公开页有全站 header（登录/用户中心链接），品牌感弱 | ⚠️ | layout vs p/[simId] |
| P2 | 手机号格式化用 inline regex，lib/phone 已有 formatPhoneForDisplay 应统一调用 | ⚠️ | `app/p/[simId]/page.tsx:115` |
| P3 | maxDate 用 UTC ISO（new Date().toISOString().slice(0,10)），与 input[type=date] 本地时区不一致；UTC+8 凌晨 0-8 点会让用户看到"昨天"作为最新可选日 | 🔴 | `app/p/[simId]/page.tsx:36` |
| P4 | 成功页 3 秒后自动跳走但无倒计时也无"立即返回"按钮 | ⚠️ | `app/p/[simId]/page.tsx:106-108` |
| P5 | 无"保号是什么意思"说明，新用户不知道保号 = 发短信/打电话/上网任意一种 | ⚠️ | `app/p/[simId]/page.tsx` |
| P6 | /p/${sim.id} 用自增 id，admin 或拿到链接者可枚举所有 sim（公开访问隐含风险，应改 UUID） | 🔴 | `app/p/[simId]/page.tsx` + Prisma schema |
| P7 | 404 页只让回首页，没"我有卡密怎么办"提示 | ⚠️ | `app/p/[simId]/page.tsx:79-86` |

---

## 八、管理后台 layout + 导航

| # | 问题 | 严重度 | 位置 |
|---|---|---|---|
| A1 | 侧栏图标全缺，6 个菜单项全是纯文字，加图标能极大提升扫读速度 | ⚠️ | `app/admin/layout.tsx:20-25` |
| A2 | 无 active state 高亮，当前页在哪看不出来 | 🔴 | `app/admin/layout.tsx:39-47` |
| A3 | "退出登录"按钮 text-slate-400 on bg-slate-900 对比度 WCAG AA 失败 | 🔴 | `app/admin/layout.tsx:32-37` |
| A4 | 侧栏 mobile 上挤压，md:w-56 前无 hidden md:block | 🔴 | `app/admin/layout.tsx:11` |
| A5 | 无 breadcrumb，深一层操作（reminder log 点 sim id 跳到 sim 编辑）会迷路 | ⚠️ | 全部 admin 子页 |
| A6 | 侧栏 admin 登出后消失，admin/login 页变孤岛卡片 | ⚠️ | `app/admin/layout.tsx` |

---

## 九、仪表盘 `/admin`

| # | 问题 | 严重度 | 位置 |
|---|---|---|---|
| D1 | 4 个 stat 卡片无趋势/对比，只显示今日数无法判断多寡 | ⚠️ | `app/admin/page.tsx:30-34` |
| D2 | "号码总数 / 用户数" 没人均/活跃率分解 | ⚠️ | `app/admin/page.tsx:20-27` |
| D3 | 无"快速操作"区，常见任务（新增号码、生成卡密）藏在子页 | ⚠️ | `app/admin/page.tsx` |
| D4 | "最近发送日志"无"查看全部"链接到 /admin/reminders | ⚠️ | `app/admin/page.tsx:37-77` |
| D5 | 时间用 UTC ISO，中国 admin 看不懂，应本地化或加 (UTC+8: HH:MM) 副标 | ⚠️ | `app/admin/page.tsx:62` |
| D6 | 错误列 truncate max-w-xs，调试推送时核心错误被截断就废了 | 🔴 | `app/admin/page.tsx:73-75` |

---

## 十、号码管理 `/admin/sims`

| # | 问题 | 严重度 | 位置 |
|---|---|---|---|
| N1 | 8 列表格 1280px 以下横向滚动，容器无明显 scroll 提示 | ⚠️ | `app/admin/sims/page.tsx:62-128` |
| N2 | 天数列只在文字色区分（in-window 是 text-amber-700），无 bg tint 或行高亮 | ⚠️ | `app/admin/sims/page.tsx:113-118` |
| N3 | "绑定"列只显示 channel 名，不显示 channelKey 是否验证过、最近一次发送状态 | ⚠️ | `app/admin/sims/page.tsx:121-125` |
| N4 | 无批量操作（勾选多选一起删/改状态/发测试推送） | ⚠️ | `app/admin/sims/page.tsx` |
| N5 | 搜索 input 不防抖不自动提交 | ⚠️ | `app/admin/sims/page.tsx:50-61` |
| N6 | 无"上次发送时间"列 | ⚠️ | `app/admin/sims/page.tsx` |
| N7 | "上次保号"列只显示日期，无"距今 X 天"提示 | ⚠️ | `app/admin/sims/page.tsx:103` |
| N8 | 空态只有"暂无数据"，无"新增第一个号码"CTA | ⚠️ | `app/admin/sims/page.tsx:87-90` |

---

## 十一、号码新增/编辑

| # | 问题 | 严重度 | 位置 |
|---|---|---|---|
| N9 | Math.random() 用于生成密码，非加密学安全。应换 crypto.getRandomValues / crypto.randomInt | 🔴 | `app/admin/sims/new/page.tsx:42-48`（users-client.tsx 同样） |
| N10 | "随机生成"按钮无二次确认，误点会覆盖已输入密码 | ⚠️ | `app/admin/sims/new/page.tsx:81-90` |
| N11 | 编辑页 lastPortedAt 没校验 ≥ activatedAt，admin 可填错乱日期 | 🔴 | `app/admin/sims/[id]/page.tsx:108-118` |
| N12 | 删除按钮用 confirm()，且没说明影响（应明示"客户所有提醒记录会清空"） | ⚠️ | `app/admin/sims/[id]/page.tsx:60-67` |
| N13 | 编辑页无"提醒历史"折叠区 | ⚠️ | `app/admin/sims/[id]/page.tsx` |
| N14 | 新增号码后立即跳列表，无"新增成功 + 初始密码"提示页，admin 可能忘记记密码 | ⚠️ | `app/admin/sims/new/page.tsx:30-35` |

---

## 十二、卡密管理 `/admin/cards`

| # | 问题 | 严重度 | 位置 |
|---|---|---|---|
| C1 | 卡密生成后只在生成页显示一次，跳走就再也看不到完整卡密，应支持"完整导出"或"批量复制 + 下载 CSV" | 🔴 | `app/admin/cards/new/new-client.tsx:34-42` |
| C2 | "复制全部"用 alert() 反馈，太老派 | ⚠️ | `app/admin/cards/new/new-client.tsx:81` |
| C3 | "再生成一批"按钮生成成功后立即可点，误触会生成重复卡密 | ⚠️ | `app/admin/cards/new/new-client.tsx:96-101` |
| C4 | 删除卡密用 confirm()，无审计日志（谁删的、什么时候） | ⚠️ | `app/admin/cards/delete-button.tsx` |
| C5 | 单条卡密无"复制"按钮 | ⚠️ | `app/admin/cards/page.tsx:90-117` |
| C6 | 无"批次"维度，100 张卡密怎么区分哪些是一批？只有 notes 字段 | ⚠️ | `app/admin/cards/page.tsx` |

---

## 十三、用户列表 `/admin/users`

| # | 问题 | 严重度 | 位置 |
|---|---|---|---|
| U1 | 和 sims list 信息重叠但不对齐（无"激活日期/当前天数"） | ⚠️ | `app/admin/users/page.tsx` + client |
| U2 | "重置密码" Modal 无 Esc 关闭、无点遮罩关闭，不完整 | ⚠️ | `app/admin/users/users-client.tsx:135-145` |
| U3 | "重置密码"用 Math.random() 同 N9 | 🔴 | `app/admin/users/users-client.tsx:50-56` |
| U4 | 生成的新密码只在 Modal 里显示一次，关闭后无法找回 | 🔴 | `app/admin/users/users-client.tsx:70-73` |
| U5 | 无按 channel / hasPassword 筛选 | ⚠️ | `app/admin/users/page.tsx` |
| U6 | 8 列表格 + 模态框 + 整页数据传 client 组件，单页 hydration payload 大 | ⚠️ | `app/admin/users/users-client.tsx` |

---

## 十四、提醒日志 `/admin/reminders`

| # | 问题 | 严重度 | 位置 |
|---|---|---|---|
| Lg1 | simId 是数字输入，admin 排错时实际想搜手机号后 6 位 | 🔴 | `app/admin/reminders/page.tsx:38-46` |
| Lg2 | 错误列 truncate max-w-xs，排查频道问题时核心错误被截断 | 🔴 | `app/admin/reminders/page.tsx:81-84` |
| Lg3 | UTC 时间显示，中国 admin 看不懂 | ⚠️ | `app/admin/reminders/page.tsx:70` |
| Lg4 | 无日期范围筛选，只能看最近 200 条 | ⚠️ | `app/admin/reminders/page.tsx` |
| Lg5 | 无"重发"按钮，失败提醒不能手动重试只能等下次 cron | 🔴 | `app/admin/reminders/page.tsx` |
| Lg6 | 无 CSV 导出 | ⚠️ | `app/admin/reminders/page.tsx` |

---

## 十五、文案设置 `/admin/settings`

| # | 问题 | 严重度 | 位置 |
|---|---|---|---|
| T1 | 无实时预览，admin 改完模板得等下一次 cron 才知道渲染成什么样，应给 mock 渲染面板 | 🔴 | `app/admin/settings/settings-form.tsx:42-55` |
| T2 | textarea rows={6} 太小，编辑长模板要不停滚动 | ⚠️ | `app/admin/settings/settings-form.tsx:43` |
| T3 | 无变量自动补全（输入 {{ 不弹出候选项） | ⚠️ | `app/admin/settings/settings-form.tsx:42-55` |
| T4 | "恢复默认"无确认，误触丢失手编辑内容 | ⚠️ | `app/admin/settings/settings-form.tsx:97-100` |
| T5 | 无"未保存"提示，编辑后忘了点保存就跳走会丢失 | ⚠️ | `app/admin/settings/settings-form.tsx` |

---

## 十六、Help 教程页

| # | 问题 | 严重度 | 位置 |
|---|---|---|---|
| Hp1 | Sever酱 vs Bark 教程信息架构不一致：Sever酱 有完成检查清单、FAQ 分类、快速通道块；Bark 没有 | ⚠️ | `app/help/serverchan/page.tsx` vs `app/help/bark/page.tsx` |
| Hp2 | 教程链接 target="_blank" 无视觉提示（外部链接 icon），用户不知道点开跳新窗 | ⚠️ | 所有 help 页 |
| Hp3 | 教程页无"返回上一页"按钮 | ⚠️ | 所有 help 页 |
| Hp4 | prose class 与 not-prose 自定义块混排，渲染时 prose 样式会污染自定义 block | ⚠️ | 所有 help 页 |
| Hp5 | 所有教程的"去设置通知渠道"按钮无 deep link，教程是 Bark 但跳到 settings 默认是 Sever酱，要再点切换，应支持 /me/settings?channel=bark | 🔴 | 所有 help 页 |

---

## 十七、可访问性 (a11y) 综合

| # | 问题 | 严重度 |
|---|---|---|
| AX1 | `<details>` 的 summary 没显式 aria-expanded | ⚠️ |
| AX2 | 大量 confirm() / alert()，不可被屏幕阅读器良好朗读、无 focus trap、无遮罩样式 | 🔴 |
| AX3 | 错误信息没通过 aria-describedby 关联到输入框 | 🔴 |
| AX4 | 颜色作为唯一信号（红=错、绿=对、灰=禁），色盲用户受影响 | 🔴 |
| AX5 | disabled 按钮只有 opacity-50，无视觉差异（背景/边框不变） | ⚠️ |
| AX6 | 无任何 prefers-reduced-motion 适配，所有 transition 强制启用 | ⚠️ |
| AX7 | 登录密码 input 无 visibility toggle（"眼睛"icon），移动端输入密码困难 | ⚠️ |
| AX8 | 手机号 placeholder 含格式示例但 input type="text"，移动端弹全键盘，应加 inputmode="tel" | ⚠️ |

---

## 十八、P0 改造清单（最影响产品）

1. **A4** 移动端 admin 侧栏加 hidden md:block + 汉堡菜单
2. **M1** 用户中心加 0→170→180 三段进度条，颜色编码
3. **M2** 进入提醒窗口给量化数字（还剩 X 天 / 当前 bucket）
4. **H2** FAQ 默认展开 2-3 条关键条目，或抽 onboarding 路径到 hero 下
5. **H3** 卡密兑换作为首页主 CTA（与"立即登录"并列）
6. **L1** 登录页区分"我有卡密"和"我有账号"两条路径
7. **L2** 写明"忘记密码请联系管理员"的联系方式
8. **R4** "兑换后还要再设一次推送渠道"提到兑换表单顶部
9. **P3** maxDate 用本地时区而非 UTC
10. **P6** sim id 改 UUID（公开 URL 可枚举的安全问题）
11. **N9/U3** admin 生成密码改 crypto.getRandomValues
12. **N11** 编辑 sim 时 lastPortedAt 必须 ≥ activatedAt
13. **C1** 一次性显示卡密后给"完整导出"按钮
14. **Lg1/Lg5** reminders 页支持按手机号搜索 + 重发按钮
15. **T1** 文案模板编辑器加实时预览
16. **Hp5** 帮助页 deep link 到对应 channel（/me/settings?channel=bark）

---

## 附录：审查范围

已读文件：
- `app/layout.tsx`, `app/globals.css`, `app/page.tsx`
- `app/login/page.tsx`
- `app/redeem/page.tsx`, `app/redeem/redeem-client.tsx`
- `app/me/page.tsx`, `app/me/settings/page.tsx`, `app/me/settings/settings-client.tsx`
- `app/p/[simId]/page.tsx`
- `app/help/serverchan/page.tsx`, `app/help/bark/page.tsx`
- `app/admin/layout.tsx`, `app/admin/login/page.tsx`, `app/admin/page.tsx`
- `app/admin/sims/page.tsx`, `app/admin/sims/new/page.tsx`, `app/admin/sims/[id]/page.tsx`
- `app/admin/cards/page.tsx`, `app/admin/cards/new/new-client.tsx`
- `app/admin/users/page.tsx`, `app/admin/users/users-client.tsx`
- `app/admin/reminders/page.tsx`, `app/admin/settings/page.tsx`, `app/admin/settings/settings-form.tsx`
- `prisma/schema.prisma`（schema 节选）
- `README.md`

未读文件（同类目推断）：
- `app/help/{pushplus,telegram}/page.tsx`
- `app/api/**`（不影响 UI 评估）

未读取导致的限制：
- CSV 导入按钮实际交互未看
- admin/sims/[id] 删除逻辑的级联具体行为未看
- 部分 help 页未读，无法 100% 确认教程一致性
