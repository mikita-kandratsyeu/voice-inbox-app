#!/usr/bin/env bash
# Bootstrap Artifact Registry + Cloud Run services for the AI worker.
# Usage: ./scripts/gcp-ai-worker-bootstrap.sh --project PROJECT_ID --region REGION
set -euo pipefail

PROJECT_ID=""
REGION="us-central1"
REPO_NAME="voice-inbox-ai"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --project)
      PROJECT_ID="$2"
      shift 2
      ;;
    --region)
      REGION="$2"
      shift 2
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 1
      ;;
  esac
done

if [[ -z "$PROJECT_ID" ]]; then
  echo "Missing --project" >&2
  exit 1
fi

echo "Enabling APIs…"
gcloud services enable \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  iamcredentials.googleapis.com \
  --project "$PROJECT_ID"

echo "Creating Artifact Registry repository…"
gcloud artifacts repositories describe "$REPO_NAME" \
  --location="$REGION" \
  --project="$PROJECT_ID" 2>/dev/null || \
gcloud artifacts repositories create "$REPO_NAME" \
  --repository-format=docker \
  --location="$REGION" \
  --description="Voice Inbox containers" \
  --project="$PROJECT_ID"

RUNTIME_SA="ai-worker-run@${PROJECT_ID}.iam.gserviceaccount.com"
if ! gcloud iam service-accounts describe "$RUNTIME_SA" --project="$PROJECT_ID" >/dev/null 2>&1; then
  echo "Creating runtime service account…"
  gcloud iam service-accounts create ai-worker-run \
    --display-name="Voice Inbox AI worker runtime" \
    --project="$PROJECT_ID"
fi

gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${RUNTIME_SA}" \
  --role="roles/secretmanager.secretAccessor" \
  --quiet >/dev/null

IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}/ai-worker:latest"

deploy_service() {
  local name="$1"
  local min_instances="$2"
  echo "Deploying Cloud Run service ${name}…"
  gcloud run deploy "$name" \
    --image="$IMAGE" \
    --region="$REGION" \
    --project="$PROJECT_ID" \
    --service-account="$RUNTIME_SA" \
    --timeout=900 \
    --cpu=1 \
    --memory=1Gi \
    --min-instances="$min_instances" \
    --max-instances=10 \
    --allow-unauthenticated \
    --port=8080 \
    --quiet || true
}

echo ""
echo "Bootstrap complete. Next steps:"
echo "1. Build and push an image (GitHub Actions → Deploy AI worker → Run workflow)"
echo "2. Re-run deploy for ai-worker-staging (min=0) and ai-worker-prod (min=1)"
echo "3. Set AI_JOB_WORKER_URL on Vercel to https://<service>-….run.app/worker"
echo ""
echo "Artifact Registry: ${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}"
echo "Runtime SA: ${RUNTIME_SA}"
