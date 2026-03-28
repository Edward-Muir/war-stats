#!/bin/bash

# Release script for Warstats
# Usage: ./scripts/release.sh [patch|minor|major]

set -e

# Resolve the app/ directory (where package.json lives)
APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"

# Default to auto-detect from commits if no argument provided
RELEASE_TYPE=${1:-""}

echo "🚀 Starting release process..."

# Ensure working directory is clean (check from repo root)
if [[ -n $(git -C "$APP_DIR" status --porcelain | grep -v 'version.ts\|version.json\|CHANGELOG.md') ]]; then
  echo "❌ Error: Working directory has uncommitted changes"
  echo "   Please commit or stash changes before releasing"
  git -C "$APP_DIR" status --short
  exit 1
fi

# Run the release (from app/ where package.json lives)
cd "$APP_DIR"
if [[ -n "$RELEASE_TYPE" ]]; then
  echo "📦 Bumping $RELEASE_TYPE version..."
  npm run release:$RELEASE_TYPE
else
  echo "📦 Auto-detecting version bump from commits..."
  npm run release
fi

# Push with tags
echo "📤 Pushing to remote with tags..."
git push --follow-tags

echo "✅ Release complete!"
echo ""
echo "View the release at: https://github.com/Edward-Muir/war-stats/releases"
