# Giffgaff 保号提醒系统

> Giffgaff SIM 卡保号提醒服务。从激活第 170 天起开始推送,临保号截止日自动加频。

## 功能

- 用户用手机号(或后 6 位)登录,绑定 Sever酱 / Bark / pushplus / Telegram 4 种推送渠道
- 保号时通过链接打开保号页,选日期提交即重新计时 170 天
- 管理员在后台维护号码库(增删改查、CSV 导入)、编辑提醒文案、查看发送日志
- 提醒规则:`170-177` 每天 1 次,`178` 每天 3 次,`179` 每天 5 次,`180` 每天 10 次,`>180` 停止
- 模糊匹配:用户输入 `07724 215611`(可带空格/横线),系统按后 6 位匹配 sim

## 技术栈

- **运行时**:Next.js 16 (App Router)
- **数据库**:Vercel Postgres (Neon)
- **ORM**:Prisma 7
- **推送**:Server酱 / Bark / pushplus / Telegram Bot
- **定时调度**:外部 cron-job.org 每小时触发 `/api/cron/reminders`
- **认证**:scrypt 密码哈希(失败 5 次锁 15 分钟)+ cookie session

## 项目结构

```
.
├── app/                     # Next.js App Router
│   ├── api/                 # API 路由
│   │   ├── auth/            # 用户登录：send-code / verify / logout
│   │   ├── p/[simId]/       # 保号页相关：GET 拿 sim 信息 / POST 提交保号
│   │   ├── admin/           # 管理后台 API
│   │   └── cron/reminders/  # cron 触发提醒
│   ├── admin/               # 管理后台页面(sidebar + breadcrumb)
│   │   ├── _components/     # NavIcon / AdminStat / Pagination / MobileAdminNav
│   │   ├── cards/           # 卡密管理(生成 + 列表 + 分页)
│   │   ├── sims/            # 号码管理(增删改查 + CSV 导入/导出)
│   │   ├── users/           # 用户管理(详情页 + 删除危险操作)
│   │   ├── reminders/       # 提醒日志(分页 + 重发 + UTC+上海双显示)
│   │   ├── settings/        # 文案模板设置(实时预览)
│   │   └── login/           # 管理员登录(顶部 context bar 避免孤岛)
│   ├── login/               # 用户登录(tab 切换"我有账号 / 我有卡密")
│   ├── me/                  # 用户中心(进度条 + 推送样例)
│   │   ├── settings/        # 用户设置(改渠道 / 改密码 / 改激活日期)
│   │   ├── _components/     # DayOffsetProgress / ChannelKeyReveal / CopyPhoneButton / CopyPortLinkButton
│   ├── redeem/              # 卡密兑换(自动登录 + 引导设置渠道)
│   ├── p/[simId]/           # 保号页(公开,token 不可枚举)
│   ├── help/                # 渠道开通教程(4 channel + 索引)
│   ├── page.tsx             # 首页
│   ├── not-found.tsx        # 根 404
│   └── layout.tsx           # 根布局(skip-to-content + 顶栏)
├── lib/                     # 工具层
│   ├── db.ts                # Prisma client 单例
│   ├── auth.ts              # scrypt 密码哈希 + cron secret 校验
│   ├── session.ts           # cookie session 管理
│   ├── admin-guard.ts       # 管理员鉴权
│   ├── admin-bootstrap.ts   # 首次启动自动创建默认 admin 账号
│   ├── bucket.ts            # 提醒规则计算(day → bucket 分布)
│   ├── channels.ts          # 4 渠道推送实现 + sendPush router
│   ├── template.ts          # 提醒文案模板渲染
│   ├── phone.ts             # 手机号归一化 + 模糊匹配
│   ├── card-key.ts          # 卡密生成 + 归一化 + 格式化输入
│   ├── password-gen.ts      # CSPRNG 安全密码生成
│   ├── password-strength.ts # 密码强度评分(弱/中/强)
│   ├── port-token.ts        # 32 字符 url-safe 不可枚举 token
│   ├── port-token-db.ts     # token DB 持久化 + lazy-backfill
│   ├── date.ts              # 日期工具(相对时间 / UTC+上海)
│   ├── reminder.ts          # 提醒扫描主逻辑(cron 调用)
│   ├── redeem.ts            # 卡密兑换事务(创建 sim + user + 标记已用)
│   └── template.test.ts     # 业务测试(可在无 DB 环境跑)
├── prisma/
│   ├── schema.prisma        # 数据模型
│   └── migrations/          # 数据库迁移
├── content/help/            # 渠道开通教程(Markdown)
├── docs/superpowers/specs/  # 设计文档
└── README.md
```

