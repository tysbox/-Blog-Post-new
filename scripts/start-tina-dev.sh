#!/usr/bin/env bash

set -euo pipefail

repo_root="$(cd "$(dirname "$0")/.." && pwd)"
tina_port="${TINA_PUBLIC_PORT:-7777}"
astro_port="${ASTRO_DEV_PORT:-4321}"
datalayer_port="${TINA_DATALAYER_PORT:-9000}"

is_ready() {
  local url="$1"
  curl -sfI "$url" >/dev/null 2>&1
}

if is_ready "http://127.0.0.1:${tina_port}/graphql" && is_ready "http://127.0.0.1:${astro_port}/"; then
  echo "Blog-Post dev server is already running."
  echo "Site:  http://127.0.0.1:${astro_port}/"
  echo "Admin: http://127.0.0.1:${astro_port}/admin/index.html"
  exit 0
fi

for port in "$tina_port" "$astro_port" "$datalayer_port"; do
  if lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; then
    echo "Port $port is already in use, but the Blog-Post dev server is not healthy."
    echo "Stop the conflicting process and retry."
    exit 1
  fi
done

cd "$repo_root"
exec node ./scripts/start-tina-dev.mjs