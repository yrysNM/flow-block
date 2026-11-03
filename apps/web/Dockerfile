# Production web image. Build from the repository root:
#   docker build -f apps/web/Dockerfile -t focusflow-web .
# The browser keeps calling /api on this origin. Nitro proxies that to NUXT_API_PROXY_TARGET at runtime.

FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY apps/extension/package.json apps/extension/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json
COPY packages/shared-schemas/package.json packages/shared-schemas/package.json
COPY packages/shared-utils/package.json packages/shared-utils/package.json
RUN npm ci --ignore-scripts
COPY packages/shared-types packages/shared-types
COPY packages/shared-schemas packages/shared-schemas
COPY packages/shared-utils packages/shared-utils
COPY apps/web apps/web
ENV NUXT_PUBLIC_API_BASE=/api
RUN npm run build -w @focusflow/web

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000
ENV NITRO_HOST=0.0.0.0
ENV NITRO_PORT=3000
COPY --from=build /app/apps/web/.output ./.output
USER node
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
