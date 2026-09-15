#!/usr/bin/env bash

set -euo pipefail

repo_root="$(cd "$(dirname "$0")/.." && pwd)"
repo_name="$(basename "$repo_root")"
cache_root="${HOME}/Library/Caches/com.tystudio/${repo_name}"
external_node_modules="${cache_root}/node_modules"
restore_mode="${1:-}"
repo_node_modules="${repo_root}/node_modules"

if [[ "$restore_mode" == "--ensure-link" ]]; then
  if [[ -L "$repo_node_modules" ]]; then
    echo "node_modules link check: OK"
    exit 0
  fi

  if [[ ! -e "$repo_node_modules" && -d "$external_node_modules" ]]; then
    ln -s "$external_node_modules" "$repo_node_modules"
    echo "restored node_modules symlink to $external_node_modules"
    exit 0
  fi

  # node_modules is a real directory (e.g. after npm ci) — symlink or move to cache
  if [[ -d "$repo_node_modules" && ! -L "$repo_node_modules" ]]; then
    mkdir -p "$cache_root"
    if [[ -d "$external_node_modules" ]]; then
      # Cache already exists — just remove the real dir and symlink to cache (fast)
      rm -rf "$repo_node_modules"
    else
      # No cache — move real dir to cache (slow, first time only)
      mv "$repo_node_modules" "$external_node_modules"
    fi
    ln -s "$external_node_modules" "$repo_node_modules"
    echo "node_modules symlinked to cache: $external_node_modules"
    exit 0
  fi

  echo "node_modules link check: no repair needed"
  exit 0
fi

if [[ "$restore_mode" == "--restore" ]]; then
  if [[ ! -L "$repo_node_modules" ]]; then
    echo "node_modules is already local"
    exit 0
  fi

  target="$(readlink "$repo_node_modules")"
  rm "$repo_node_modules"

  if [[ -d "$target" ]]; then
    mv "$target" "$repo_node_modules"
    rmdir "${cache_root}" 2>/dev/null || true
    echo "restored node_modules to $repo_node_modules"
    exit 0
  fi

  mkdir -p "$repo_node_modules"
  echo "restored empty node_modules to ${repo_root}/node_modules"
  exit 0
fi

mkdir -p "$cache_root"

if [[ -L "${repo_root}/node_modules" ]]; then
  echo "node_modules already points outside the repo"
  echo "target: $(readlink "${repo_root}/node_modules")"
  exit 0
fi

if [[ -e "$external_node_modules" ]]; then
  echo "external target already exists: $external_node_modules"
  echo "remove it or run npm run deps:localize first"
  exit 1
fi

if [[ -d "${repo_root}/node_modules" ]]; then
  mv "${repo_root}/node_modules" "$external_node_modules"
else
  mkdir -p "$external_node_modules"
fi

ln -s "$external_node_modules" "${repo_root}/node_modules"

echo "node_modules now lives at $external_node_modules"
echo "repo symlink: ${repo_root}/node_modules"