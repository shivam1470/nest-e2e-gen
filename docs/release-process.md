# Release Process

Guidance for publishing new versions of `nest-e2e-gen`.

## 1. Ensure Clean Working Tree
```bash
git status
```

## 2. Run Build & Tests
```bash
pnpm build
# (run your integration/e2e tests in a consumer project if needed)
```

## 3. Update Changelog
Add a new section in `CHANGELOG.md` describing changes.

## 4. Bump Version
Use semantic versioning (`0.x` => minor for features, patch for fixes):
```bash
npm version patch   # or minor
```

## 5. Commit & Tag
If using the release script this is automated. Otherwise:
```bash
git push origin main --follow-tags
```

## 6. Publish
```bash
npm publish --access public
```

## 7. (Optional) GitHub Release
If `gh` is installed:
```bash
gh release create vX.Y.Z --generate-notes
```

## 8. Announce / Update Docs
Deploy docs site if changed.

---
Future improvement: make `scripts/release.sh` gracefully skip GitHub release when `gh` is unavailable.
