#!/usr/bin/env sh
set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$ROOT_DIR"
[ -f .env ] || { echo "[backup] 缺少 $ROOT_DIR/.env" >&2; exit 1; }

BACKUP_DIR=${BACKUP_DIR:-"$ROOT_DIR/backups"}
RETENTION_DAYS=${RETENTION_DAYS:-30}
STAMP=$(date +%Y%m%d-%H%M%S)
DB_FILE="$BACKUP_DIR/db-$STAMP.dump"
DB_TMP="$BACKUP_DIR/.db-$STAMP.dump.tmp"
UPLOADS_FILE="$BACKUP_DIR/uploads-$STAMP.tar.gz"
UPLOADS_TMP_NAME=".uploads-$STAMP.tar.gz.tmp"

umask 077
mkdir -p "$BACKUP_DIR"
cleanup() {
  rm -f -- "$DB_TMP" "$BACKUP_DIR/$UPLOADS_TMP_NAME"
}
trap cleanup EXIT HUP INT TERM

echo "[backup] PostgreSQL -> $DB_FILE"
docker compose exec -T postgres sh -c 'exec pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > "$DB_TMP"
[ -s "$DB_TMP" ] || { echo "[backup] 数据库备份为空" >&2; exit 1; }
mv -- "$DB_TMP" "$DB_FILE"

API_CONTAINER=$(docker compose ps -a -q api 2>/dev/null || true)
if [ -n "$API_CONTAINER" ]; then
  echo "[backup] uploads -> $UPLOADS_FILE"
  docker run --rm \
    --volumes-from "$API_CONTAINER" \
    -v "$BACKUP_DIR:/backup" \
    -e "BACKUP_FILE=$UPLOADS_TMP_NAME" \
    alpine:3.22 \
    sh -c 'set -eu; tar -czf "/backup/$BACKUP_FILE" -C /app uploads'
  [ -s "$BACKUP_DIR/$UPLOADS_TMP_NAME" ] || { echo "[backup] 媒体备份为空" >&2; exit 1; }
  mv -- "$BACKUP_DIR/$UPLOADS_TMP_NAME" "$UPLOADS_FILE"
else
  echo "[backup] 未找到 API 容器，已跳过媒体备份" >&2
fi

find "$BACKUP_DIR" -type f \( -name 'db-*.dump' -o -name 'uploads-*.tar.gz' \) -mtime "+$RETENTION_DAYS" -delete
trap - EXIT HUP INT TERM
echo "[backup] done"