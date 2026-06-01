Sync upstream/master into origin/master, and fast-forward local master to match — the GitHub "Sync fork" equivalent, without leaving your current branch.

Run these in order and stop immediately if any command fails:

1. `git fetch --no-tags upstream master` — only upstream master; do not sync other branches or tags
2. Check for new upstream commits: `git log --oneline origin/master..upstream/master`
   - If the output is empty, upstream brought nothing new — skip step 3.
3. Push upstream → origin server-side (no checkout): `git push origin upstream/master:refs/heads/master`
4. Fast-forward local master to upstream (no checkout needed):
   - If you are currently on master: `git merge --ff-only upstream/master`
   - Otherwise: `git fetch . upstream/master:master`
5. Report the new local master HEAD: `git log --oneline -1 master`

Fast-forward only. If step 3 or 4 reports a non-fast-forward / divergence error, STOP, report it to the user, and do NOT force push. Ask the user how to proceed.

The repo's `./sync-fork.sh` performs this exact flow as a single command.
