Sync upstream/master into origin/master (equivalent to GitHub "Sync fork").

Run these commands in order and stop immediately if any command fails:

1. `git fetch upstream`
2. `git checkout master`
3. `git pull origin master` — sync local master with origin/master first
4. `git merge --ff-only upstream/master` — fast-forward local master to upstream
5. `git push origin master`

If step 4 fails with a non-fast-forward error, report it to the user and do NOT force push. Ask the user how to proceed.

After all steps succeed, report the new HEAD commit hash.
