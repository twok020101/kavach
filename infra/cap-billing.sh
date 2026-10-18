#!/usr/bin/env bash
# Hard spending cap for the Kavach project: a Cloud Billing budget that, at 100%,
# triggers a Cloud Function which detaches the billing account from the project.
#
# Usage: PROJECT=your-project BILLING_ACCOUNT=XXXXXX-XXXXXX-XXXXXX AMOUNT=4500 ./infra/cap-billing.sh
#
# AMOUNT is in the billing account's currency (INR for an Indian account); the default matches
# the ₹4,500/month Vertex AI spend cap set in the console on 17 Oct 2026 (PROGRESS.md).
# Alerts fire by e-mail at 50%, 90% and 100% to the billing account admins;
# the function fires on the cost updates the budget publishes to Pub/Sub.
#
# Status: not yet run against a real billing account (issue #28). The console's enforced
# Vertex AI spend cap is what is live; this is the second line. Run it once, then record the
# result in PROGRESS.md.
#
# Roles the person running this needs: Billing Account Administrator on BILLING_ACCOUNT and
# Owner (or Project IAM Admin + Service Account Admin + Cloud Functions Developer) on PROJECT.
set -euo pipefail
: "${PROJECT:?set PROJECT}"
: "${BILLING_ACCOUNT:?set BILLING_ACCOUNT (gcloud billing accounts list)}"
AMOUNT="${AMOUNT:-4500}"
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

# The function runs as its own service account. Detaching a project from a billing account
# needs Billing Account Administrator on the billing account (the role Google's own guide for
# this pattern requires) and Project Billing Manager on the project itself, which is what lets
# `projects.updateBillingInfo` clear the link. Both are granted here and nowhere else.
gcloud iam service-accounts create billing-cap --display-name="Kavach billing cap" || true
gcloud billing accounts add-iam-policy-binding "$BILLING_ACCOUNT" \
  --member="serviceAccount:${SA}" --role="roles/billing.admin" >/dev/null
gcloud projects add-iam-policy-binding "$PROJECT" \
  --member="serviceAccount:${SA}" --role="roles/billing.projectManager" >/dev/null

gcloud functions deploy "$FUNCTION" --gen2 --region="$REGION" --runtime=nodejs22 \
  --source="${HERE}/billing-cap" --entry-point=capBilling \
  --trigger-topic="$TOPIC" --service-account="$SA" \
  --set-env-vars="GOOGLE_CLOUD_PROJECT=${PROJECT}" --memory=256Mi --quiet

# One budget per project; delete every earlier copy (one id per line) so the amount is right.
gcloud billing budgets list --billing-account="$BILLING_ACCOUNT" \
  --filter="displayName=kavach-cap" --format="value(name)" 2>/dev/null |
  while IFS= read -r budget; do
    [ -n "$budget" ] && gcloud billing budgets delete "$budget" --quiet
  done
# No monitoring channels: the e-mails go to the billing admins by default, and an empty
# channels flag is rejected by some gcloud versions.
gcloud billing budgets create --billing-account="$BILLING_ACCOUNT" \
  --display-name="kavach-cap" --filter-projects="projects/${PROJECT}" \
  --budget-amount="$AMOUNT" \
  --threshold-rule=percent=0.5 --threshold-rule=percent=0.9 --threshold-rule=percent=1.0 \
  --notifications-rule-pubsub-topic="projects/${PROJECT}/topics/${TOPIC}"

echo "Cap set: ${AMOUNT} on ${PROJECT}. At 100% the function detaches billing."
echo "Re-enable later: gcloud billing projects link ${PROJECT} --billing-account=${BILLING_ACCOUNT}"
