Merge the latest upstream master release commit into alma9-v2.

## Commit Message Convention

All merge commits MUST follow this format exactly:
```
Merge commit '<7-char-short-hash>' (v<version>) into alma9-v2
```

Examples:
- `Merge commit 'a37ac88' (v20.63.0) into alma9-v2`
- `Merge commit '4c83d448' (v20.65.0) into alma9-v2`

## Steps

Run in order and stop immediately if any command fails:

1. Identify the latest release tag and the upstream master commit it was built from:
   `git fetch --no-tags upstream master`
   `git ls-remote --tags --refs --sort=-v:refname upstream 'v*' | head -1` — latest tag and the commit it points at
   `gh api repos/uNetworking/uWebSockets.js/commits/<tag-commit> --jq .commit.committer.date` — when the release binaries were committed
   `git log -1 --format=%H --before=<date> upstream/master` — full hash of the master commit to merge

   Do not merge the tag's own commit: release tags point at the `binaries` branch, not master.
   Do not `git fetch --tags` either: it downloads the binaries history and runs for minutes.

2. Ensure local alma9-v2 is in sync with origin:
   `git checkout alma9-v2`
   `git pull origin alma9-v2`

3. Merge the release commit with the correct commit message:
   `git merge <full-commit-hash> -m "Merge commit '<short-hash>' (<tag>) into alma9-v2"`
   where <short-hash> is the first 7-8 characters of the full commit hash.

4. Verify the commit message:
   `git log --oneline -1`

5. Push to origin:
   `git push origin alma9-v2`

If step 3 produces conflicts, report them and do NOT force push. Ask the user how to proceed.

After all steps succeed, report the merge commit hash and the version that was merged.
