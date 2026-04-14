#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

MIGRATION_NAME=${1:-platform_finance}

# Load env files if present
if [ -f .env.local ]; then
  set -a
  . ./.env.local
  set +a
fi
if [ -f .env ]; then
  set -a
  . ./.env
  set +a
fi

# Prefer unpooled for migrations
if [ -z "${DATABASE_URL_UNPOOLED:-}" ] && [ -n "${POSTGRES_URL_NON_POOLING:-}" ]; then
  export DATABASE_URL_UNPOOLED="$POSTGRES_URL_NON_POOLING"
fi

# Show host only (no secrets)
python3 - <<'PY'
import os
from urllib.parse import urlparse
url = os.environ.get("DATABASE_URL_UNPOOLED") or os.environ.get("DATABASE_URL")
if not url:
    print("DB host: (missing)")
else:
    p = urlparse(url)
    print(f"DB host: {p.hostname}")
PY

attempts=5
for i in $(seq 1 $attempts); do
  echo "Attempt $i/$attempts: prisma migrate dev -n $MIGRATION_NAME"
  if npx prisma migrate dev -n "$MIGRATION_NAME"; then
    echo "Migration complete."
    exit 0
  fi
  echo "Retrying in 4s..."
  sleep 4
done

echo "Migration failed after $attempts attempts."
exit 1
