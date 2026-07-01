# Shared packages

| Package | Purpose |
|---------|---------|
| `@voice-inbox/ai-job-core` | Duration limits, QStash publish plan, envelope parsing |
| `@voice-inbox/ai-worker` | Full AI job execution stack (runners, `ai.service`, Redis, push) |

`web/lib/*` worker modules are thin re-exports from `@voice-inbox/ai-worker` (see `packages/ai-worker/scripts/sync-from-web.mjs`).

Cloud Run runs `packages/ai-worker/dist/server.mjs` — no `web/lib` copy in the Docker image.
