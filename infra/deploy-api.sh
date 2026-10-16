#!/usr/bin/env bash
# Build the API image with Cloud Build and deploy it to Cloud Run.
# Usage: PROJECT=your-project REGION=asia-south1 ./infra/deploy-api.sh
set -euo pipefail
: "${PROJECT:?set PROJECT}"
REGION="${REGION:-asia-south1}"
IMAGE="${REGION}-docker.pkg.dev/${PROJECT}/kavach/api:$(git rev-parse --short HEAD)"

gcloud builds submit --project "$PROJECT" --region "$REGION" \
  --config infra/cloudbuild-api.yaml --substitutions "_IMAGE=${IMAGE}" .

gcloud run deploy kavach-api --project "$PROJECT" --region "$REGION" --image "$IMAGE" \
  --allow-unauthenticated --min-instances 1 --max-instances 5 --timeout 3600 \
  --session-affinity --no-cpu-throttling \
  --set-env-vars "NODE_ENV=production,STORE=firestore,FAKE_LLM=0,AUTH_DISABLED=0,GOOGLE_CLOUD_PROJECT=${PROJECT},GOOGLE_CLOUD_LOCATION=${REGION},GCS_BUCKET=${PROJECT}-kavach-docs" \
  --set-secrets "META_WHATSAPP_TOKEN=META_WHATSAPP_TOKEN:latest,META_APP_SECRET=META_APP_SECRET:latest,META_WEBHOOK_VERIFY_TOKEN=META_WEBHOOK_VERIFY_TOKEN:latest,TWILIO_AUTH_TOKEN=TWILIO_AUTH_TOKEN:latest,DEMO_ADMIN_KEY=DEMO_ADMIN_KEY:latest"
