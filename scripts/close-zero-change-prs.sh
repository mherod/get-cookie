#!/usr/bin/env bash
#
# Close open pull requests whose merge into the base branch would introduce
# no changes at all.
#
# A PR is "zero-change" when the tree produced by merging it into the base is
# byte-for-byte identical to the base tree. This happens when the PR's patch is
# already fully present on the base branch — for example, when the same fix was
# applied independently and merged through another PR. Merging such a PR is a
# pure no-op, so it can be closed automatically.
#
# Detection is exact and conservative:
#   - It compares real merge-result tree OIDs (`git merge-tree --write-tree`),
#     not raw diffs, so a patch that is "real" relative to its merge-base but
#     already present on the base is still correctly identified as a no-op.
#   - Any PR that introduces a single byte of change — including a lockfile
#     bump from Dependabot — produces a different tree and is left untouched.
#   - A PR that cannot be merged cleanly (conflicts) is left untouched.
#
# Environment:
#   BASE_BRANCH  Base branch to test merges against (default: main)
#   DRY_RUN      When "true", report decisions without commenting or closing
#   GH_TOKEN     Token used by `gh` (provided by the workflow)
#
set -euo pipefail

BASE_BRANCH="${BASE_BRANCH:-main}"
DRY_RUN="${DRY_RUN:-false}"

echo "Base branch: ${BASE_BRANCH}"
echo "Dry run:     ${DRY_RUN}"

git fetch --quiet origin "${BASE_BRANCH}"
BASE_TREE="$(git rev-parse "origin/${BASE_BRANCH}^{tree}")"
echo "Base tree:   ${BASE_TREE}"
echo

# List open PRs targeting the base branch as "<number>\t<headRefOid>" rows.
PR_ROWS="$(gh pr list --state open --base "${BASE_BRANCH}" \
  --json number,headRefOid --jq '.[] | [.number, .headRefOid] | @tsv')"

if [ -z "${PR_ROWS}" ]; then
  echo "No open PRs targeting ${BASE_BRANCH}."
  exit 0
fi

closed_count=0

while IFS=$'\t' read -r PR_NUMBER HEAD_OID; do
  [ -z "${PR_NUMBER}" ] && continue

  # Fetch the PR head. The pull/<n>/head ref resolves for fork PRs too, so the
  # object named by HEAD_OID is available locally for the merge simulation.
  if ! git fetch --quiet origin "pull/${PR_NUMBER}/head"; then
    echo "PR #${PR_NUMBER}: could not fetch head; skipping"
    continue
  fi

  # Simulate the merge. Exit status is non-zero on conflicts.
  if ! MERGED_TREE="$(git merge-tree --write-tree "origin/${BASE_BRANCH}" "${HEAD_OID}" 2>/dev/null)"; then
    echo "PR #${PR_NUMBER}: merge has conflicts; leaving open"
    continue
  fi

  if [ "${MERGED_TREE}" != "${BASE_TREE}" ]; then
    echo "PR #${PR_NUMBER}: introduces changes (tree ${MERGED_TREE}); leaving open"
    continue
  fi

  echo "PR #${PR_NUMBER}: zero-change (merge tree == base tree)"
  if [ "${DRY_RUN}" = "true" ]; then
    echo "  DRY_RUN: would comment and close"
    continue
  fi

  gh pr comment "${PR_NUMBER}" --body \
"Closing automatically: merging this PR into \`${BASE_BRANCH}\` would introduce no changes — its content is already present on the base branch, so the merge is a no-op.

If this is unexpected, rebase onto \`${BASE_BRANCH}\` and reopen."
  gh pr close "${PR_NUMBER}"
  closed_count=$((closed_count + 1))
  echo "  closed PR #${PR_NUMBER}"
done <<EOF
${PR_ROWS}
EOF

echo
echo "Done. Closed ${closed_count} zero-change PR(s)."
