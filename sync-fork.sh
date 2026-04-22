#!/usr/bin/env bash
# sync-fork.sh — equivalent to GitHub "Sync fork" button
# Merges upstream/master into origin/master

set -euo pipefail

UPSTREAM=${1:-upstream}
BRANCH=${2:-master}

CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "$BRANCH" ]; then
  echo "[1/5] 切換到 $BRANCH 分支（目前：$CURRENT_BRANCH）..."
  git checkout "$BRANCH"
else
  echo "[1/5] 目前已在 $BRANCH 分支"
fi

echo "[2/5] Fetch $UPSTREAM..."
git fetch "$UPSTREAM"

echo "[3/5] Pull origin/$BRANCH..."
git pull origin "$BRANCH"

NEW_COMMITS=$(git log --oneline "$BRANCH".."$UPSTREAM/$BRANCH")
if [ -z "$NEW_COMMITS" ]; then
  echo "已是最新版本，無需同步。"
  exit 0
fi

echo "發現新 commit："
echo "$NEW_COMMITS"
echo ""

echo "[4/5] Merge $UPSTREAM/$BRANCH (fast-forward only)..."
git merge --ff-only "$UPSTREAM/$BRANCH"

echo "[5/5] Push 到 origin/$BRANCH..."
git push origin "$BRANCH"

echo ""
echo "=== 同步完成，HEAD：$(git rev-parse --short HEAD) ==="
