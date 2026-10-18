#!/usr/bin/env bash
# Build the API image with Cloud Build and deploy it to Cloud Run.
# Usage: PROJECT=your-project REGION=asia-south1 WEB_URL=https://kavach.example.com ./infra/deploy-api.sh
# Model IDs and other non-secret settings are read from the shell, or from the repo-root .env.
set -euo pipefail
: "${PROJECT:?set PROJECT}"
: "${WEB_URL:?set WEB_URL (the public web address; the API only accepts browser calls from it)}"
REGION="${REGION:-asia-south1}"
IMAGE="${REGION}-docker.pkg.dev/${PROJECT}/kavach/api:$(git rev-parse --short HEAD)"

# Shell values win over .env.
if [[ -f .env ]]; then
  while IFS='=' read -r key value; do
    [[ "$key" =~ ^[A-Z_][A-Z0-9_]*$ ]] || continue
    value="${value%\"}"; value="${value#\"}"
    if [[ -z "${!key:-}" ]]; then export "$key=$value"; fi
  done < .env
fi

for m in KAVACH_MODEL_PRO KAVACH_MODEL_FLASH KAVACH_MODEL_LIVE KAVACH_MODEL_TTS \
         KAVACH_MODEL_EMBED KAVACH_LIVE_VOICE; do
  if [[ -z "${!m:-}" || "${!m}" == *placeholder* ]]; then
    echo "Set $m to a real value (shell or .env) before deploying." >&2
    exit 1
  fi
done

gcloud builds submit --project "$PROJECT" --region "$REGION" \
  --config infra/cloudbuild-api.yaml --substitutions "_IMAGE=${IMAGE}" .

# First deploy: the API's own URL is only known after it exists, so it is filled in on a second pass.
API_URL="$(gcloud run services describe kavach-api --project "$PROJECT" --region "$REGION" \
  --format 'value(status.url)' 2>/dev/null || true)"

VARS="NODE_ENV=production,STORE=firestore,FAKE_LLM=0,AUTH_DISABLED=0"
VARS+=",GOOGLE_CLOUD_PROJECT=${PROJECT},GOOGLE_CLOUD_LOCATION=${GOOGLE_CLOUD_LOCATION:-$REGION}"
VARS+=",GCS_BUCKET=${PROJECT}-kavach-docs,PUBLIC_WEB_URL=${WEB_URL}"
if [[ -n "$API_URL" ]]; then VARS+=",PUBLIC_API_URL=${API_URL}"; fi
# Optional settings, passed through only when set.
for k in KAVACH_MODEL_PRO KAVACH_MODEL_FLASH KAVACH_MODEL_LIVE KAVACH_MODEL_TTS KAVACH_MODEL_EMBED \
         KAVACH_LIVE_VOICE KAVACH_MODEL_QUICK GOOGLE_CLOUD_LIVE_LOCATION GOOGLE_CLOUD_QUICK_LOCATION \
         META_WHATSAPP_PHONE_NUMBER_ID TWILIO_ACCOUNT_SID TWILIO_WHATSAPP_FROM; do
  if [[ -n "${!k:-}" ]]; then VARS+=",${k}=${!k}"; fi
done

# The admin key guards /v1/admin routes; never fall back to the public default.
if ! gcloud secrets versions describe latest --secret DEMO_ADMIN_KEY --project "$PROJECT" >/dev/null 2>&1; then
  openssl rand -hex 24 | tr -d '\n' | gcloud secrets versions add DEMO_ADMIN_KEY --project "$PROJECT" --data-file=-
  echo "Generated a random DEMO_ADMIN_KEY (read it with: gcloud secrets versions access latest --secret DEMO_ADMIN_KEY)."
fi

# Secrets: only the ones that have a value, so the API deploys before the WhatsApp keys exist.
SECRETS=""
for s in DEMO_ADMIN_KEY META_WHATSAPP_TOKEN META_APP_SECRET META_WEBHOOK_VERIFY_TOKEN TWILIO_AUTH_TOKEN; do
  if gcloud secrets versions describe latest --secret "$s" --project "$PROJECT" >/dev/null 2>&1; then
    SECRETS+="${SECRETS:+,}${s}=${s}:latest"
  fi
done

gcloud run deploy kavach-api --project "$PROJECT" --region "$REGION" --image "$IMAGE" \
  --allow-unauthenticated --min-instances 1 --max-instances 5 --timeout 3600 \
  --session-affinity --no-cpu-throttling \
  --set-env-vars "$VARS" ${SECRETS:+--set-secrets "$SECRETS"}

if [[ -z "$API_URL" ]]; then
  API_URL="$(gcloud run services describe kavach-api --project "$PROJECT" --region "$REGION" \
    --format 'value(status.url)')"
  gcloud run services update kavach-api --project "$PROJECT" --region "$REGION" \
    --update-env-vars "PUBLIC_API_URL=${API_URL}"
fi
echo "API live at ${API_URL}. Put it in apps/web/apphosting.yaml as NEXT_PUBLIC_API_URL."
