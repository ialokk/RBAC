#!/usr/bin/env bash
# MongoDB backup — Version 1 strategy: host-level cron calling `mongodump` inside the running
# `mongo` container, archiving to a local (or mounted network/object-storage) directory. No
# additional backup infrastructure/service (docs/DEPLOYMENT.md §"Database backup strategy").
#
# Usage: ./scripts/backup-mongo.sh [output-dir]
# Schedule via host crontab, e.g. nightly at 2am:
#   0 2 * * * /path/to/repo/scripts/backup-mongo.sh /var/backups/rbac-mongo >> /var/log/rbac-mongo-backup.log 2>&1
set -euo pipefail

OUTPUT_DIR="${1:-./backups}"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
ARCHIVE_NAME="rbac-mongo-${TIMESTAMP}.gz"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"

mkdir -p "$OUTPUT_DIR"

echo "[backup-mongo] dumping database via the 'mongo' compose service -> ${OUTPUT_DIR}/${ARCHIVE_NAME}"
docker compose exec -T mongo mongodump --archive --gzip --db=rbac_food_delivery > "${OUTPUT_DIR}/${ARCHIVE_NAME}"

echo "[backup-mongo] pruning archives older than ${RETENTION_DAYS} days in ${OUTPUT_DIR}"
find "$OUTPUT_DIR" -name 'rbac-mongo-*.gz' -mtime "+${RETENTION_DAYS}" -delete

echo "[backup-mongo] done: ${ARCHIVE_NAME}"
