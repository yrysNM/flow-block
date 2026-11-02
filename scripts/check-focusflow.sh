#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
npm run build:packages
npm run db:generate
npm run lint:focusflow
npm run typecheck:focusflow
npm run test:focusflow
npm run build:focusflow
npm test
npm run typecheck
npm run lint
