#!/usr/bin/env bash
set -euo pipefail

# Simple release automation for nest-e2e-gen
# Usage: ./scripts/release.sh <version>
# Example: ./scripts/release.sh 0.3.7

if [ $# -ne 1 ]; then
  echo "Usage: $0 <version>" >&2
  exit 1
fi
VERSION="$1"

if ! command -v gh >/dev/null 2>&1; then
  echo "GitHub CLI (gh) is required. Install via: brew install gh" >&2
  exit 1
fi

# Ensure auth
if ! gh auth status >/dev/null 2>&1; then
  echo "GitHub CLI not authenticated. Run: gh auth login" >&2
  exit 1
fi

echo "==> Updating package.json version to ${VERSION}"
# Use jq if available, else sed fallback
if command -v jq >/dev/null 2>&1; then
  tmp=$(mktemp)
  jq --arg v "$VERSION" '.version=$v' package.json > "$tmp" && mv "$tmp" package.json
else
  # crude sed (assumes standard formatting)
  sed -i '' -E "s/\"version\": \"[0-9]+\.[0-9]+\.[0-9]+\"/\"version\": \"${VERSION}\"/" package.json
fi

echo "==> Building"
pnpm run build

echo "==> Generating npm pack dry-run"
npm pack --dry-run > /dev/null

echo "==> Commit + tag"
git add package.json CHANGELOG.md || true
git commit -m "chore(release): v${VERSION}" || echo "(nothing to commit)"
TAG="v${VERSION}"
if git rev-parse "$TAG" >/dev/null 2>&1; then
  echo "Tag $TAG already exists, skipping creation"
else
  git tag "$TAG"
fi

echo "==> Pushing branch & tag"
git push -u origin HEAD:main
git push origin "$TAG"

echo "==> Creating GitHub release"
CHANGELOG_SECTION=$(awk -v ver="$VERSION" 'BEGIN{p=0} /^## \[/'"$VERSION"'\]/{p=1} /^## \[/ && $0 !~ /'"$VERSION"'/{if(p){exit}} p{print}' CHANGELOG.md || true)
if [ -z "$CHANGELOG_SECTION" ]; then
  NOTES="Release v${VERSION}"
else
  NOTES="$CHANGELOG_SECTION"
fi
if gh release view "$TAG" >/dev/null 2>&1; then
  echo "Release $TAG already exists, skipping"
else
  gh release create "$TAG" --title "$TAG" --notes "$NOTES"
fi

echo "==> Publishing to npm"
npm publish --access public

echo "==> Done: v${VERSION}"