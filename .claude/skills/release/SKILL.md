---
name: release
description: Use when publishing a new version of the package
argument-hint: <patch|minor|major>
---

# Release

Automate the release process for dekit-cli.

**Argument:** `patch`, `minor`, or `major` (required). This determines how the version number is bumped following semver.

## Steps

### 1. Validate argument

The argument must be one of: `patch`, `minor`, `major`. If missing or invalid, print usage and stop:

```
Usage: /release <patch|minor|major>
```

### 2. Ensure clean working tree

Run `git status --porcelain`. If there are uncommitted changes, stop and ask the user to commit or stash first.

### 3. Ensure on main branch

Run `git branch --show-current`. If not on `main`, warn the user and ask for confirmation before proceeding.

### 4. Bump version

Read `package.json`, parse the current `version` field, and bump it according to the argument:

- `patch`: `0.1.0` -> `0.1.1`
- `minor`: `0.1.0` -> `0.2.0`
- `major`: `0.1.0` -> `1.0.0`

Write the updated version back to `package.json`.

### 5. Generate release notes

Run `git log` from the last tag (or from the first commit if no tags exist) to HEAD:

```bash
git log $(git describe --tags --abbrev=0 2>/dev/null || git rev-list --max-parents=0 HEAD)..HEAD --oneline
```

Categorize each commit by its conventional commit prefix:

- **Breaking Changes** — commits with `!:` or `BREAKING CHANGE` in body
- **Features** — commits starting with `feat:`
- **Bug Fixes** — commits starting with `fix:`
- **Other** — everything else

Format as markdown:

```markdown
## What's Changed

### Features
- description (hash)

### Bug Fixes
- description (hash)

### Other
- description (hash)
```

Omit empty sections. If a section has no items, don't include it.

### 6. Commit and tag

```bash
git add package.json
git commit -m "release: v<new-version>"
git tag v<new-version>
```

### 7. Push

```bash
git push
git push --tags
```

### 8. Create GitHub Release

```bash
gh release create v<new-version> --title "v<new-version>" --notes "<release-notes-from-step-5>"
```

### 9. Wait for publish workflow

The `v*` tag will trigger the Publish workflow. Poll until it completes:

```bash
gh run list --branch v<new-version> --workflow Publish --limit 1 --json status,conclusion
```

Poll every 15 seconds. If the workflow fails, print the failed logs and stop:

```bash
gh run view <run-id> --log-failed
```

### 10. Confirm

Print a summary:

```
Released v<new-version>
- GitHub Release: https://github.com/<owner>/<repo>/releases/tag/v<new-version>
- npm: https://www.npmjs.com/package/dekit-cli/v/<new-version>
```