## 部署到 Vercel(生产)

### 1. 准备 GitHub 仓库

把代码推到 GitHub(参见下文"本地开发")。本项目已在 `dttxorg/giffgaff-reminder-system`。

### 2. 在 Vercel 创建项目

1. 打开 [vercel.com/new](https://vercel.com/new)
2. 选 "Import Git Repository" → 选 `dttxorg/giffgaff-reminder-system`
3. Framework Preset 自动识别 "Next.js"
4. **关键步骤:在 "Storage" 区域点击 "Create Database" → 选 "Postgres" → Region 选离你近的(如 Singapore)**
   - Vercel 会自动创建 Neon 项目并注入 `DATABASE_URL` 环境变量
5. 手动添加其他环境变量:
   - `CRON_SECRET`:一段长随机字符串,例 `openssl rand -hex 32`
   - **`PUBLIC_BASE_URL`**:`https://baohao.681218.xyz`(你绑定的自定义域名,**强烈推荐设置** — 不设的话推送里给客户的保号链接会变成 `*.vercel.app`,看起来不像你的产品)
   - `ADMIN_USERNAME`:管理员账号(默认 `admin`,生产建议改)
   - `ADMIN_PASSWORD`:管理员密码(首次访问 `/admin/login` 时会用这个密码自动建账号,生产必改)

### 3. 部署

点 Deploy。Vercel 会自动跑:
- `npm install`(触发 `postinstall` 跑 `prisma generate`)
- `npm run build`(包含 `prisma migrate deploy` 跑数据库迁移)
- 部署到 Vercel Edge

**首次部署如果 migration 失败**:检查 Storage 区域是否已创建 Postgres,以及 `DATABASE_URL` 是否已注入。

### 4. 跑 seed(可选,创建测试数据 + 默认管理员)

部署完成后,在 Vercel 项目 → Settings → Functions → 找 `prisma/seed.ts`,或者用本地 Vercel CLI:

```bash
# 拉 Vercel 环境变量到本地
npx vercel env pull .env.production
# 跑 seed
DATABASE_URL='<从 .env.production 读>' npm run db:seed
```

或者直接在 Vercel 创建一个临时 Function exec 入口跑 seed。本项目 V1 可以不跑 seed,直接到 `/admin/login` 用环境变量 `ADMIN_USERNAME` / `ADMIN_PASSWORD` 登录即可(代码会自动建管理员)。

### 5. 配置外部 cron

在 [cron-job.org](https://cron-job.org) 创建任务:
- URL: `https://<your-app>.vercel.app/api/cron/reminders`
- Method: `POST`
- Headers: `Authorization: Bearer <CRON_SECRET>`
- 频率: 每 1 小时

## 本地开发

### 准备

```bash
npm install
```

### 配置 .env

从 Vercel 项目 → Settings → Environment Variables 复制 `DATABASE_URL` 到本地 `.env`(Prisma 7 用 `prisma.config.ts` 读取,不需要 .env.local)。

```bash
DATABASE_URL='postgresql://...'
CRON_SECRET='dev-local-secret'  # 本地可省略,代码会用 dev 默认值
```

### 初始化数据库

```bash
npx prisma migrate dev --name init
npx prisma generate
```

### 启动

```bash
npm run dev
```

打开 http://localhost:3000

## 环境变量

| 变量 | 必填 | 说明 |
|---|---|---|
| `DATABASE_URL` | 是 | Postgres 连接串。fallback 顺序: `DATABASE_URL` → `POSTGRES_PRISMA_URL` → `POSTGRES_URL` → `POSTGRES_URL_NON_POOLING`(Vercel Neon 集成自动注入 `POSTGRES_PRISMA_URL`) |
| `CRON_SECRET` | 是 | cron 路由 Bearer token(本地调试可省略) |
| `PUBLIC_BASE_URL` | **强烈推荐** | 推送给用户的保号链接域名,例 `https://baohao.681218.xyz`。不设会 fallback 到 Vercel 默认域名 `*.vercel.app` |
| `ADMIN_USERNAME` | 否 | 管理员账号(默认 `admin`) |
| `ADMIN_PASSWORD` | 否 | 管理员密码(默认 `admin123`,生产必改) |

## 提醒规则(冻结)

以"激活日期"或"上次保号日期"为基准,计算 `dayOffset = 今天 - 基准日期`:

| dayOffset | 当天发送次数 | 分布 |
|---|---|---|
| 0-169 | 0 次(不提醒) | — |
| 170-177 | 1 次 | 24h 内一次 |
| 178 | 3 次 | 3 个 8h 窗口 |
| 179 | 5 次 | 5 个 4.8h 窗口 |
| 180 | 10 次 | 10 个 2.4h 窗口 |
| >180 | 0 次(停止) | — |

桶(bucket)由 hourOfDay 决定,`reminders_sent` 表用 `@@unique([simId, dayOffset, bucket])` 保证幂等。

详细设计见 [docs/superpowers/specs/2026-06-21-giffgaff-reminder-system-design.md](docs/superpowers/specs/2026-06-21-giffgaff-reminder-system-design.md)

## API 概览

### 公开
- `POST /api/auth/login` — 账号密码登录(Body: `{ simNumber, password }`)
- `POST /api/auth/logout` — 登出
- `GET /api/p/[simId]` — 拿 sim 信息(公开,simId 是 token 或老 int id)
- `POST /api/p/[simId]/port` — 提交保号日期(Body: `{ portedAt: "YYYY-MM-DD" }`)
- `POST /api/redeem/preview?code=XXX` — 校验卡密(公开预览)
- `POST /api/redeem` — 卡密兑换(Body: `{ code, phoneNumber, activatedAt, password }`)

### 客户端(需用户 session)
- `POST /api/me/channel` — 改通知渠道 + key
- `POST /api/me/password` — 改密码(Body: `{ oldPassword, newPassword }`)
- `PATCH /api/me/sim` — 改激活日期(Body: `{ activatedAt }`)

### 管理员(需 admin session)
- `POST /api/admin/auth/login` — 管理员登录
- `POST /api/admin/auth/logout` — 管理员登出
- `GET/POST /api/admin/sims` — 列表 / 新建
- `PATCH /api/admin/sims/[id]` — 更新 sim
- `DELETE /api/admin/sims/[id]` — 删除 sim(级联)
- `GET /api/admin/sims/export` — 导出 CSV
- `POST /api/admin/sims/import` — CSV 导入
- `GET/POST /api/admin/cards` — 卡密列表 / 生成
- `DELETE /api/admin/cards/[id]` — 删除卡密
- `GET /api/admin/cards/export` — 导出 CSV
- `GET /api/admin/users` — 用户列表(分页 + 筛选)
- `DELETE /api/admin/users/[id]` — 删除用户
- `GET /api/admin/users/export` — 导出 CSV
- `GET/POST /api/admin/settings` — 文案模板 GET / 保存

### Cron
- `POST /api/cron/reminders` — 触发提醒扫描(需 `Authorization: Bearer ${CRON_SECRET}`)

## 推送渠道

### Sever酱
1. 微信扫码关注「Server酱」公众号(或访问 [sct.ftqq.com](https://sct.ftqq.com))
2. 登录后复制 SendKey(以 `SCT` 开头)
3. 在本系统登录页选 Sever酱,粘贴 SendKey

### Bark
1. iOS App Store 搜 "Bark" 下载 / Android 从 [finb/bark](https://github.com/finb/bark) 装 APK
2. 打开 App,首页会显示一个 Bark URL
3. 在本系统登录页选 Bark,粘贴完整 URL

### pushplus
1. 微信扫码关注「pushplus 推送加」公众号(或访问 [pushplus.plus](https://www.pushplus.plus))
2. 登录后复制 token(进 pushplus 控制台 → 一对一推送 → token)
3. 在本系统登录页选 pushplus,粘贴 token
4. **注意**:pushplus 实名认证需平台收费,新用户建议选 Sever酱 或 Telegram

### Telegram Bot
1. 在 Telegram 里找 [@BotFather](https://t.me/BotFather),发 `/newbot` 创建 bot,拿到 botToken
2. 给你的 bot 发任意消息(激活对话),然后用 [@userinfobot](https://t.me/userinfobot) 或 `getUpdates` API 拿 chatId
3. 在本系统登录页选 Telegram,粘贴 `botToken|chatId`(中间竖线分隔,无空格)
4. **注意**:需要能访问 Telegram(国内可能需要代理)

## 常见问题

- **时区**:全部用 UTC 存储和计算,文案展示按浏览器本地时区(管理员端额外显示上海时间)
- **CSV 导入**:首行可带表头 `phone_number,activated_at`,UTF-8 编码
- **删除 sim**:会级联删除 user 和 reminders_sent(注意:channel key 不会删)
- **保号链接**:公开 `/p/{token}` 用了 32 字符不可枚举 token(老 sim lazy-backfill),防止 `/p/1` `/p/2` 这种可枚举 URL 泄露手机号
- **保号提醒触发**:在已激活(或上次保号) 170-180 天窗口期,cron 每小时扫一次,按 day→bucket 分布发(170-172: 1 次/天,180: 10 次/天)

## 开发工作流

### 添加新推送渠道

1. 在 `lib/channels.ts` 加 `sendXxx()` 异步函数,返回 `{ ok, errorMessage? }`
2. 在 `sendPush` router 里加分支
3. `prisma/schema.prisma` 的 `Channel` enum 加值
4. 跑 `npx prisma migrate dev` 改 DB
5. 创建 `app/help/xxx/page.tsx` 教程页(参考 bark/pushplus)
6. 在 `/help` 索引页加新 channel
7. 在 `/me/settings` 的 channel grid 加按钮

### 添加新管理后台页

1. 创建 `app/admin/xxx/page.tsx`(server component)
2. 用 `requireAdmin()` 鉴权
3. 用 `<AdminStat>` / `<EmptyState>` / `<Pagination>` 共享组件
4. 加 `app/admin/_components/breadcrumb.tsx` LABELS 加新页

### 提交前自检

```bash
npx tsc --noEmit         # 类型
npx eslint .            # lint(自动 fix: --fix)
npx vitest run          # 630 测试
npx next build --webpack  # 完整构建
git diff --stat         # 确认改动范围
git status             # 确认没漏掉新文件
```

### 代码风格

- 客户端组件:`"use client"` 开头,文件名 `_components/` 下划线前缀
- 共享组件:`app/_components/` 或 `app/admin/_components/`
- 纯函数工具:`lib/`,优先写单元测试在 `tests/`
- 不用 emoji(用 SVG `<svg>`);不用全角标点;ASCII 优先
- 危险操作(改激活日期、删除用户)必加二次确认 modal

## 测试

业务逻辑 + UI 组件覆盖,Vitest,共 630 测试:

```bash
npm test              # 跑全部
npx vitest run        # 跑全部(单次)
npx vitest run tests/channels.test.ts  # 单文件
```

测试组织:

- `tests/*.test.ts` — 纯业务逻辑(node 环境)
  - `bucket.test.ts`:提醒规则(170-180 各 day 的 bucket 分布)
  - `card-key.test.ts`:卡密生成 / 归一化 / 格式化输入
  - `channels.test.ts`:4 渠道推送实现(Sever酱 / Bark / pushplus / Telegram)
  - `date.test.ts`:本地日期 / UTC+上海双显示
  - `password-gen.test.ts` / `password-strength.test.ts`:安全密码生成 + 强度评分
  - `password.test.ts`:scrypt 密码哈希 + checkCronAuth + generateId / VerificationCode
  - `phone.test.ts`:手机号归一化 + 后 6 位匹配
  - `port-token.test.ts`:32 字符 url-safe token + looksLikeToken
  - `redeem.test.ts`:parseDate / isValidPhone 纯函数
  - `template.test.ts`:renderTemplate + portUrl
  - `day-offset-progress.test.ts`:progressFor 6 段映射函数
- `tests/client/*.test.tsx` — 客户端组件(jsdom 环境)
  - 用户页面:LoginPage / AdminLoginPage / HomePage
  - 用户中心:DayOffsetProgress 组件 / ChannelKeyReveal
  - 管理后台:MobileAdminNav / admin-login 顶部 context bar
  - 通用组件:PasswordInput / CopyCodeButton / ResendButton / NavIcon / SkipToContent / Spinner / ExternalLink / EmptyState
  - 业务组件:DeleteUserButton / channel banner / SimsBulkTable / SettingsForm / CopyPhoneButton / CopyPortLinkButton / HelpPagination / PushPreviewCopyButton
  - 路由级:port-page P6 redirect / /help 索引页

## License

Private
