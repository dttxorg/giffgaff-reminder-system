# Giffgaff 保号提醒系统 — 设计文档

**日期**: 2026-06-21
**作者**: ZCode + 用户协作
**状态**: Draft (待用户 review)

## 1. 背景与目标

Giffgaff SIM 卡如果长期不"保号"(porting / keeping active)会被回收。用户群体拥有大量 SIM 卡,手动记住每个号码的保号日期不现实。本系统目标:

1. 用户从激活日期起算,第 170 天开始收到保号提醒;按时间临近自动加频。
2. 保号后用户通过网页自行更新保号日期,系统按新日期重新计时。
3. 管理员在后台维护号码库、查看全量数据、编辑提醒文案。
4. **用户输入号码支持模糊匹配**:用户输入 `07724 215611`(可带空格)也能匹配到完整号 `07724215611`,只要后 6 位匹配即可。
5. **测试推送按钮**:用户填完渠道 key 后,提供一个"测试"按钮,立刻发一条测试消息到用户的 Sever酱 / Bark,验证配置是否正确。不消耗验证码、不写库,纯推送测试。

## 2. 核心业务流程

### 2.1 用户旅程

```
新用户 → /login(只填 sim 号码,支持带空格如 "07724 215611")
        → 服务端提取后 6 位,匹配 sims 表中 phoneNumber 后 6 位一致的 sim
        → 匹配到 → 自动创建 user(无 channel)→ 登录成功 → 跳 /me
        → /me 检测 user.channel 为空 → 显示红色横幅"⚠️ 您还没设置通知渠道"
        → 点"立即设置" → /me/settings 选 Sever酱 / Bark + 填 key
        → 点"测试推送"验证 → 服务端再确认一次 → 保存
        → 跳回 /me,channel 已设置,系统开始按规则推提醒

老用户 → /login(只填 sim 号码)
        → 服务端查到已存在的 user → 直接登录 → 跳 /me
        → 看到自己的号码 + 激活日期 + 推送渠道

每日收到推送 → 文案含链接 https://<域名>/p/<sim_id>
              → 打开链接 → /p/<sim_id> 页面(公开,凭 sim_id 即可访问)
              → 选择新的保号日期(日期选择器)
              → 提交 → 重新计时 170 天
```

**设计要点(2026-06-21 补丁 3)**:登录流程不要求用户提交 channel key。
channel 是一次性设置(在 /me/settings),之后登录只凭 sim 号码。

### 2.2 管理员旅程

```
管理员 → /admin/login(账号 + 密码,环境变量配置)
        → /admin 仪表盘
        → 号码管理:列表 / 搜索 / 新增 / 编辑 / 删除
        → CSV 导入(批量)
        → 用户管理:查看绑定情况
        → 提醒日志:查看每次发送记录
        → 设置:编辑提醒文案模板
```

## 3. 提醒规则(冻结,作为后续实现的合同)

以"激活日期"或"上次保号日期"为基准,计算 `day_offset = 今天 - 基准日期`:

| day_offset | 当天发送次数 | 时间均匀分布 |
|---|---|---|
| 0-169 | 0 次(不提醒) | — |
| 170-172 | 1 次 | 命中窗口 [00:00, 24:00) → 一次 |
| 173-175 | 2 次 | 2 个等长 12h 窗口 [00:00, 12:00) / [12:00, 24:00) |
| 176-178 | 3 次 | 3 个等长 8h 窗口 [00:00, 08:00) / [08:00, 16:00) / [16:00, 24:00) |
| 179 | 5 次 | 5 个等长窗口,每个 4 小时 48 分 |
| 180 | 10 次 | 10 个等长窗口,每个 2 小时 24 分 |
| >180 | 0 次(停止 — 已错过保号窗口) | — |

(2026-06-21 调整:原"170-177=1 次"拆成 3 段 1/2/3 次递增,提醒更平滑)

**注**:180 天当天用户必须保号。如果 180 天结束仍未操作,系统停止推送(避免骚扰),但号码仍标记为"待保号"。

**桶(bucket)概念**:每次提醒是一个 bucket。同一个 sim、同一天、同一 bucket 由 `reminders_sent` 表保证只发一次。即使 cron 重复触发或并发调用也不会重复推。

### 3.1 bucket 计算(精确算法)

