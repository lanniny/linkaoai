# Day 1 三件事 · 2026-05-11（周一）

> 投入上限：6 小时（含休息）
> 红线：21:00 关电脑，不卷过夜

---

## 上午 · 9:00-12:00（3h） — 4 个账号 全打齐（域名昨晚已搞定 ✓）

> 域名：`linkaoai.com` 已于 2026-05-10 晚注册。今早只剩账号注册。

| 时段 | 任务 | 完成判定 |
|---|---|---|
| 9:00-9:30 | 注册商后台加固：WHOIS Privacy + 自动续费 + Transfer Lock 三开；GitHub 私库 `linkao`（空仓+2FA） | WHOIS Privacy ON；私库 dashboard 可见；2FA 已绑 |
| 9:30-10:30 | Anthropic Console：注册 → 充值 $20 → 创建 Workspace `linkao` → 创建 API Key（命名 `linkao-dev-server`）| API Key 测试通过：PowerShell 调 `https://api.anthropic.com/v1/messages` 返回 200 |
| 10:30-11:30 | Supabase（GitHub 登录）→ Project `linkao`（Singapore）→ 拿 anon/service key + URL + bucket `course-files`；Vercel（GitHub 登录）→ 个人账户 | 三个 dashboard 都能进；本地 `.env.local` 装好 4 套凭据 |
| 11:30-12:00 | 验证：写一个 30 行 Node 脚本，依次 ping 4 个 API（Anthropic messages / Supabase auth.getUser / Vercel team / GitHub user）| 4 个 API 全 200 回 |

**Cut-off**: 12:00 前 4 个 ✓ 必须打齐。打不齐的，下午 14:00 前必须补完，否则今天延后。

---

## 下午 · 14:00-17:00（3h） — Next.js 14 脚手架 + Claude PDF→大纲 跑通

| 时段 | 任务 | 完成判定 |
|---|---|---|
| 14:00-14:30 | `pnpm create next-app@latest linkao --typescript --tailwind --app --no-src-dir --import-alias "@/*"` | 本地 `pnpm dev` 起来看到 Next.js 默认页 |
| 14:30-15:30 | 装依赖：`pnpm add @anthropic-ai/sdk @supabase/supabase-js @supabase/auth-helpers-nextjs zod`；初始化 shadcn/ui：`pnpm dlx shadcn@latest init` 选 default theme | `pnpm dev` 还能启动；`components.json` 存在 |
| 15:30-16:30 | 写 `app/api/extract/route.ts`：接收 multipart/form-data PDF → 调 Claude（PDF native upload）→ 返回 JSON `{topics: [{title, level: "必考"\|"重点"\|"了解", explanation}]}` | curl 一份小 PDF 上传，返回结构化 JSON |
| 16:30-17:00 | 用 1 份**真实高数课件 PDF**（自己课件就行）跑一遍，把 JSON 截图存证 | 大纲 ≥ 5 个知识点，三级标签都出现 |

**Cut-off**: 17:00 必须看到 Claude 返回的 JSON 大纲。看不到 → 卡在哪写 issue 到私库，明早第一件事修。

---

## 晚上 · 20:00-21:00（1h，软目标）— 部署 + 第一条小红书素材

| 时段 | 任务 | 完成判定 |
|---|---|---|
| 20:00-20:30 | `git push`，Vercel 一键 import → 部署 preview，绑 Vercel 子域 `linkao-xxx.vercel.app`；环境变量同步进 Vercel | 线上 URL 能访问，`/api/extract` 线上也能跑 |
| 20:30-21:00 | 录 60 秒视频："Day 1 完成 PDF→大纲" — 屏幕录制 + 自己旁白；存为草稿，不发（攒到周末批量发）| 视频文件 ≥ 30s，截了 3 张关键帧 |

**Cut-off**: 21:00 关电脑。这 1h 是 buffer，下午没干完可以补，干完了就早睡。

---

## Day 1 整体验收（睡前 5 分钟自检）

- [ ] 主域名已下单
- [ ] Anthropic / Supabase / Vercel / GitHub 4 个账号全部可用
- [ ] linkao 私库有 ≥ 1 commit（脚手架）
- [ ] `/api/extract` 能跑通"PDF→大纲 JSON"
- [ ] Vercel preview URL 能打开（软目标，未达成不算失败）
- [ ] 总投入 ≤ 6 小时
- [ ] 21:00 已关电脑

---

## 红线提醒

- 上午装环境时遇到坑（Node 版本/pnpm/PowerShell 权限）→ 直接换 Cursor 内置终端 + WSL，别死磕原生 PowerShell
- 域名下单别图便宜搞奇葩注册商，Namecheap / 阿里云 二选一
- API Key 千万别 commit 进 git（脚手架第一步：`.env.local` 加进 `.gitignore`，已是 Next.js 默认，但要肉眼确认）
- Claude PDF native 一次最大约 32 MB，超大课件先切分
- 今天写不出 Day 2 代码可以，但今天**必须证明 PDF→Claude→大纲链路可行**，否则方向就要重新想

---

## 如果今天卡住

不用焦虑，写一行到 `outputs/journal/2026-05-11-blockers.md`：
- 卡在哪一步
- 错误信息
- 已经试过什么

我（AI）明天直接续上排雷。**不要为了"完成"硬撑过 21:00。**
