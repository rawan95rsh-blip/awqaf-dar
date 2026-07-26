#!/usr/bin/env bash
# نفق HTTPS مؤقت إلى الـ API المحلي على المنفذ 8000
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BIN="$ROOT/.tools/cloudflared"

if [[ ! -x "$BIN" ]]; then
  echo "cloudflared غير موجود. حمّليه إلى .tools/cloudflared"
  exit 1
fi

if ! curl -sf "http://127.0.0.1:8000/api/health" >/dev/null; then
  echo "الباك اند غير شغّال على :8000 — شغّلي: cd backend && npm start"
  exit 1
fi

echo "بدء نفق Cloudflare… انسخي الرابط https://….trycloudflare.com إلى eas.json إن تغيّر"
exec "$BIN" tunnel --url "http://127.0.0.1:8000" --no-autoupdate
