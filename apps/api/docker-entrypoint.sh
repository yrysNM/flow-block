#!/bin/sh
set -eu
cd /app/apps/api
if [ "${RUN_MIGRATIONS:-1}" = "1" ]; then
  npx prisma migrate deploy
fi
exec node dist/main.js
