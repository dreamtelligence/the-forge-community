#!/usr/bin/env bash
set -euo pipefail

load_env_file() {
  local env_file="$1"
  if [ -f "$env_file" ]; then
    set -a
    # shellcheck disable=SC1090
    . "$env_file"
    set +a
  fi
}

load_env_file ".env.local"
load_env_file ".env"

if [ -z "${DIRECT_URL:-}" ] && [ -n "${DATABASE_URL_UNPOOLED:-}" ]; then
  export DIRECT_URL="${DATABASE_URL_UNPOOLED}"
fi

if [ -z "${DIRECT_URL:-}" ] && [ -n "${POSTGRES_URL_NON_POOLING:-}" ]; then
  export DIRECT_URL="${POSTGRES_URL_NON_POOLING}"
fi

if [ -z "${DIRECT_URL:-}" ]; then
  echo "Missing DIRECT_URL (unpooled). Set DIRECT_URL or DATABASE_URL_UNPOOLED/POSTGRES_URL_NON_POOLING." >&2
  exit 1
fi

echo "Running migrations with DIRECT_URL (unpooled)..."
npx prisma migrate deploy
