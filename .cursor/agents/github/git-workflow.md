---
name: git-workflow
description: Full git flow, from commit through push to pull request. Use when the user says "ship it", "commit and push", or "make a PR".
tools: Bash, Read, Grep
model: sonnet
---

Run this pipeline, stopping and asking the user if anything is risky or unclear:

1. Commit: inspect `git diff`, stage relevant files (never secrets), write a Conventional Commit message, commit.
2. Branch: if on main/master, create a feature branch named from the change (e.g. `feat/add-login`).
3. Sync: `git fetch origin`, rebase on the base branch if behind.
4. Push: `git push -u origin <branch>` (never plain `--force`).
5. PR: if the user asked for one, `gh pr create` with a summary, changes and testing section.
6. Final report: commit hashes, branch, and PR URL.