# syntax=docker/dockerfile:1

FROM node:24-slim AS base
WORKDIR /app
RUN corepack enable

FROM base AS deps
COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn ./.yarn
COPY web/package.json ./web/
COPY workers/ai/package.json ./workers/ai/
COPY packages/ai-job-core/package.json ./packages/ai-job-core/
COPY telegram-bot/package.json ./telegram-bot/
COPY mobile/package.json ./mobile/
RUN yarn install --immutable

FROM deps AS build
COPY packages ./packages
COPY web ./web
COPY workers/ai ./workers/ai
RUN yarn workspace voice-inbox-ai-worker build

FROM node:24-slim AS runner
WORKDIR /app
RUN corepack enable
ENV NODE_ENV=production
ENV PORT=8080

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/web/node_modules ./web/node_modules
COPY --from=deps /app/workers/ai/node_modules ./workers/ai/node_modules
COPY --from=deps /app/packages/ai-job-core/node_modules ./packages/ai-job-core/node_modules
COPY --from=build /app/workers/ai/dist ./workers/ai/dist
COPY --from=build /app/workers/ai/package.json ./workers/ai/package.json
COPY --from=build /app/web/package.json ./web/package.json
COPY --from=build /app/web/lib ./web/lib
COPY --from=build /app/web/services ./web/services
COPY --from=build /app/web/types ./web/types
COPY --from=build /app/web/config ./web/config
COPY --from=build /app/packages ./packages
COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn ./.yarn

WORKDIR /app/workers/ai
EXPOSE 8080
CMD ["node", "dist/server.mjs"]
