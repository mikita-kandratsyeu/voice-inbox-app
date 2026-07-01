# syntax=docker/dockerfile:1

FROM node:24-slim AS base
WORKDIR /app
RUN corepack enable

FROM base AS deps
COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn ./.yarn
COPY packages/ai-job-core/package.json ./packages/ai-job-core/
COPY packages/ai-worker/package.json ./packages/ai-worker/
COPY web/package.json ./web/
COPY mobile/package.json ./mobile/
COPY telegram-bot/package.json ./telegram-bot/
RUN yarn install --immutable

FROM deps AS build
COPY packages ./packages
COPY web/prisma ./web/prisma
COPY web/prisma.config.ts ./web/prisma.config.ts
RUN yarn workspace voice-inbox-web db:generate
COPY packages/ai-worker ./packages/ai-worker
RUN yarn workspace @voice-inbox/ai-worker build

FROM node:24-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/ai-job-core/node_modules ./packages/ai-job-core/node_modules
COPY --from=deps /app/packages/ai-worker/node_modules ./packages/ai-worker/node_modules
COPY --from=build /app/packages/ai-worker/dist ./packages/ai-worker/dist
COPY --from=build /app/web/generated ./web/generated
COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn ./.yarn
COPY packages/ai-job-core/package.json ./packages/ai-job-core/
COPY packages/ai-worker/package.json ./packages/ai-worker/

EXPOSE 8080
CMD ["node", "packages/ai-worker/dist/server.mjs"]
