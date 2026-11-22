#!/usr/bin/env bash
set -euo pipefail

# Full backup via mongodump (read-only; does not modify the server).
#
# Optional: BACKUP_DATABASE=booking — dump only that database (matches server/src/db.ts).
#           Unset (default) — dump every database the DB_URL user can read (often several on dev clusters).

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${ENV_FILE:-$SCRIPT_DIR/../.env}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Error: env file not found: $ENV_FILE (set ENV_FILE to override)" >&2
  exit 1
fi

# shellcheck disable=SC2002
DB_URL="$(grep -m1 '^[[:space:]]*DB_URL[[:space:]]*=' "$ENV_FILE" | sed 's/^[[:space:]]*DB_URL[[:space:]]*=//' | tr -d '\r')"
DB_URL="${DB_URL#\"}"
DB_URL="${DB_URL%\"}"
DB_URL="${DB_URL#\'}"
DB_URL="${DB_URL%\'}"

if [[ -z "$DB_URL" ]]; then
  echo "Error: DB_URL is not set in ${ENV_FILE}" >&2
  exit 1
fi

if ! command -v mongodump >/dev/null 2>&1; then
  echo "Error: mongodump not found. Install MongoDB Database Tools (mongodb-database-tools)." >&2
  exit 1
fi

BACKUP_PATH="${SCRIPT_DIR}/backup_$(date +"%Y-%m-%d_%H-%M-%S")"

if [[ -n "${BACKUP_DATABASE:-}" ]]; then
  mongodump --uri "$DB_URL" --db "$BACKUP_DATABASE" --out "$BACKUP_PATH"
else
  mongodump --uri "$DB_URL" --out "$BACKUP_PATH"
fi

echo "Backup completed: $BACKUP_PATH"
