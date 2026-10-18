#!/usr/bin/env bash
# One-time setup of a Google Cloud project for Kavach.
# Usage: PROJECT=your-project REGION=asia-south1 ./infra/bootstrap.sh
set -euo pipefail
: "${PROJECT:?set PROJECT}"
REGION="${REGION:-asia-south1}"

gcloud config set project "$PROJECT"
gcloud services enable \
  run.googleapis.com aiplatform.googleapis.com firestore.googleapis.com \
  storage.googleapis.com secretmanager.googleapis.com artifactregistry.googleapis.com \
  cloudbuild.googleapis.com firebase.googleapis.com firebaseapphosting.googleapis.com

gcloud firestore databases create --location="$REGION" --type=firestore-native || true
gcloud storage buckets create "gs://${PROJECT}-kavach-docs" --location="$REGION" \
  --uniform-bucket-level-access || true
gcloud artifacts repositories create kavach --repository-format=docker \
  --location="$REGION" || true

# Secrets: created empty here; add values later with
#   printf '%s' "value" | gcloud secrets versions add NAME --data-file=-
for s in META_WHATSAPP_TOKEN META_APP_SECRET META_WEBHOOK_VERIFY_TOKEN \
         TWILIO_AUTH_TOKEN DEMO_ADMIN_KEY; do
  gcloud secrets create "$s" --replication-policy=automatic || true
done
# Let Cloud Run's default identity call Gemini, Firestore, Storage and read the secrets.
SA="$(gcloud projects describe "$PROJECT" --format 'value(projectNumber)')-compute@developer.gserviceaccount.com"
for role in roles/aiplatform.user roles/datastore.user roles/storage.objectAdmin \
            roles/secretmanager.secretAccessor; do
  gcloud projects add-iam-policy-binding "$PROJECT" --member "serviceAccount:${SA}" \
    --role "$role" --condition None >/dev/null
done
echo "Bootstrap done for $PROJECT in $REGION."
