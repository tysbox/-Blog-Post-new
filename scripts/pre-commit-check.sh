#!/usr/bin/env bash
set -euo pipefail

CONVERTER="./scripts/convert-markdown-to-rich.mjs"
DUPLICATE_CHECKER="./scripts/check-node-modules-duplicates.sh"

if [ -f "$DUPLICATE_CHECKER" ]; then
  bash "$DUPLICATE_CHECKER"
fi

if [ ! -f "$CONVERTER" ]; then
  echo "Warning: $CONVERTER not found; skipping content normalization"
  exit 0
fi

# Run node converter with provided args
node "$CONVERTER" "$@"