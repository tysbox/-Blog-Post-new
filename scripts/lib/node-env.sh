#!/usr/bin/env bash
#
# 起動スクリプト共通の下準備（source して使う）。
#
#   - 色つきログ関数（bold / info / warn / fail）
#   - Finder 起動時の PATH 補完
#   - .nvmrc に合う Node の解決（nvm → volta → 取得 の順）
#
# 実行後、呼び出し側は次の変数を利用できる:
#   REQUIRED_NODE … .nvmrc のバージョン（"v" なし。空なら未指定）
#   CURRENT_NODE  … 現在の node -v（未インストールなら "未インストール"）
#
# 前提: 呼び出し側で `set -uo pipefail` と REPO_ROOT の cd を済ませておくこと。

bold() { printf '\033[1m%s\033[0m\n' "$*"; }
info() { printf '  \033[36m•\033[0m %s\n' "$*"; }
warn() { printf '  \033[33m!\033[0m %s\n' "$*"; }
fail() { printf '  \033[31m✗\033[0m %s\n' "$*" >&2; }

# ---------------------------------------------------------------------------
# Finder 起動時の PATH 補完
#   Finder から .command を起動すると PATH が最小（/usr/bin:/bin:...）になり、
#   ~/.local/bin や /opt/homebrew/bin が無く node / npm が見つからない。
#   既存のパスを壊さない形で、この端末で node を置いている典型的な場所を足す。
# ---------------------------------------------------------------------------
for _dir in \
  "${HOME}/.local/bin" \
  "${HOME}/.volta/bin" \
  "/opt/homebrew/bin" \
  "/usr/local/bin"
do
  if [ -d "${_dir}" ]; then
    case ":${PATH}:" in
      *":${_dir}:"*) : ;;
      *) PATH="${_dir}:${PATH}" ;;
    esac
  fi
done
export PATH

# ---------------------------------------------------------------------------
# Node.js を .nvmrc に合わせる（nvm → volta → 既存 の順に解決）
#   グローバル設定は一切変更しない。PATH 上で該当バージョンの node を見つけ、
#   見つからなければ取得を試みる。
# ---------------------------------------------------------------------------
export NVM_DIR="${NVM_DIR:-${HOME}/.nvm}"

REQUIRED_NODE=""
[ -f .nvmrc ] && REQUIRED_NODE="$(tr -d '[:space:]' < .nvmrc)"
REQUIRED_NODE="${REQUIRED_NODE#v}"

node_major_minor() {
  # v22.23.3 -> 22.23（engines 相当の判定に使う）
  [ "$1" = '未インストール' ] && return 1
  echo "${1#v}" | cut -d. -f1,2
}

# --- nvm があれば読み込み、該当バージョンを有効化する
NVM_ACTIVE=0
if [ -s "${NVM_DIR}/nvm.sh" ]; then
  # shellcheck disable=SC1091
  . "${NVM_DIR}/nvm.sh" >/dev/null 2>&1 || true
  if [ -n "${REQUIRED_NODE}" ]; then
    if ! nvm use "${REQUIRED_NODE}" >/dev/null 2>&1; then
      info "Node v${REQUIRED_NODE} をインストールします（初回のみ）…"
      nvm install "${REQUIRED_NODE}" >/dev/null 2>&1 || true
      nvm use "${REQUIRED_NODE}" >/dev/null 2>&1 && NVM_ACTIVE=1
    else
      NVM_ACTIVE=1
    fi
  fi
fi

# --- nvm で解決できなかった場合は volta のツールチェーンを直接たどる
#   volta の既定 runtime は変更せず、必要なバージョンの実体パスを PATH に足す。
#   実体ディレクトリ名には "v" プレフィックスが付きません（例: 22.23.3）。
#   ※ volta のシム（~/.volta/bin/node）は既定バージョンを返すため、
#     実体パスを必ず PATH の先頭に置く必要があります。
if [ "${NVM_ACTIVE}" -eq 0 ] && [ -n "${REQUIRED_NODE}" ]; then
  for _volta_root in "${VOLTA_HOME:-${HOME}/.volta}" "${HOME}/.volta"; do
    _volta_bin="${_volta_root}/tools/image/node/${REQUIRED_NODE}/bin"
    if [ -x "${_volta_bin}/node" ]; then
      # シムより前に実体を置く（シムは pinned 設定に従って解決するため）
      PATH="${_volta_bin}:${PATH}"
      export PATH
      hash -r 2>/dev/null || true
      break
    fi
  done
fi

# --- それでも一致しなければ取得を試みる（volta があれば install する）
if [ -n "${REQUIRED_NODE}" ] && [ "$(node -v 2>/dev/null || echo '')" != "v${REQUIRED_NODE}" ]; then
  if command -v volta >/dev/null 2>&1; then
    info "Node v${REQUIRED_NODE} を取得します（初回のみ）…"
    volta install "node@${REQUIRED_NODE}" >/dev/null 2>&1 || true
    _volta_bin="${VOLTA_HOME:-${HOME}/.volta}/tools/image/node/${REQUIRED_NODE}/bin"
    if [ -x "${_volta_bin}/node" ]; then
      PATH="${_volta_bin}:${PATH}"
      export PATH
      hash -r 2>/dev/null || true
    fi
  fi
fi

CURRENT_NODE="$(node -v 2>/dev/null || echo '未インストール')"
info "Node: ${CURRENT_NODE}"

if [ "${CURRENT_NODE}" = '未インストール' ]; then
  fail "Node.js が見つかりません。Node をインストールしてから再実行してください。"
  exit 1
fi
