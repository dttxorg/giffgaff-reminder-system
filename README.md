# Giffgaff 报号提醒系统

> Giffgaff SIM 卡保号提醒服务。从激活第 170 天起开始推送,临报号截止日自动加频。

## 功能

- 用户用手机号(或后 6 位)登录,绑定 Sever酱 / Bark 推送渠道
- 报号时通过链接打开保号页,选日期提交即重新计时 170 天
- 管理员在后台维护号码库(增删改查、CSV 导入)、编辑提醒文案、查看发送日志
- 提醒规则:`170-177` 每天 1 次,`178` 每天 3 次,`179` 每天 5 次,`180` 每天 10 次,`>180` 停止
- 模糊匹配:用户输入 `07724 215611`(可带空格/横线),系统按后 6 位匹配 sim

## 技术栈

- **运行时**:Next.js 16 (App Router)
- **数据库**:Vercel Postgres (Neon)
- **ORM**:Prisma 7
- **推送**:Server酱 / Bark
- **定时调度**:外部 cron-job.org 每小时触发 `/api/cron/reminders`
- **认证**:自建 cookie session

## 项目结构

```
.
├── app/                     # Next.js App Router
│   ├── api/                 # API 路由
│   │   ├── auth/            # 用户登录：send-code / verify / logout
│   │   ├── p/[simId]/       # 保号页相关：GET 拿 sim 信息 / POST 提交保号
│   │   ├── admin/           # 管理后台 API
│   │   └── cron/reminders/  # cron 触发提醒
│   ├── admin/               # 管理后台页面
│   ├── login/               # 用户登录
│   ├── me/                  # 用户中心
│   ├── p/[simId]/           # 保号页(公开)
│   ├── help/{serverchan,bark}  # 渠道开通教程
│   ├── page.tsx             # 首页
│   └── layout.tsx           # 根布局
├── lib/                     # 工具层
│   ├── db.ts                # Prisma client 单例
│   ├── session.ts           # session 管理
│   ├── auth.ts              # 密码哈希、cron 鉴权
│   ├── bucket.ts            # 提醒规则计算
│   ├── channels.ts          # Sever酱 / Bark 推送
│   ├── template.ts          # 提醒文案模板渲染
│   ├── phone.ts             # 手机号归一化 + 模糊匹配
│   ├── reminder.ts          # 提醒扫描主逻辑
│   └── admin-guard.ts       # 管理员鉴权
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
| `DATABASE_URL` | 是 | Postgres 连接串(Vercel 集成自动注入) |
| `CRON_SECRET` | 是 | cron 路由 Bearer token(本地调试可省略) |
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
- `POST /api/auth/send-code` — 发送验证码(Body: `{ simNumber, channel, channelKey }`)
- `POST /api/auth/verify` — 校验验证码
- `POST /api/auth/logout` — 登出
- `GET /api/p/[simId]` — 拿 sim 信息(公开)
- `POST /api/p/[simId]/port` — 提交保号日期(Body: `{ portedAt: "YYYY-MM-DD" }`)

### 管理员(需登录)
- `POST /api/admin/auth/login` — 管理员登录
- `POST /api/admin/auth/logout` — 管理员登出
- `POST /api/admin/sims` — 新建/更新单个 sim
- `PATCH /api/admin/sims/[id]` — 更新 sim
- `DELETE /api/admin/sims/[id]` — 删除 sim
- `POST /api/admin/sims/import` — CSV 导入
- `POST /api/admin/settings` — 保存文案模板

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

## 常见问题

- **时区**:全部用 UTC 存储和计算,文案展示按浏览器本地时区
- **CSV 导入**:首行可带表头 `phone_number,activated_at`,UTF-8 编码
- **删除 sim**:会级联删除 user 和 reminders_sent
- **渠道 key 加密**:V1 明文存数据库,V2 加 AES 加密

## License

Private
