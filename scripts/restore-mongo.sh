#!/usr/bin/env bash
# Restores a mongodump archive produced by scripts/backup-mongo.sh. DESTRUCTIVE to the target
# database by default (--drop) — always verify the archive/environment before running.
#
# Usage: ./scripts/restore-mongo.sh <path-to-archive.gz>
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <path-to-archive.gz>" >&2
  exit 1
fi

ARCHIVE_PATH="$1"

echo "[restore-mongo] restoring ${ARCHIVE_PATH} into the 'mongo' compose service (dropping existing collections)"
docker compose exec -T mongo mongorestore --archive --gzip --drop < "$ARCHIVE_PATH"

echo "[restore-mongo] done"
