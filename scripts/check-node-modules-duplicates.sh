#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NODE_MODULES_DIR="${1:-$ROOT_DIR/node_modules}"

if [ ! -d "$NODE_MODULES_DIR" ]; then
  echo "node_modules duplicate check: skipped ($NODE_MODULES_DIR not found)"
  exit 0
fi

DUPLICATES="$(find "$NODE_MODULES_DIR" -maxdepth 1 -type d \( -name '* 2' -o -name '* 3' \) | sort)"

if [ -z "$DUPLICATES" ]; then
  echo "node_modules duplicate check: OK"
  exit 0
fi

echo "Found duplicated dependency directories in $NODE_MODULES_DIR:"
printf '%s\n' "$DUPLICATES"
echo
echo "Clean reinstall recommended:"
echo "  rm -rf node_modules .astro dist"
echo "  npm ci"
exit 1