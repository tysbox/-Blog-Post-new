#!/usr/bin/env bash
#
# Finder からダブルクリックしてカルタ / 用語集のスプレッドシート型エディタを
# 開始するための入口。実体は scripts/start-sheet.sh にあります（変更はそちらへ）。
#
# ブラウザは自動で開きません。既に開いているタブを再読込して使ってください。
#
# 終了コードが 0 でなければ、メッセージを読めるようウィンドウを保持します。
#
# Finder から起動した場合は PATH が最小になり、node / npm が見つからない
# ことがあります。start-sheet.sh 側で補完するため、ここでは何もしません。
#
cd "$(dirname "$0")" || exit 1

LOG_FILE="${TMPDIR:-/tmp}/blog-post-sheet.log"

bash ./scripts/start-sheet.sh
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