```ts
function bucketForDay(dayOffset: number, hourOfDay: number): { count: number; bucket: number } | null {
  const counts: Record<number, number> = { 170: 1, 171: 1, 172: 1, 173: 1, 174: 1, 175: 1, 176: 1, 177: 1, 178: 3, 179: 5, 180: 10 };
  const count = counts[dayOffset];
  if (!count) return null;

  // 把 24 小时按 count 等分
  const windowSizeHours = 24 / count;
  const bucket = Math.min(count - 1, Math.floor(hourOfDay / windowSizeHours));
  return { count, bucket };  // bucket 从 0 开始
}
```

举例:179 天的 sim,cron 在 14:00 触发 → `windowSize = 4.8h`,`bucket = floor(14 / 4.8) = 2`(0-indexed,即第 3 次)。

## 4. 架构

### 4.1 技术栈

- **运行时**: Next.js 14 (App Router) 部署到 Vercel
- **数据库**: Vercel Postgres (底层 Neon)
- **ORM**: Prisma
- **认证**: 自建(管理员账号密码 + 用户手机号验证码)
- **推送渠道**: Server酱 (SendKey) / Bark (URL)
- **定时调度**: 外部 cron-job.org 每小时 POST 一次 `/api/cron/reminders`

### 4.2 部署形态

```
┌──────────────┐     ┌─────────────────────────────────┐
│  用户浏览器    │ <─> │  Vercel (Next.js 14)            │
│  /            │     │  ├ Pages (SSR)                  │
│  /login       │     │  ├ Pages (SSR)                  │
│  /me          │     │  ├ Pages (SSR)                  │
│  /p/[simId]   │     │  └ API routes                   │
│  /admin/*     │     │     ├ /api/auth/*               │
└──────────────┘     │     ├ /api/cron/reminders        │
                     │     ├ /api/admin/*               │
                     │     └ /api/p/[simId]/port        │
                     └────────────┬────────────────────┘
                                  │ Prisma
                     ┌────────────▼────────────────────┐
                     │ Vercel Postgres (Neon)          │
                     └────────────▲────────────────────┘
                                  │
┌──────────────┐                  │
│ cron-job.org │ ─────────────────┘
│ 每小时 POST  │
└──────────────┘
                                  │
                     ┌────────────▼────────────────────┐
                     │ Server酱 API / Bark API          │
                     │ (按 user.channel 路由)          │
                     └─────────────────────────────────┘
```

## 5. 数据模型(Prisma schema)

```prisma
// sims: 号码库
model Sim {
  id              Int       @id @default(autoincrement())
  phoneNumber     String    @unique           // 完整号,如 07724215611(只存数字)
  activatedAt     DateTime                      // 激活日期(保号起算日)
  lastPortedAt    DateTime?                     // 上次保号日期,NULL = 还没保过号
  status          SimStatus @default(active)    // active / paused
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  user            User?
  reminders       ReminderSent[]

  @@index([phoneNumber])
  @@index([activatedAt, lastPortedAt])
}

enum SimStatus { active paused }

// users: 用户档案(每个用户对应一个 sim)
model User {
  id              Int       @id @default(autoincrement())
  phoneNumber     String    @unique           // 用户的手机号(用于登录)
  simId           Int       @unique           // 绑定的 SIM,1:1
  channel         Channel                      // serverchan / bark
  channelKey      String                       // SendKey 或 Bark URL,加密存储
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  sim             Sim      @relation(fields: [simId], references: [id])
  reminders       ReminderSent[]

  @@index([phoneNumber])
}

enum Channel { serverchan bark }

// reminders_sent: 发送日志(幂等保证)
model ReminderSent {
  id              Int       @id @default(autoincrement())
  userId          Int
  simId           Int
  dayOffset       Int                          // 提醒那天的 day_offset(170/178/179/180)
  bucket          Int                          // 0-indexed bucket(170天=0;179天=0..4;180天=0..9)
  sentAt          DateTime @default(now())     // 发送时间戳
  status          SendStatus @default(success) // success / failed
  errorMessage    String?

  user            User @relation(fields: [userId], references: [id])
  sim             Sim  @relation(fields: [simId], references: [id])

  @@unique([simId, dayOffset, bucket])  // 同号同日同 bucket 唯一 → 幂等
  @@index([sentAt])
}

enum SendStatus { success failed }

// settings: 系统设置(KV 表,单行)
model Setting {
  key             String   @id                // 如 "reminder_template"
  value           String                      // 模板字符串
  updatedAt       DateTime @updatedAt
}

// admin_sessions: 管理员会话(可选;或用 JWT 也行)
model AdminSession {
  id              String   @id @default(uuid())
  createdAt       DateTime @default(now())
  expiresAt       DateTime                     // 7 天后过期
}

// verification_codes: 验证码
model VerificationCode {
  id              Int       @id @default(autoincrement())
  phoneNumber     String
  code            String                       // 6 位数字
  channel         Channel
  channelKey      String                       // 验证码发送到的目标
  expiresAt       DateTime                     // 5 分钟过期
  used            Boolean   @default(false)
  createdAt       DateTime @default(now())

  @@index([phoneNumber, code])
}
```

