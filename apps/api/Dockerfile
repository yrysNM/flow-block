# Production API image. Build from the repository root:
#   docker build -f apps/api/Dockerfile -t focusflow-api .
# DATABASE_URL in the build stage is a placeholder for prisma generate.
# The runtime stage does not set it. Pass DATABASE_URL and SESSION_SECRET when you run the image.

FROM node:22-alpine AS build
WORKDIR /app
RUN apk add --no-cache openssl
ENV DATABASE_URL=postgresql://placeholder:placeholder@127.0.0.1:5432/focusflow
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY apps/extension/package.json apps/extension/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json
COPY packages/shared-schemas/package.json packages/shared-schemas/package.json
COPY packages/shared-utils/package.json packages/shared-utils/package.json
COPY apps/api/prisma apps/api/prisma
RUN npm ci --ignore-scripts
COPY packages/shared-types packages/shared-types
COPY packages/shared-schemas packages/shared-schemas
COPY packages/shared-utils packages/shared-utils
COPY apps/api apps/api
RUN npm run build -w @focusflow/shared-types \
  && npm run build -w @focusflow/shared-schemas \
  && npm run build -w @focusflow/shared-utils \
  && npm exec -w @focusflow/api -- prisma generate \
  && npm run build -w @focusflow/api \
  && npm prune --omit=dev

FROM node:22-alpine AS runtime
WORKDIR /app
RUN apk add --no-cache openssl
ENV NODE_ENV=production
COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/shared-types/package.json ./packages/shared-types/package.json
COPY --from=build /app/packages/shared-types/dist ./packages/shared-types/dist
COPY --from=build /app/packages/shared-schemas/package.json ./packages/shared-schemas/package.json
COPY --from=build /app/packages/shared-schemas/dist ./packages/shared-schemas/dist
COPY --from=build /app/packages/shared-utils/package.json ./packages/shared-utils/package.json
COPY --from=build /app/packages/shared-utils/dist ./packages/shared-utils/dist
COPY --from=build /app/apps/api/package.json ./apps/api/package.json
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/prisma ./apps/api/prisma
COPY apps/api/docker-entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
WORKDIR /app/apps/api
USER node
EXPOSE 3001
ENTRYPOINT ["/entrypoint.sh"]
