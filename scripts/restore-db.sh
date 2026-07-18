#!/usr/bin/env sh
set -eu

if [ "$#" -ne 1 ]; then
  echo "用法: $0 backups/db-YYYYmmdd-HHMMSS.dump" >&2
  exit 1
fi

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
INPUT=$1
[ -f "$INPUT" ] || { echo "备份文件不存在: $INPUT" >&2; exit 1; }
DUMP_FILE=$(CDPATH= cd -- "$(dirname -- "$INPUT")" && pwd)/$(basename -- "$INPUT")
[ -s "$DUMP_FILE" ] || { echo "备份文件为空: $DUMP_FILE" >&2; exit 1; }
cd "$ROOT_DIR"
[ -f .env ] || { echo "缺少 $ROOT_DIR/.env" >&2; exit 1; }

printf "将停止 Web/API、重建 public schema 并恢复数据库。请输入 RESTORE 确认: "
read -r answer
[ "$answer" = "RESTORE" ] || exit 1

echo "[restore] stopping web and api"
docker compose stop web api

echo "[restore] recreating public schema"
docker compose exec -T postgres sh -c 'exec psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public AUTHORIZATION CURRENT_USER;"'

echo "[restore] restoring $DUMP_FILE"
if ! cat "$DUMP_FILE" | docker compose exec -T postgres sh -c 'exec pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner --exit-on-error'; then
  echo "[restore] 恢复失败，Web/API 将保持停止，请检查数据库状态后手动处理" >&2
  exit 1
fi

echo "[restore] starting api, web and caddy"
docker compose up -d api web caddy
echo "[restore] done"