**为什么把 `channelKey` 存数据库而不是环境变量?** 每个用户不同,环境变量只能放一个。

**存储安全**: `channelKey` 在数据库存原文,生产环境对数据库本身的访问做 Vercel Postgres 的访问控制即可。如果要更进一步,可用 Vercel 的加密环境变量加密应用层 — 但这是 nice-to-have,V1 不做。

### 5.1 模糊匹配规则(2026-06-21 补丁)

**输入规则**:
- 用户在 `/login` 输入 sim 号码,允许带空格、横线(如 `07724 215611` / `07724-215611` / `07724215611`)
- 服务端归一化:去所有非数字字符
- 提取后 6 位作为 `simLookupKey`(不足 6 位 → 拒绝,提示"号码至少 6 位")
- 长度 > 11 位的输入也接受(只取后 6 位即可匹配)

**匹配规则**:
- `SELECT * FROM sims WHERE RIGHT(phone_number, 6) = $1 LIMIT 1`,按 `created_at ASC` 取最早一条
- 匹配到 0 条:提示"未找到您的号码,请联系管理员添加"
- 匹配到 1 条:正常流程
- 匹配到多条(理论上 giffgaff 末 6 位不会撞):取 `id` 最小的;若 > 1 条则日志告警"末 6 位冲突,需管理员去重"

**User 模型调整**(原 spec 设计的 `User.phoneNumber` 字段去冗余):
- 移除 `User.phoneNumber`(避免和 `Sim.phoneNumber` 重复)
- 增加 `User.simLookupKey String`(冗余存后 6 位,用于反查 + 审计;不参与匹配查询)
- 用户的"手机号"完全由 `user.sim.phoneNumber` 表达

**API 字段调整**:
- `POST /api/auth/send-code` Body: `{ simNumber, channel, channelKey }`(原 `phoneNumber` 改 `simNumber`,语义更准)
- 服务端对 `simNumber` 做归一化 + 后 6 位匹配后,创建/查找 User 绑定到对应 sim

**UI 调整**:
- `/login` 输入框 placeholder: "请输入 giffgaff 号码,如 07724 215611"
- 可选:前端按 5+6 位格式自动加空格(纯展示,不影响提交的值)
- `/me` 页面:展示完整号(sim.phoneNumber),不展示后 6 位
- `/p/[simId]` 公开页:展示完整号(sim.phoneNumber)

## 6. API 路由清单

### 6.1 公开路由

| 方法 | 路径 | 说明 |
|---|---|---|
| GET  | `/` | 首页(简述功能 + 登录入口 + 管理入口 + FAQ 折叠区) |
| GET  | `/help/serverchan` | Sever酱 开通教程 |
| GET  | `/help/bark` | Bark 开通教程 |
| GET  | `/login` | 登录页 |
| POST | `/api/auth/login` | 无验证码登录。Body: `{ simNumber }`(后 6 位匹配 sim,自动创建/获取 user,种 session cookie) |
| POST | `/api/auth/test-push` | 测试推送(给 /me/settings 用,验证渠道 key 是否配对)。Body: `{ channel, channelKey }` |
| POST | `/api/auth/logout` | 登出 |
| POST | `/api/me/channel` | 更新当前用户通知渠道。Body: `{ channel, channelKey, verified }`(`verified=true` 表示客户端已用 test-push 验证过) |
| GET  | `/me` | 用户主页(需登录),展示绑定 sim + 操作。检测 channel 空时显示红色横幅引导 |
| GET  | `/me/settings` | 通知渠道设置页(需登录) |
| GET  | `/p/[simId]` | 保号时间更新页(公开),显示当前激活天数 + 日期选择器 |
| POST | `/api/p/[simId]/port` | 提交新保号日期。Body: `{ portedAt: "YYYY-MM-DD" }` |

### 6.2 管理员路由(全部需 admin session)

