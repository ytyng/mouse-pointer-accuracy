#!/usr/bin/env bash
# Vercel ビルドスクリプト。private submodule (cyberneura/svelteutils) を
# GITHUB_PAT で安全に clone してから pnpm build を実行する。
#
# - GIT_ASKPASS で PAT を渡し、URL に埋め込まないことでログ漏洩を防ぐ。
# - frontend/ で build したあと .vercel/output を repo root に移動する
#   (Vercel Build Output API は repo root の .vercel/output を要求する)。
#
# 参考: https://retrorocket.biz/archives/vercel-private-git-submodules

# repo root に移動
cd "$(dirname "$0")/../../" || exit 1

set -e

if [ -z "${GITHUB_PAT}" ]; then
  echo "GITHUB_PAT が設定されていません。"
  echo "cyberneura-submodules トークンを再生成して、Vercel の環境変数に登録してください。"
  echo "  https://github.com/settings/tokens?type=beta"
  exit 1
fi

# GIT_ASKPASS でトークンを渡す (URL にトークンを含めない)
ASKPASS_SCRIPT="$(mktemp)"
trap 'rm -f "${ASKPASS_SCRIPT}"' EXIT
cat > "${ASKPASS_SCRIPT}" <<'SCRIPT'
#!/usr/bin/env bash
case "$1" in
  *Username*) echo "x-access-token" ;;
  *Password*) echo "${GITHUB_PAT}" ;;
  *) echo ;;
esac
SCRIPT
chmod 700 "${ASKPASS_SCRIPT}"
export GIT_ASKPASS="${ASKPASS_SCRIPT}"
export GIT_TERMINAL_PROMPT=0

# .gitmodules の URL は変えず、askpass 経由で認証
# --recursive で将来 svelteutils 側にネストした submodule が増えても対応する
git submodule sync --recursive
git submodule update --init --recursive

cd frontend
npx -y pnpm@10 install --frozen-lockfile
npx -y pnpm@10 run build

# Build Output API は repo root の .vercel/output/ を要求する
cd ..
mkdir -p .vercel
mv frontend/.vercel/output .vercel/output
