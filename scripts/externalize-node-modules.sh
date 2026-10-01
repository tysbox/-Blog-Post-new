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

  # node_modules is a real directory (e.g. after npm ci) — move it to the cache
  # and replace it with a symlink.
  #
  # 注意: 旧実装はキャッシュが既に存在すると「実体を rm -rf してリンクを作る」
  # だけだったため、インストール済みの依存がすべて消えていた。
  # 実体をキャッシュへ移すか、キャッシュ側を正とするかを見分けて処理する。
  if [[ -d "$repo_node_modules" && ! -L "$repo_node_modules" ]]; then
    # キャッシュの親ディレクトリが未作成だと mv が失敗するため必ず用意する。
    mkdir -p "$cache_root"
    if [[ -n "$(ls -A "$external_node_modules" 2>/dev/null)" ]]; then
      # キャッシュに既に依存が入っている場合、実体を捨てると消える。
      # プロジェクト内の実体を破棄し、キャッシュ側を正とする。
      echo "node_modules link check: cache already populated, keeping cache" >&2
      rm -rf "$repo_node_modules"
      ln -s "$external_node_modules" "$repo_node_modules"
      echo "node_modules symlinked to cache: $external_node_modules"
      exit 0
    fi
    # キャッシュが空なので実体をそのまま移す（iCloud 同期対象から外れる）
    rmdir "$external_node_modules" 2>/dev/null || true
    mv "$repo_node_modules" "$external_node_modules"
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