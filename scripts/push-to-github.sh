#!/usr/bin/env bash
set -euo pipefail

REPO_URL="https://github.com/yrysNM/flow-block.git"
BRANCH="main"

git remote set-url origin "$REPO_URL" 2>/dev/null || git remote add origin "$REPO_URL"

if command -v gh >/dev/null 2>&1 && gh auth status >/dev/null 2>&1; then
  echo "Pushing to GitHub with gh credentials..."
  git push -u origin "$BRANCH"
  exit 0
fi

if [[ -n "${GITHUB_TOKEN:-}" ]]; then
  echo "Pushing to GitHub with GITHUB_TOKEN..."
  git push -u "https://x-access-token:${GITHUB_TOKEN}@github.com/yrysNM/flow-block.git" "$BRANCH"
  exit 0
fi

cat <<'EOF'
GitHub authentication is required.

Option A — GitHub CLI:
  gh auth login
  git push -u origin main

Option B — Personal access token:
  export GITHUB_TOKEN=ghp_your_token_here
  ./scripts/push-to-github.sh

Create a token at: https://github.com/settings/tokens
Required scope: repo (for private repos) or public_repo (for public repos)
EOF
exit 1
