# Day 0 · 账号注册前置 + 操作手册

> 用法：今晚 30 分钟内打齐 6 项物资，明早开始走流程
> 红线：仅用 **官方 API（api.anthropic.com / api.openai.com）**，不用任何中转/代理/转售

---

## 0. 物资清单（先全准备好，别边注册边找）

- [ ] **邮箱**：Gmail 1 个（避免国内邮箱与 Anthropic/Supabase/Vercel 兼容问题）
- [ ] **手机号**：能收 SMS（用于 2FA、Anthropic 验证）
- [ ] **信用卡**：Visa / Mastercard 双币卡，能跑国际订阅
  - 没有的话 → 申请 1 张虚拟卡（如某些国内银行的 Mastercard 虚拟卡），或者用支付宝绑定的境外信用卡
- [ ] **USD 预算**：$20（约 ¥150）— 用于 Anthropic 首充
- [ ] **2FA App**：Authy / Google Authenticator / 1Password 任一
- [ ] **密码管理器**：1Password / Bitwarden / 浏览器内置 — 一定不要用同一密码

## 1. GitHub（5 分钟）

- 网址：https://github.com/signup
- 用户名建议：`linkao-dev` 或个人 username（Vercel 会读 GitHub）
- 创建私库 `linkao`（先空仓，Day 1 推脚手架）
- **必开 2FA**（用 2FA App 扫二维码）
- 生成一个 PAT（Personal Access Token）备用：Settings → Developer settings → Tokens (classic) → 勾选 `repo` `workflow`，命名 `linkao-deploy`，记到 1Password

## 2. Anthropic Console（10 分钟）

- 网址：https://console.anthropic.com/
- 登录后路径：**Plans & Billing** → Add Credit → **$20**
- 创建 Workspace `linkao`（用于隔离支出）
- 创建 API Key：命名 `linkao-dev-server`，**只放在服务器侧**（Next.js API Routes / Vercel env），不进客户端
- 测试 API Key（PowerShell）：
  ```powershell
  $headers = @{ "x-api-key" = "$env:ANTHROPIC_API_KEY"; "anthropic-version" = "2023-06-01"; "content-type" = "application/json" }
  $body = '{"model":"claude-haiku-4-5-20251001","max_tokens":50,"messages":[{"role":"user","content":"hi"}]}'
  Invoke-RestMethod -Uri https://api.anthropic.com/v1/messages -Method Post -Headers $headers -Body $body
  ```
  返回 `content`/`stop_reason` 即成功

### 模型选型（MVP 推荐）

| 用途 | 模型 | 成本量级 | 何时用 |
|---|---|---|---|
| 课件 PDF → 大纲 | `claude-opus-4-7` | 高 | 复杂、长文本、首次解析 |
| 出题（批量） | `claude-haiku-4-5-20251001` | 低（约 1/10 Opus） | 大批量生成多选/填空/计算题 |
| 答题批改（标准题） | `claude-haiku-4-5-20251001` | 低 | 简单批改 + 讲解 |
| 答题批改（证明题） | `claude-opus-4-7` | 高 | 复杂逻辑判断 |

> 原始方案里的 `gpt-4o-mini` MVP 期可以**先不接**，用 Haiku 4.5 替代。少一个 SDK 维护，等 Haiku 真不够用了再加 OpenAI。

## 3. Supabase（10 分钟）

- 网址：https://supabase.com/dashboard/sign-in（**用 GitHub 登录最快**）
- 创建 Project：
  - 名称：`linkao`
  - 区域：**Singapore**（亚洲延迟最低）
  - 数据库密码：1Password 生成 + 保存
- 拿 4 个值（Project Settings → API）：
  - Project URL
  - `anon` public key
  - `service_role` secret key（**仅服务端用**）
- Storage → 新建 bucket `course-files`（**Private**，权限 RLS 后面 Day 1 写）

## 4. Vercel（5 分钟）

- 网址：https://vercel.com/signup（GitHub 登录）
- Personal account 即可（免费 Hobby plan 足够 MVP）
- **暂不导入项目**，等 Day 1 下午脚手架 push 到 GitHub 再 Import
- 提前看一眼：Settings → Environment Variables（Day 1 部署时把 6 个 env 全填进来）

## 5. 域名（参考 day0-domain-account-checklist.md 决策表）

- 决策完毕后立即下单（推荐 Namecheap，5 分钟搞定）
- 国内 .cn 走阿里云（需实名 + 后续 ICP 备案，备案约 5-15 天，**不要为了等备案拖慢上线**，先 .ai/.app 起步）

---

## 配套 .env.example（已生成在仓库根）

参见 [.env.example](../.env.example)。

**红线再次重申**：
- 端点白名单：`api.anthropic.com` / `api.openai.com`
- key 不进 git（`.env*` 已在 `.gitignore`）
- key 进 Vercel Environment Variables（Settings → Environment Variables，三环境 Production/Preview/Development 都填）
- 月支出预警：Anthropic 单日 ≥ $5 触发自查（Console → Usage & Limits 设 alert）

### 学术诚信红线词清单（产品 UI / 文案 / 代码 一律不出现）

> 下列词汇用中点（·）做了隔断处理，便于 lint/grep 识别为示例而非真实出现。**实际产品文案、代码注释、营销文案中不允许出现以下词汇的任何完整形式：**

- 代·写（替写作业 / 替考类暗示）
- 作·弊（含同义近义如"考·试·作·弊"）
- 包·过（绝对结果承诺）
- 保·过（同上）
- 100%·通过（绝对结果承诺）
- 替·考 / 替·答 / 找·人·考 等替代主语类
- 改·分 / 改·成·绩 等系统性违规

### CI / 提交守门（Day 1 起设置）

- pre-commit hook 扫描全仓库（除 `ops/day0-account-prerequisite.md` 自身），任一词汇完整出现 → block commit
- 实现：`pnpm dlx husky init` + `lint-staged` 跑自定义脚本 `scripts/check-banned-words.mjs`
- 例外白名单：本文件（红线清单页本身）+ 内部 compliance 文档（如有，统一放 `ops/compliance-*.md`）

---

## 完成判定（Day 0 自检）

- [ ] 6 项物资齐
- [ ] GitHub 私库 `linkao` 已建（2FA 已开）
- [ ] Anthropic API Key 已测通过 200
- [ ] Supabase Project + bucket `course-files` 已建
- [ ] Vercel 账号已建
- [ ] 域名已下单 OR 决定明早下单

5 个 ✅ = Day 0 闭环。

---

## 我能为你做什么 / 你必须自己做什么

| 我（AI）能产出 | 必须你亲手做 |
|---|---|
| 所有命令、脚本、文档、文案 | 实际登录注册（手机号/邮箱属于你） |
| `.env.example` 模板 | 信用卡支付（Anthropic 首充 $20） |
| API 测试 curl/PowerShell 命令 | 物理打印承诺书 + 拍照存档 |
| Day 1 脚手架代码（明天我开干） | 朋友圈 / 社交渠道发文（账号属于你） |
| Bug 排查、架构决策 | 商标查重 + 域名下单的实际操作 |

我不能代替你在 Anthropic 充钱，你不能代替我写代码。各司其职。
