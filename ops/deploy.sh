#!/usr/bin/env bash
# Linkao one-shot redeploy: local push + server pull/install/build/restart + probe.
# Run from anywhere; uses MSYS_NO_PATHCONV + Windows-style python path so it works
# from a git-bash terminal on the founder's Windows dev box.
#
# Usage:  ./ops/deploy.sh
# Or:     bash ops/deploy.sh

set -euo pipefail

SSH_PY="C:/Users/16643/.claude/skills/ssh/scripts/ssh_execute.py"
ALIAS="wai-195"

echo "→ 1/4  push to GitHub origin/main"
git push origin main

echo ""
echo "→ 2/4  pull + install + production build on wai-195"
python "$SSH_PY" "$ALIAS" "sudo -u linkao -H bash -lc 'cd /opt/linkao && git pull origin main && HUSKY=0 pnpm install --frozen-lockfile --ignore-scripts && HUSKY=0 NODE_ENV=production pnpm build 2>&1 | tail -8'"

echo ""
echo "→ 3/4  pm2 restart + sanity probe localhost:3001"
python "$SSH_PY" "$ALIAS" "sudo -u linkao -H bash -lc 'pm2 restart linkao && sleep 2 && pm2 list | tail -5 && curl -sI --max-time 10 http://127.0.0.1:3001/ | head -3'"

echo ""
echo "→ 4/4  external HTTPS probe through Cloudflare"
curl -sI --max-time 15 https://linkaoai.com/ | head -6

echo ""
echo "✅ Deploy complete. Open https://linkaoai.com to verify."
