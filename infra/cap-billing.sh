#!/usr/bin/env bash
# Hard spending cap for the Kavach project: a Cloud Billing budget that, at 100%,
# triggers a Cloud Function which detaches the billing account from the project.
#
# Usage: PROJECT=your-project BILLING_ACCOUNT=XXXXXX-XXXXXX-XXXXXX AMOUNT=5000 ./infra/cap-billing.sh
#
# AMOUNT is in the billing account's currency (INR for an Indian account).
# Alerts fire by e-mail at 50%, 90% and 100% to the billing account admins;
# the function fires on the cost updates the budget publishes to Pub/Sub.
set -euo pipefail
: "${PROJECT:?set PROJECT}"
: "${BILLING_ACCOUNT:?set BILLING_ACCOUNT (gcloud billing accounts list)}"
AMOUNT="${AMOUNT:-5000}"
REGION="${REGION:-asia-south1}"
TOPIC="billing-cap"
FUNCTION="kavach-billing-cap"
SA="billing-cap@${PROJECT}.iam.gserviceaccount.com"
HERE="$(cd "$(dirname "$0")" && pwd)"

gcloud config set project "$PROJECT"
gcloud services enable billingbudgets.googleapis.com cloudbilling.googleapis.com \
  pubsub.googleapis.com cloudfunctions.googleapis.com cloudbuild.googleapis.com \
  run.googleapis.com eventarc.googleapis.com artifactregistry.googleapis.com logging.googleapis.com

gcloud pubsub topics create "$TOPIC" || true

# The function runs as its own service account. Detaching a project from a
# billing account needs Billing Account Administrator on the billing account
# (the role Google's own guide for this pattern requires), granted here and nowhere else.
gcloud iam service-accounts create billing-cap --display-name="Kavach billing cap" || true
gcloud billing accounts add-iam-policy-binding "$BILLING_ACCOUNT" \
  --member="serviceAccount:${SA}" --role="roles/billing.admin" >/dev/null

gcloud functions deploy "$FUNCTION" --gen2 --region="$REGION" --runtime=nodejs22 \
  --source="${HERE}/billing-cap" --entry-point=capBilling \
  --trigger-topic="$TOPIC" --service-account="$SA" \
  --set-env-vars="GOOGLE_CLOUD_PROJECT=${PROJECT}" --memory=256Mi --quiet

# One budget per project; recreate if it already exists so the amount is right.
EXISTING="$(gcloud billing budgets list --billing-account="$BILLING_ACCOUNT" \
  --filter="displayName=kavach-cap" --format="value(name)" || true)"
if [ -n "$EXISTING" ]; then gcloud billing budgets delete "$EXISTING" --quiet; fi
gcloud billing budgets create --billing-account="$BILLING_ACCOUNT" \
  --display-name="kavach-cap" --filter-projects="projects/${PROJECT}" \
  --budget-amount="$AMOUNT" \
  --threshold-rule=percent=0.5 --threshold-rule=percent=0.9 --threshold-rule=percent=1.0 \
  --notifications-rule-pubsub-topic="projects/${PROJECT}/topics/${TOPIC}" \
  --notifications-rule-monitoring-notification-channels=""

echo "Cap set: ${AMOUNT} on ${PROJECT}. At 100% the function detaches billing."
echo "Re-enable later: gcloud billing projects link ${PROJECT} --billing-account=${BILLING_ACCOUNT}"