| 方法 | 路径 | 说明 |
|---|---|---|
| GET/POST | `/admin/login` | 登录页 / 处理登录 |
| GET  | `/admin` | 仪表盘(号码数、用户数、今日发送量) |
| GET  | `/admin/sims` | 号码列表 + 搜索 |
| GET/POST | `/admin/sims/new` | 新增单个号码 |
| GET/POST | `/admin/sims/[id]` | 编辑/删除 |
| POST | `/api/admin/sims/import` | CSV 导入 |
| GET  | `/admin/users` | 用户列表 |
| GET  | `/admin/reminders` | 提醒发送日志 |
| GET/POST | `/admin/settings` | 文案模板编辑 |

### 6.3 Cron 路由

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/api/cron/reminders` | 触发提醒扫描。需要 `Authorization: Bearer ${CRON_SECRET}` 头 |

## 7. 关键页面 UI(简述)

**总体设计原则**:移动端优先(主要在小屏访问),现代简洁风格(大圆角、柔和阴影、充足留白),Tailwind CSS 实现。配色以白底 + 一个主色(默认靛蓝 `#4F46E5`) + 灰色文本层级。

**断点策略**(Tailwind 默认):
- `< 640px`(sm 以下):移动端竖屏,单列布局,大按钮(高度 ≥ 44px)
- `≥ 768px`(md):平板 / 小桌面,登录页 / `/me` / `/p/[simId]` 单列居中(最大宽 `max-w-md`)
- `≥ 1024px`(lg):管理后台表格布局,侧边栏导航 + 主内容区

所有页面顶部 nav:左 Logo + 右 "登录 / 用户中心 / 退出"链接;管理后台有独立侧边栏(桌面) / 顶部汉堡菜单(移动)。

### 7.1 `/login`(2026-06-21 补丁 3 简化)
- **只填手机号** + 登录按钮
- 底部一行灰色提示:还没在系统里?请联系管理员把您的 giffgaff 号码录入号码库
- 服务端流程:后 6 位匹配 sim → 自动创建/获取 user → 登录成功
- 渠道设置在登录后到 `/me/settings` 引导设置

### 7.1.1 `/me/settings`(新增)
- 选 Sever酱 / Bark(卡片式选择)
- 填 SendKey / Bark URL
- "测试推送"按钮 → 调 `POST /api/auth/test-push` 验证
- 测试成功才能点"保存"(否则按钮 disabled + 提示)
- 保存调 `POST /api/me/channel` → 跳回 /me

### 7.2 `/me`(登录后)
- 顶部:"欢迎 {手机号末四位}"
- 卡片:我的号码 {完整手机号},激活于 {YYYY-MM-DD},已激活 {N} 天
- 按钮:"立即去保号"(跳到 `/p/{sim_id}`)
- 推送渠道:{Sever酱 / Bark}
- 按钮:"退出登录"

### 7.3 `/p/[simId]`(保号页,公开)
- 标题:Giffgaff 保号
- 显示:号码 {完整号} 激活于 {YYYY-MM-DD},今天已激活 **{N}** 天
- 日期选择器:label "新的保号日期"
  - 默认值:今天
  - 范围:今天 ~ 过去 7 天(含)— 允许补录最近未保号的日期;未来日期不允许
- "提交"按钮 → POST `/api/p/{sim_id}/port`
- 提交成功显示:"已记录新的保号日期,下次提醒将在 170 天后"

### 7.4 `/admin`(仪表盘)
- 4 张卡片:号码总数 / 用户数 / 今日发送数 / 失败数
- 最近 10 条发送日志

### 7.5 `/admin/sims`
- 搜索框(按手机号、状态)
- 表格:手机号 / 激活日期 / 上次保号日期 / 状态 / 绑定用户 / 操作(编辑/删除)
- 按钮:新增 / CSV 导入
- 移动端:表格横向滚动,操作列折叠为"⋯"菜单

### 7.6 `/admin/settings`
- 大文本框:提醒文案模板
- 变量说明(灰色提示):`{{phone}}` `{{days}}` `{{port_url}}`
- "保存"按钮 + "恢复默认"按钮

### 7.7 渠道开通教程(教程内容固定写在前端,Markdown 渲染)

**触发点**:`/login` 页面渠道选项旁的问号图标;`/me` 页面底部"如何更换推送渠道?"链接;`/` 首页 FAQ 区域。

**Sever酱 教程**(`/help/serverchan`):
1. 用微信扫码关注公众号"Server酱"(或访问官网 sct.ftqq.com)
2. 登录后点击"SendKey"菜单 → 复制你的 SendKey(以 `SCT` 开头的字符串)
3. 把这个 SendKey 粘贴到本系统登录页的"SendKey"输入框
4. 点击"发送验证码"测试 — 微信会立即收到一条测试消息

