# Day 0 · 域名 + 品牌名 占用自查清单

> 启动日 2026-05-10 · 目标用 15 分钟闭环
> 决策原则：第一个**所有列都空**的方案立刻拿下，别犹豫

## A. 域名候选 + 查询命令

| 域名 | 用途 | 年费参考 | 注册商首选 |
|---|---|---|---|
| `linkao.ai` | 主推（AI 项目天然标识） | $50-150 | Namecheap / Porkbun |
| `linkao.app` | 备选（Google 强制 HTTPS） | $14-20 | Namecheap |
| `linkao.cn` | 国内（需实名 + ICP 备案） | $5-10 | 阿里云 |
| `linkaoai.com` | 兜底 | $10 | Namecheap |
| `kaolin.ai` | 反向（万一前面全占） | $50 | Namecheap |

### 命令版（PowerShell）
```powershell
# DNS 看是否已解析
Resolve-DnsName linkao.ai 2>$null
Resolve-DnsName linkao.app 2>$null
Resolve-DnsName linkao.cn 2>$null

# whois 走在线，最快：
Start-Process "https://www.namecheap.com/domains/registration/results/?domain=linkao"
Start-Process "https://wanwang.aliyun.com/domain/searchresult?keyword=linkao"
```

### 一站式自查链接（直接点开）
- Namecheap: https://www.namecheap.com/domains/registration/results/?domain=linkao
- 阿里云万网: https://wanwang.aliyun.com/domain/searchresult?keyword=linkao
- Porkbun (.ai 便宜): https://porkbun.com/checkout/search?q=linkao

## B. 品牌名占用自查（5 分钟，按顺序刷）

| 平台 | 操作 | 看什么 |
|---|---|---|
| 微信 | 添加好友 → 公众号 → 搜"临考" | 是否有同名公众号 / 小程序 |
| 小红书 | APP 顶部搜"临考" → 用户/笔记/话题 三 tab 都看 | 是否有 1 万粉以上账号 |
| 抖音 | 搜"临考" → 用户 tab | 是否有蓝 V 或大号 |
| B 站 | 搜"临考" → 用户/视频 | 教培区是否有同名 UP |
| 知乎 | 搜"临考" → 用户 | 是否有大 V 占用 |
| 即刻 | 搜"临考" → 用户 | 创业圈占用 |

> 截图存档（命名 `临考-平台名-2026-05-10.png`），万一后期商标维权要用

## C. 商标查重（10 分钟·可选但推荐）

- 国家商标网: https://wsgg.sbj.cnipa.gov.cn/tmsve/
- 路径：综合查询 → 商标名称"临考" → 类别 **第 41 类（教育、培训）** + **第 42 类（科技服务）**
- 看是否有"临考"已注册或申请中
- 如果第 41 类已被占 → 启用备选名（见 D 节）

## D. 备选品牌（占用严重时启用，按好听度排序）

| 备选名 | 风格 | 使用场景 |
|---|---|---|
| 临考侠 | 二次元/亲切 | 主备选，占用低 |
| 临考通 | 工具感 | 中性安全 |
| 临考 AI | 直白 | SEO 友好 |
| 临考帮 | 社群感 | 后期做学习圈再启用 |
| 临考士 | 学院风 | 偏正式 |
| 临考道 | 知识感 | 备 |

## E. 决策表（填完再下单）

| 候选名 | 微信 | 小红书 | 抖音 | B站 | 知乎 | 即刻 | .ai | .app | .cn | 商标 41 类 | 决定 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 临考 | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | |
| 临考侠 | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | |
| 临考通 | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | |

> ✅ = 空着没人占；❌ = 已被占用
> 第一个全 ✅ 的，立刻在 Namecheap 下单 .ai 或 .app

## F. 最坏情况降级

- 三个名都占用严重 → 直接用 `linkaoai.com`，品牌名仍写"临考"，做内容时强调"我们叫临考，域名因为占用退一格"
- 这个降级不影响产品，反而是真实创业故事素材

## G. 完成判定（自检）

- [ ] 决策表至少 1 行全 ✅
- [ ] 主域名已下单（截图保存）
- [ ] 6 个平台搜索截图存档
- [ ] 商标 41 类查询截图（即使没下手注册也存证）
- [ ] 备选名顺序写入下方备忘

最终选定品牌：**临考 (Linkao)**
最终选定域名：**linkaoai.com**（.com 兜底，2026-05-10 晚已注册）
备选 fallback：临考侠 / liankaoai.com（如品牌后期被举报需切换）

> 注册商后台**今晚必做**（5 分钟）：
> - [ ] WHOIS Privacy 已开启（避免邮箱被爬）
> - [ ] 自动续费已开启（防止过期被抢）
> - [ ] Transfer Lock 已开启（防止社工转出）
