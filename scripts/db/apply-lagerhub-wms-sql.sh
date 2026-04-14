#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

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

DB_URL="${DIRECT_URL:-${DATABASE_URL_UNPOOLED:-${POSTGRES_URL_NON_POOLING:-${DATABASE_URL:-}}}}"

if [ -z "$DB_URL" ]; then
  echo "Missing DB URL. Set DIRECT_URL (preferred) or DATABASE_URL_UNPOOLED/POSTGRES_URL_NON_POOLING/DATABASE_URL." >&2
  exit 1
fi

if ! command -v psql >/dev/null 2>&1; then
  echo "psql not found. Install PostgreSQL client first." >&2
  exit 1
fi

echo "Applying LagerHub WMS SQL migrations to target database..."
psql "$DB_URL" -v ON_ERROR_STOP=1 -f "migrations/016_add_lagerhub_wms.sql"
psql "$DB_URL" -v ON_ERROR_STOP=1 -f "migrations/017_add_lagerhub_wms_rls.sql"
echo "Done."
