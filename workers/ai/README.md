# Cloud Run AI worker

Standalone HTTP service for long-running AI jobs (up to 15 minutes). Invoked by Upstash QStash from the Vercel web API.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Health check |
| `POST` | `/worker` | QStash-signed AI job handler |

## Local development

```bash
# From repo root — uses web .env via your shell
export $(grep -v '^#' web/.env | xargs) 2>/dev/null || true
yarn workspace voice-inbox-ai-worker dev
```

## Build

```bash
yarn workspace voice-inbox-ai-worker build
yarn workspace voice-inbox-ai-worker start
```

## Docker

```bash
docker build -f workers/ai/Dockerfile -t voice-inbox-ai-worker .
docker run --rm -p 8080:8080 --env-file web/.env voice-inbox-ai-worker
```

## GCP bootstrap

Run once per Firebase/GCP project (requires `gcloud` CLI):

```bash
./scripts/gcp-ai-worker-bootstrap.sh --project YOUR_GCP_PROJECT --region us-central1
```

Then configure GitHub Actions secrets and **deploy manually** (Actions → *Deploy AI worker* → Run workflow):

- `GCP_PROJECT_ID`
- `GCP_REGION` (same as Upstash Redis region)
- `GCP_WORKLOAD_IDENTITY_PROVIDER` + `GCP_SERVICE_ACCOUNT` (WIF), or `GCP_SA_KEY`

Choose `staging` or `prod` when running the workflow. There is no deploy on push to `main`.

Set on Vercel (per environment):

- `AI_JOB_WORKER_URL=https://ai-worker-staging-….run.app/worker` (Preview)
- `AI_JOB_WORKER_URL=https://ai-worker-prod-….run.app/worker` (Production)
- `AI_JOB_MAX_DURATION_SECONDS=900` (optional override)

Fallback remains `https://<vercel-host>/api/internal/ai/worker` via QStash `failureCallback`.
