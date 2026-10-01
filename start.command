#!/usr/bin/env bash
#
# Finder からダブルクリックして編集セッションを開始するための入口。
# 実体は scripts/start-editing.sh にあります（変更はそちらへ）。
#
# 終了コードが 0 でなければ、メッセージを読めるようウィンドウを保持します。
#
# Finder から起動した場合は PATH が最小になり、node / npm が見つからない
# ことがあります。start-editing.sh 側で補完するため、ここでは何もしません。
# 失敗した場合はトラブルシューティングが容易도록、
# 終了コードとログファイルのパスを表示します。
#
cd "$(dirname "$0")" || exit 1

LOG_FILE="${TMPDIR:-/tmp}/blog-post-start.log"

bash ./scripts/start-editing.sh
status=$?

if [ "$status" -ne 0 ]; then
  {
    echo
    echo "問題が発生しました（終了コード: ${status}）。"
    echo "詳細ログ: ${LOG_FILE}"
  } | tee -a "${LOG_FILE}"

  printf 'Enter キーで閉じる…'
  read -r _
else
  rm -f "${LOG_FILE}" 2>/dev/null || true
fi

exit "$status"
