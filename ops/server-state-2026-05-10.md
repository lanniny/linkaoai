# 服务器状态快照 · 2026-05-10

> 154.219.123.195 · Ubuntu 24.04.1 LTS · 4 vCPU / 3.8 GB RAM / 29 GB SSD
> 多租户：WAI 乡村平台（已运行 27h+）+ Linkao 临考（今晚 bootstrap）

## 连接方式（仅密钥）

```powershell
# Windows + ssh skill (已配置 alias `wai-195`)
ssh wai-195                              # 走 key auth (id_ed25519_514)
python ~/.claude/skills/ssh/scripts/ssh_execute.py wai-195 "<command>"

# 或原生 ssh
ssh -i ~/.ssh/id_ed25519_514 root@154.219.123.195
ssh -i ~/.ssh/id_ed25519_514 linkao@154.219.123.195   # 应用用户
```

## 安全加固（Phase A，2026-05-10 13:50-13:57 完成）

| 项 | 状态 |
|---|---|
| SSH 公钥 | `id_ed25519_514` 已部署到 `/root/.ssh/authorized_keys` 和 `/home/linkao/.ssh/authorized_keys` |
| `PubkeyAuthentication` | ✅ yes |
| `PasswordAuthentication` | ✅ no |
| `KbdInteractiveAuthentication` | ✅ no |
| `PermitRootLogin` | ✅ without-password (key-only for root) |
| `MaxAuthTries` | ✅ 3 |
| `LoginGraceTime` | ✅ 30s |
| Root 密码 | ✅ Locked（`passwd -l`，泄露的密码已无效）|
| fail2ban | ✅ active，sshd jail，bantime 24h，maxretry 3 |
| ufw | ✅ active，22/80/443 open |
| sshd 配置位置 | `/etc/ssh/sshd_config.d/00-linkao-pubkey.conf`（drop-in，可单独删回滚）|

## 应用运行环境（Phase B，2026-05-10 13:57-14:01 完成）

### 用户

```
root   uid=0     /root           /bin/bash    (key-only, 仅运维用)
linkao uid=1000  /home/linkao    /bin/bash    (sudo 组成员，应用日常用户)
```

### 工具链（root 和 linkao 各装一份）

| 软件 | 版本 | 路径 |
|---|---|---|
| Node | v22.22.2 LTS | `~/.nvm/versions/node/v22.22.2/bin/node` |
| nvm | 0.40.3 | `~/.nvm/nvm.sh` |
| npm | 10.9.7 | `~/.nvm/.../bin/npm` |
| pnpm | 11.0.9 | `~/.nvm/.../bin/pnpm` |
| pm2 | 7.0.1 | `~/.nvm/.../bin/pm2` |

> linkao 用户的 login shell 已配置 `~/.profile` 自动 source nvm，`bash -lc` 可正常找到 node/pnpm/pm2

### Linkao 应用目录

```
/opt/linkao              # 归 linkao:linkao 所有，应用代码部署目录（暂空）
/home/linkao/.pm2        # PM2 daemon 数据
/home/linkao/.npm        # npm cache
```

### PM2 systemd 服务

```
unit:    /etc/systemd/system/pm2-linkao.service
status:  enabled (开机自启), inactive (没app所以未活)
启动后:  pm2 save  ← linkao 用户跑一次，让重启自动恢复进程列表
sudo:    /etc/sudoers.d/linkao-pm2 给 linkao 配了 NOPASSWD reload/restart/status pm2-linkao
```

## 多租户隔离（与 WAI 共存）

| 资源 | WAI（已存在）| Linkao（待开）|
|---|---|---|
| 域名 | younishenhao.cn | linkaoai.com |
| 反向代理 vhost | nginx :80 + :443 | 待加 server block |
| 应用进程 | Docker（LibreChat-API + Mongo + Meilisearch + pgvector + RAG）| PM2-linkao（Next.js 单进程）|
| 应用端口（内部）| 127.0.0.1:3080 | 127.0.0.1:3000（待用）|
| 应用目录 | `/opt/wai` | `/opt/linkao` |
| 进程拥有者 | docker-managed | linkao 用户 |
| **资源占用** | ~1.3 GB RAM (已用) | 预计 +0.3-0.5 GB RAM |

> 互不影响；nginx 配置文件互不重叠；端口不冲突。

## Phase C 待办（Day 7 部署当天再做）

1. **DNS** — 在域名注册商后台加 A 记录 `linkaoai.com → 154.219.123.195`（包括 `www` 子域）。等 5-30 分钟全球生效。
2. **nginx vhost** — 加一个 server block（HTTP→HTTPS 重定向 + reverse_proxy `127.0.0.1:3000`）：
   ```nginx
   # /etc/nginx/sites-available/linkaoai.conf
   server {
       listen 80;
       server_name linkaoai.com www.linkaoai.com;
       location / {
           proxy_pass http://127.0.0.1:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```
3. **HTTPS** — `certbot --nginx -d linkaoai.com -d www.linkaoai.com`（前提 DNS 已生效）
4. **首次部署脚本** — `/opt/linkao/deploy.sh`：
   ```bash
   #!/bin/bash
   set -e
   cd /opt/linkao
   git pull
   pnpm install --frozen-lockfile
   pnpm build
   pm2 reload ecosystem.config.cjs --update-env || pm2 start ecosystem.config.cjs
   pm2 save
   ```

## 攻击面留意（fail2ban 当前已 ban 的 IP）

```
45.148.10.141  2.57.122.190  2.57.122.196  2.57.122.194  176.65.139.55
```

> fail2ban 状态：`fail2ban-client status sshd`
> 日志：`journalctl -u fail2ban -n 100`

## 紧急恢复方案

如果不慎把自己锁出去（比如改 sshd 配错重启）：
1. 登 VPS 厂商 web console（不走 SSH）
2. 在 web console 跑 `passwd root`（root 密码已 Lock，需先 `passwd -u root` 解锁再改）
3. 或者 `rm /etc/ssh/sshd_config.d/00-linkao-pubkey.conf && systemctl reload ssh` 退回密码登录
4. 重新部署 SSH key

> 备用 ssh key 路径：`C:\Users\16643\.ssh\id_ed25519_514`（私钥）/ `id_ed25519_514.pub`（公钥）
