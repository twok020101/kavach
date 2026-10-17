// Hard spending cap for the Kavach Google Cloud project.
//
// Cloud Billing budgets only alert; they never stop spending. This function
// closes that gap, following Google's documented "disable billing" pattern:
// the budget publishes every cost update to a Pub/Sub topic, and when the
// spend so far in the period reaches the budget amount the function detaches
// the billing account from the project. Every paid API (Vertex AI, Cloud Run,
// Firestore...) then stops, so the bill can never exceed the cap by more
// than the lag between usage and the budget's cost update (hours, not days).
//
// Re-enable later with:
//   gcloud billing projects link PROJECT --billing-account=ACCOUNT_ID
import { CloudBillingClient } from '@google-cloud/billing';
import functions from '@google-cloud/functions-framework';

const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT;
const billing = new CloudBillingClient();

functions.cloudEvent('capBilling', async (cloudEvent) => {
  const data = JSON.parse(Buffer.from(cloudEvent.data.message.data, 'base64').toString());
  const { costAmount, budgetAmount, currencyCode } = data;
  console.log(`Spend ${costAmount} / ${budgetAmount} ${currencyCode} on ${PROJECT_ID}`);
  if (costAmount < budgetAmount) return;

  const name = `projects/${PROJECT_ID}`;
  const [info] = await billing.getProjectBillingInfo({ name });
  if (!info.billingEnabled) {
    console.log('Billing is already disabled; nothing to do.');
    return;
  }
  await billing.updateProjectBillingInfo({
    name,
    projectBillingInfo: { billingAccountName: '' },
  });
  console.log(`Budget reached: billing DISABLED for ${PROJECT_ID}.`);
});