配图占位:每步一张截图(占位框,后续替换)

**Bark 教程**(`/help/bark`):
1. iOS 用户:在 App Store 搜索"Bark"下载(开发者:Finb)
   Android 用户:从 GitHub(github.com/finb/bark)下载 APK 安装
2. 打开 App,首页会显示一个 Bark 服务器地址 + 一串随机 key,例如 `https://api.day.app/abc123xyz`
3. 复制 App 里显示的完整 URL
4. 把这个 URL 粘贴到本系统登录页的"Bark URL"输入框
5. 点击"发送验证码"测试 — Bark 会立即推一条测试消息

**为什么固定在前端**:教程内容变动不频繁,Markdown 文件放仓库 `content/help/*.md`,避免每改教程都要发版的话可以走 ISR(Next.js `revalidate`)。

## 8. 默认提醒文案模板

存储于 `settings` 表 `key=reminder_template`:

```
【Giffgaff 保号提醒】您的号码 {{phone}} 已激活 {{days}} 天,该保号啦!
点击更新保号时间:{{port_url}}
```

- `{{phone}}` — 完整手机号
- `{{days}}` — 当前 day_offset
- `{{port_url}}` — `https://<VERCEL_DOMAIN>/p/<sim_id>`

管理员可在 `/admin/settings` 自由修改。

## 9. Cron 提醒引擎实现要点

```ts
// /api/cron/reminders 路由
export async function POST(req: Request) {
  // 1. 鉴权:检查 Bearer token === process.env.CRON_SECRET
  // 2. 计算当前 hourOfDay(UTC 0-23,按 Vercel 默认时区)
  // 3. 查所有 active sims,JOIN 它们的 user(只处理有 user 绑定的)
  // 4. 对每个 sim:
  //    a. baseline = sim.lastPortedAt ?? sim.activatedAt
  //    b. dayOffset = floor((now - baseline) / 1day)
  //    c. result = bucketForDay(dayOffset, hourOfDay)
  //    d. if result === null: skip
  //    e. 用 Prisma 做幂等:
  //         先 `findUnique({ simId, dayOffset, bucket })`,若存在 → skip
  //         否则 `create({ simId, dayOffset, bucket, status: success })`
  //         若 create 抛 P2002(并发)→ skip
  //    f. 如果 skipped: skip(已发过)
  //    g. 否则:渲染文案,调对应 channel 推送
  //    h. 如果推送失败:UPDATE status=failed, errorMessage=...
  // 5. 返回: { processed: N, sent: M, skipped: K, failed: F }
}
```

**并发安全**: Prisma 的 `@@unique([simId, dayOffset, bucket])` 配合 upsert / try-insert 保证幂等。

**时区处理**: 全部用 UTC 存储和计算。文案里展示日期时按浏览器本地时区(用 `toLocaleDateString`)。

## 10. CSV 导入格式

UTF-8,带表头,逗号分隔:

```
phone_number,activated_at
07724215611,2026-01-15
07724215612,2026-01-16
```

- `phone_number` — 只含数字(不含空格、横线、国家码)
- `activated_at` — `YYYY-MM-DD`
- 导入策略:同号存在则更新,不存在则插入
- 导入结果页:显示成功 / 失败行及原因

## 11. 错误处理

| 场景 | 行为 |
|---|---|
| Sever酱 / Bark 推送失败 | 写 `reminders_sent.status=failed`,记录 errorMessage,不影响其他号码 |
| 验证码过期 | 提示用户重新发送 |
| 验证码错误 | 通用提示"验证码错误",不区分"已使用/已过期/不匹配"避免泄漏状态 |
| Cron 鉴权失败 | 返回 401,不处理 |
| 用户填了不存在的手机号登录 | 不允许进入 `/me`,提示"未找到您的号码,请联系管理员" |
| 后 6 位匹配到多个 sim | 取 `id` 最小的一条;写告警日志让管理员去重;UI 给通用提示 |
| 保号页 simId 不存在 | 返回 404 |
| CSV 导入某行格式错 | 跳过该行,继续处理其他行,导入结果显示错误行号 + 原因 |

## 12. 部署与运维

### 12.1 环境变量(Vercel Dashboard 设置)

