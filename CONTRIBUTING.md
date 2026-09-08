# Contributing to get-cookie

Thanks for contributing. This repository uses a protected `main` branch: every
change lands through a pull request with passing CI.

## Licensing contributions

By submitting a contribution for inclusion in get-cookie, you agree to
license it under the project's [ISC License](LICENSE). You retain ownership
of your contribution; this does not assign your copyright to the maintainer.
Submit only work that you have the right to contribute under these terms.

Preserve existing copyright and licence notices. If a contribution includes
third-party material, identify its source and licence in the pull request,
retain its required notices, and explain how its licence permits inclusion.

## Set up the repository

Use the Node.js version pinned in `.nvmrc` and the pnpm version declared in
`package.json`.

```bash
nvm install
nvm use
corepack enable
pnpm install --frozen-lockfile
```

If you do not use nvm, install the version in `.nvmrc` manually. The package
supports the Node.js versions listed in `package.json`, but contributors
should use the pinned development version for reproducible local results.

## Work on a change

Create a branch from current `main`; do not commit or push directly to
`main`.

```bash
git switch main
git pull --ff-only origin main
git switch -c feat/short-description

# Make your change, then run the relevant checks.
pnpm run validate
pnpm run build

git add <changed-files>
git commit -m "feat: describe the change"
git push -u origin feat/short-description
gh pr create
```

Use a branch prefix that matches the change, such as `feat/`, `fix/`,
`docs/`, `test/`, `refactor/`, or `chore/`. Commits follow
[Conventional Commits](https://www.conventionalcommits.org/).

In the pull request, explain the user-visible behavior, note any platform or
browser-specific testing, and list the commands you ran. Keep cookie values,
browser profile names, local paths, and other sensitive data out of commits,
logs, screenshots, and PR descriptions.

## Validation commands

`pnpm run validate` is the normal pre-PR gate. It runs type checking, Biome
linting, Jest, the documentation link check, and the formatting check.

Useful focused commands:

```bash
pnpm test
pnpm test -- src/core/browsers/firefox/
pnpm test -- --testNamePattern="specific test name"
pnpm run type-check
pnpm run lint
pnpm run lint:all
pnpm run check-links
pnpm run build
```

`validate` does not build the package, so run `pnpm run build` as well when
changing exports, entrypoints, the CLI, bundling, or release-facing code.

### Filesystem import guardrails

Production browser and CLI modules access disk through the runtime
[FileSystemAdapter](src/core/browsers/runtime/FileSystemAdapter.ts).
Both linters restrict direct imports of `fs`, `node:fs`, `fs/promises` and
`node:fs/promises` in these modules. Runtime adapters, test files and mocks
remain exempt from that import restriction.

Safari's production `BinaryCodable*.ts` parsers are covered too. Their Biome
allowance for non-null assertions does not exempt them from the import rule.
When changing lint overrides, check real temporary files in the affected
directories with `pnpm exec biome lint <file>` and verify both rules:

- All four direct filesystem imports are rejected in ordinary browser code
  and production `BinaryCodable*.ts` files, with `FileSystemAdapter` guidance.
- Non-null assertions remain allowed in `BinaryCodable*.ts` and test files.
- Runtime adapters, tests and mocks retain their import exemptions.

## Documentation changes

The documentation site is built with VitePress and the API reference is
generated with TypeDoc.

```bash
pnpm run docs:dev      # local VitePress server
pnpm run check-links   # link integrity check
pnpm run docs          # generate TypeDoc and build the site
```

Prefer updating source JSDoc or TypeDoc configuration over hand-editing
`docs/reference/generated/`, because `pnpm run docs` regenerates that
directory. The stable `docs/reference/index.md` page is the hand-written
overview. When adding or moving a page, update `docs/.vitepress/config.mjs`
and run both `pnpm run check-links` and `pnpm run docs`.

Documentation examples must use placeholder domains and values. Do not include
real cookies, tokens, account identifiers, profile names, or instructions that
persist sensitive cookie output.

## Git hooks

Husky and lint-staged run formatting and checks for staged files during commit.
They help catch issues early but do not replace the validation commands above.

## Maintainer release workflow

Releases also go through a pull request. Do not use `npm version` or
`pnpm version` in this repository; those commands can leave a partially
staged version change in nvm environments.

1. Start a release branch from current `main`.
2. Edit the `version` field in `package.json` manually.
3. Commit the version using the version number as the commit message.
4. Push the branch and open a release PR.
5. Wait for the required CI checks and merge the PR.
6. After the release PR is merged, tag the merged commit and push the tag
   separately.

```bash
git switch main
git pull --ff-only origin main
git switch -c chore/release-<version>

# Edit package.json manually.
git add package.json
git commit -m "<version>"
git push -u origin chore/release-<version>
gh pr create --title "chore: release <version>"

# After the PR merges, tag that PR's reviewed merge commit:
RELEASE_PR_NUMBER="<release-pr-number>"
RELEASE_SHA="$(gh pr view "$RELEASE_PR_NUMBER" --json mergeCommit --jq '.mergeCommit.oid')"
if [ -z "$RELEASE_SHA" ] || [ "$RELEASE_SHA" = "null" ]; then
  echo "Release PR is not merged" >&2
  exit 1
fi
git fetch origin main
git tag v<version> "$RELEASE_SHA"
git push origin v<version>
```

Replace `<release-pr-number>` with the merged release PR number. The pushed
tag triggers the release workflow. If a manual npm publish is
explicitly needed, build and validate first, then use
`pnpm publish --access public`.

### Check licensing in the release package

Before publishing, inspect the output of `pnpm pack` and confirm:

- `LICENSE`, `ATTRIBUTION.md`, and `README.md` are included.
- The package metadata still declares `"license": "ISC"`.
- `LICENSE` includes the existing copyright and permission notices.
- Any bundled third-party material retains the notices its licence requires.

The [attribution guide](ATTRIBUTION.md) explains how downstream projects can
carry these notices. It is included in the npm package and reused by the
documentation site; edit that guide when clarifying attribution guidance.
`LICENSE` remains the controlling text.

## Getting help

Search existing issues before opening a new one. For bugs, include the package
version, operating system, browser family, minimal reproduction steps, and
redacted error output. Never attach cookie values or raw browser databases.
