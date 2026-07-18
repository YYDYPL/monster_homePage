#!/usr/bin/env sh
set -eu

if [ "$#" -ne 1 ]; then
  echo "用法: $0 backups/uploads-YYYYmmdd-HHMMSS.tar.gz" >&2
  exit 1
fi

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
INPUT=$1
[ -f "$INPUT" ] || { echo "备份文件不存在: $INPUT" >&2; exit 1; }
ARCHIVE_DIR=$(CDPATH= cd -- "$(dirname -- "$INPUT")" && pwd)
ARCHIVE_NAME=$(basename -- "$INPUT")
ARCHIVE_FILE="$ARCHIVE_DIR/$ARCHIVE_NAME"
[ -s "$ARCHIVE_FILE" ] || { echo "备份文件为空: $ARCHIVE_FILE" >&2; exit 1; }
cd "$ROOT_DIR"
[ -f .env ] || { echo "缺少 $ROOT_DIR/.env" >&2; exit 1; }

API_CONTAINER=$(docker compose ps -a -q api 2>/dev/null || true)
[ -n "$API_CONTAINER" ] || { echo "未找到 API 容器，无法定位 uploads volume" >&2; exit 1; }

printf "将替换当前全部媒体文件。请输入 RESTORE 确认: "
read -r answer
[ "$answer" = "RESTORE" ] || exit 1

echo "[restore] validating archive"
docker run --rm -v "$ARCHIVE_DIR:/backup:ro" -e "ARCHIVE_NAME=$ARCHIVE_NAME" alpine:3.22 sh -c '
  set -eu
  tar -tzf "/backup/$ARCHIVE_NAME" | awk '\''
    /^\// || /(^|\/)\.\.($|\/)/ { bad=1 }
    $0 !~ /^uploads(\/|$)/ { bad=1 }
    END { exit bad ? 1 : 0 }
  '\''
'

echo "[restore] stopping api"
docker compose stop api

echo "[restore] replacing uploads"
if ! docker run --rm \
  --volumes-from "$API_CONTAINER" \
  -v "$ARCHIVE_DIR:/backup:ro" \
  -e "ARCHIVE_NAME=$ARCHIVE_NAME" \
  alpine:3.22 \
  sh -c 'set -eu; mkdir -p /app/uploads; find /app/uploads -mindepth 1 -maxdepth 1 -exec rm -rf -- {} +; tar -xzf "/backup/$ARCHIVE_NAME" -C /app'; then
  echo "[restore] 媒体恢复失败，API 将保持停止，请检查 uploads volume 后手动处理" >&2
  exit 1
fi

docker compose up -d api
echo "[restore] done"