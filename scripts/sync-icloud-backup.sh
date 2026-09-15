#!/usr/bin/env bash

set -euo pipefail

SOURCE_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TARGET_ROOT="${ICLOUD_BACKUP_DIR:-/Users/tystudio/Desktop/Blog-Post}"

mkdir -p "$TARGET_ROOT"

rm -rf \
  "$TARGET_ROOT/node_modules" \
  "$TARGET_ROOT/.astro" \
  "$TARGET_ROOT/dist" \
  "$TARGET_ROOT/admin" \
  "$TARGET_ROOT/public/admin"

rsync -a --delete \
  --exclude '.git' \
  --exclude 'node_modules' \
  --exclude '.astro' \
  --exclude 'dist' \
  --exclude '.DS_Store' \
  --exclude 'astro.log' \
  --exclude 'tina.log' \
  --exclude 'public/admin' \
  --exclude 'admin' \
  "$SOURCE_ROOT/" "$TARGET_ROOT/"

echo "Synced source backup to $TARGET_ROOT"