| 变量 | 说明 |
|---|---|
| `DATABASE_URL` | Vercel Postgres 连接串 |
| `CRON_SECRET` | Cron 路由 Bearer token,长随机字符串 |
| `ADMIN_USERNAME` | 管理员账号(默认 `admin`) |
| `ADMIN_PASSWORD_HASH` | 管理员密码 bcrypt 哈希 |
| `SESSION_SECRET` | Cookie 签名密钥 |
| `VERCEL_DOMAIN` | 用于拼接 port_url,默认用 `process.env.VERCEL_URL` |

### 12.2 外部 cron 配置

cron-job.org 创建任务:
- URL: `https://<your-app>.vercel.app/api/cron/reminders`
- Method: POST
- Headers: `Authorization: Bearer <CRON_SECRET>`
- 频率: 每 1 小时
- 超时: 30 秒

### 12.3 数据库迁移

`prisma migrate dev`(本地)+ `prisma migrate deploy`(生产 / Vercel build hook)

## 13. 测试策略

V1 阶段不强制 TDD,但每个核心模块要有最小可运行验证:

| 模块 | 验证方式 |
|---|---|
| `bucketForDay` 纯函数 | Vitest 单元测试,覆盖所有 dayOffset × hourOfDay 组合 |
| 提醒引擎 | 手动:用 seed 数据 + 临时把 `CRON_SECRET` 暴露到本地,手动调 API,检查 `reminders_sent` 记录 |
| CSV 导入 | 手动:上传 5 行 CSV,验证数据库 |
| 推送渠道 | 手动:用一个真实 Sever酱 / Bark key 测试一次完整推送 |
| 认证流程 | 手动:从登录到 `/me` 完整跑一遍 |

## 14. 风险与已知限制

1. **时区漂移**:bucket 用 UTC,中国大陆用户可能感觉"早上 8 点的提醒"实际是 UTC 0 点。V2 可考虑允许按用户时区。
2. **Sever酱 / Bark 限流**:两者都有频率限制。如果用户量大可能 429,需要加重试。
3. **Channel key 明文存储**:数据库泄露 = 用户 key 泄露。V2 加密层(用 `SESSION_SECRET` AES 加密)。
4. **单管理员账号**:不支持多人协作。V2 加 admin 表 + RBAC。
5. **CSV 大文件**:>1000 行可能 Vercel Serverless 超时(10s 默认)。V2 改 streaming 或迁出到单独 endpoint。

## 15. 范围之外(V2/V3)

- 多管理员协作 + 角色权限
- Channel key 加密存储
- 推送失败重试 / 退避
- 用户自助修改推送渠道
- 多语言(i18n)
- 报表导出
- 微信扫码登录(代替手机号验证码)
- 时区感知

## 16. 实施里程碑(V1 单次交付)

1. 项目脚手架 + Prisma + Vercel Postgres 联通
2. 数据模型 + migration
3. 公开页面:`/` `/login` `/me` `/p/[simId]` + 认证 API
4. 提醒引擎:`/api/cron/reminders` + bucket 计算 + 推送封装
5. 管理后台:`/admin/*` 全套 + CSV 导入 + 设置页
6. 外部 cron 接入 + README
7. 端到端冒烟测试

## 17. 部署形态变更(2026-06-21 补丁)

- **数据库**:不单独建 Neon 项目。Vercel 创建项目时直接挂载 **Neon Postgres 集成**,由 Vercel 自动注入 `DATABASE_URL` 环境变量。
- **本地开发**:从 Vercel 项目 → Settings → Environment Variables 复制 `DATABASE_URL` 到本地 `.env.local`(只用于本地开发,生产环境 Vercel 注入)。
- **环境变量管理**:全部在 Vercel Dashboard 配置,本地 `.env.local` 只用于开发。

---

**变更日志**
- 2026-06-21: 初稿
- 2026-06-21: 补丁 1 - 补加模糊匹配(后 6 位匹配 sim);调整 User 模型,移除 `phoneNumber`,增加 `simLookupKey`;调整登录 API Body 字段 `phoneNumber → simNumber`;补加部署形态(用 Vercel Neon 集成)
- 2026-06-21: 补丁 2 - 增加"测试推送"功能:登录页加"测试"按钮 + 新增 `POST /api/auth/test-push` API(纯验证渠道 key,不消耗验证码)+ 简单 IP 限流(30s/次)
- 2026-06-21: 补丁 3 - 登录流程简化:登录只填手机号(无验证码),channel 设置拆到独立的 `/me/settings` 页面;删除 `/api/auth/send-code` 和 `/api/auth/verify`,新增 `/api/auth/login` 和 `/api/me/channel`;推送文案 sim 号码改为显示后 4 位(隐私)