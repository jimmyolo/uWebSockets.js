#!/usr/bin/env bash
# sync-fork.sh — sync upstream/master → origin/master，並把本地 master 一併 fast-forward
# 全程免 checkout，可在任意分支（例如 alma9-v2）上執行。

set -euo pipefail

UPSTREAM=${1:-upstream}
BRANCH=${2:-master}

echo "[1/3] Fetch $UPSTREAM..."
git fetch --no-tags "$UPSTREAM" "$BRANCH"

NEW_COMMITS=$(git log --oneline "origin/$BRANCH".."$UPSTREAM/$BRANCH")
if [ -n "$NEW_COMMITS" ]; then
  echo "發現新 commit："
  echo "$NEW_COMMITS"
  echo ""
  echo "[2/3] Push $UPSTREAM/$BRANCH → origin/$BRANCH..."
  git push origin "$UPSTREAM/$BRANCH:refs/heads/$BRANCH"
else
  echo "[2/3] upstream 無新 commit，origin/$BRANCH 已最新，略過 push。"
fi

# 把本地 master fast-forward 到 upstream/master（== 剛 push 上去的 origin/master）。
# ff-only：若本地 master 已偏離（non-ff），git 會報錯中止，不會 force。
echo ""
echo "[3/3] Fast-forward 本地 $BRANCH → $UPSTREAM/$BRANCH..."
CURRENT=$(git symbolic-ref --quiet --short HEAD || echo "")
if [ "$CURRENT" = "$BRANCH" ]; then
  git merge --ff-only "$UPSTREAM/$BRANCH"
else
  git fetch . "$UPSTREAM/$BRANCH:$BRANCH"
fi

echo ""
echo "=== 同步完成，HEAD：$(git log --oneline -1 "$BRANCH") ==="
