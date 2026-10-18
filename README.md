# Kavach

The AI that stands beside your family at every insurance moment.

Google Cloud AI Builder Cup 2026, BFSI track. Kavach remembers a household's insurance and acts at three moments: when life changes, at the hospital desk (live, in Hindi), and when a claim goes wrong.

- Plan: [`docs/implementation-plan.md`](docs/implementation-plan.md) (how we build it) and [`docs/plan`](docs/plan/README.md) (what we build)
- Build status: [`PROGRESS.md`](PROGRESS.md)

## For judges

Every person, policy, hospital and letter in the demo is made up and marked SAMPLE. The demo follows the Sharma family of Bengaluru ([`docs/plan/09-demo-data-and-script.md`](docs/plan/09-demo-data-and-script.md)). Each visitor gets their own copy of the household, so judges never see each other's changes.

**Try it in five minutes** (locally with `pnpm dev`, or on the deployed app):

| Moment                  | Open                                      | What you should see                                                                                                                                                                      |
| ----------------------- | ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| At the hospital desk    | `/en/desk?demo=1`                         | Suresh (62) is admitted for a planned angioplasty. Snap or pick the sample estimate: Kavach picks the room that avoids proportionate deduction, a saving of ₹90,000, with the rule cited |
| The same desk in Hindi  | `/hi/desk?demo=1`                         | Kamala asks out loud in Hindi. Gemini Live answers in spoken Hindi, calling the rules engine for every rupee                                                                             |
| A second scene          | `/en/desk?demo=1&scene=maternity`         | Priya's planned delivery at Lotus Women's Hospital: the company policy caps maternity at ₹50,000, and Kavach shows what the family will pay                                              |
| When a claim goes wrong | Claims, with the sample settlement letter | ₹14,560 of the deductions is recoverable; Kavach drafts the appeal letter as a PDF with matching numbers                                                                                 |
| Proof                   | `/en/proof`                               | How the numbers are checked: the rules, their sources, and the evaluation set                                                                                                            |

**How it uses Google AI**

- **Gemini on Vertex AI** (`@google/genai`) reads photographed hospital estimates, policy schedules and settlement letters into typed data, then plans and drafts letters. Each model call has a recorded fixture, so the whole app also runs with no keys.
- **Gemini Live** (native audio) runs the hospital desk as a spoken conversation in Hindi or English, with tool calls into the engine.
- **Gemini TTS and embeddings**: Hindi voice notes on WhatsApp, and clause search over policy wordings for citations.
- **One rule:** the model never computes money. Every rupee comes from `packages/engine`, a deterministic rules engine whose rules cite the policy clause or regulation they come from.
- **Runs on** Cloud Run (API), Firebase App Hosting (web), Firestore and Cloud Storage, in project `kavach-bfsi`.

**Honest limits:** some agents have only been checked against real Gemini once (see `PROGRESS.md`, ⚠️ rows), and the evaluation accuracy number needs the real wording PDFs and a live Vertex run, so we don't quote one yet. Kavach is an assistant, not an insurer, broker or adviser ([`docs/plan/11-trust-safety-compliance.md`](docs/plan/11-trust-safety-compliance.md)).

## Repository layout

```
apps/web          Next.js 16 web app (App Router, Tailwind v4, next-intl en/hi) → Firebase App Hosting
apps/api          Fastify 5 API (TypeScript, Gemini via @google/genai) → Cloud Run
packages/schemas  Zod schemas shared by web, API and engine (the contracts)
packages/engine   Deterministic rules engine: every rupee Kavach shows comes from here
data/             Rules pack, demo persona, sample documents, policy wording manifest
infra/            Firestore rules, Cloud Build and Cloud Run deploy scripts
docs/             Plan and research
```

## Running locally

Needs Node 22.12+ and pnpm 10 (`corepack enable`).

```bash
pnpm install
cp .env.example .env      # works as-is: no keys needed for local runs
pnpm dev                  # web on http://localhost:3000, API on http://localhost:8080
```

Other commands: `pnpm build`, `pnpm lint`, `pnpm typecheck`, `pnpm format`.

### Running without keys

The defaults in `.env.example` let everything run with no Google, Firebase, Meta or Twilio keys:

| Setting            | Local default | What it does                                                                          |
| ------------------ | ------------- | ------------------------------------------------------------------------------------- |
| `FAKE_LLM=1`       | on            | Every Gemini call returns a recorded fixture from `apps/api/fixtures/`                |
| `STORE=memory`     | on            | Data lives in the API process, mirrored to `.data/store.json` so it survives restarts |
| `AUTH_DISABLED=1`  | on            | The API accepts requests without a Firebase sign-in                                   |
| `GCS_BUCKET` empty | –             | Uploaded and generated files go to `.data/blobs/`                                     |

Fill in the keys in `.env` to switch each one to the real service.

## WhatsApp door

WhatsApp is a second door to the same agent: messages go through `apps/api/src/channels/whatsapp/` into the same desk core (`answer()`) as the app. Kavach replies with text, a card image (`/v1/public/cards/{token}/card.png`), a link to the full card (`/{locale}/c/{token}`) and, for a voice note, a Hindi voice note (Gemini TTS → `ffmpeg` OGG/Opus).

- **Webhooks:** Meta Cloud API at `GET/POST /v1/whatsapp/meta` (verify token, `X-Hub-Signature-256`) and Twilio at `POST /v1/whatsapp/twilio` (`X-Twilio-Signature`, computed on `PUBLIC_API_URL` + path). Unsigned or badly signed posts get `401`.
- **Consent and data:** the first message from a number gets the consent text; nothing is downloaded or read until the sender replies YES/HAAN. STOP opts out. Inbound media is held in memory only (Twilio's copy is deleted after processing); estimate photos from WhatsApp are not stored.
- **Limits:** 20 messages per number per 10 minutes; off-topic messages get a polite insurance-only reply.
- **The 24-hour window (honest limits).** WhatsApp lets a business send free-form messages only within 24 hours of the person's last message. Kavach tracks each number's last inbound time and, for proactive messages (Rahul's household alert, the dated job-change reminder), picks: free-form inside the window; outside it, the Meta utility templates `household_alert` (body variables: patient, hospital, room) and `dated_reminder` (date, action), **only once Meta has approved them**; otherwise the message is shown in the app only (`GET /v1/households/{hid}/notifications`). It never sends free-form outside a window.
- **Twilio sandbox (judges):** custom templates are not allowed, so alerts reach a phone only inside its own window. Send `RAHUL` first: it gives your number its own demo family as Rahul, so the household alert comes to you. Sandbox membership lasts 3 days, and the sandbox sends at most one message every 3 seconds, so replies can arrive a few seconds apart.
- **Meta test number (video):** sends only to up to 5 pre-verified numbers.
- **Without keys:** with no Meta/Twilio keys (or for simulated numbers) messages are recorded instead of sent. Dev only: `POST /v1/dev/whatsapp/inbound` takes Twilio's fields (`From`, `Body`, `MediaUrl0`, or multipart files; `HouseholdId` to link a number), `GET /v1/dev/whatsapp/outbox` lists what Kavach would have sent, and `POST /v1/dev/whatsapp/nudges` `{householdId, date}` sends the reminders due on a demo date. In production, Cloud Scheduler calls `POST /v1/admin/whatsapp/nudges` with `x-admin-key`.
- Settlement letters forwarded on WhatsApp are recognised, but reading them there is not built yet (they get a "coming soon" reply).

## Deploying

1. `PROJECT=<id> REGION=asia-south1 ./infra/bootstrap.sh` (once): enables APIs, creates Firestore, the bucket, the image repository and empty secrets, and gives Cloud Run's identity access to Gemini, Firestore, Storage and the secrets.
   - Spending cap (recommended before the first real Gemini call): `PROJECT=<id> BILLING_ACCOUNT=<id> AMOUNT=4500 ./infra/cap-billing.sh`. Budgets only alert, so this deploys a small Cloud Function (`infra/billing-cap/`) that detaches billing from the project when spend reaches the amount. Cost data lags usage by a few hours, so keep the amount a little under what you can afford.
2. Add secret values: `printf '%s' "<value>" | gcloud secrets versions add <NAME> --data-file=-`.
3. API: `PROJECT=<id> WEB_URL=https://<web-domain> ./infra/deploy-api.sh` (Cloud Build → Cloud Run, min 1 instance, WebSockets on). Model IDs come from the shell or `.env`; the script stops if any is still a placeholder. Secrets without a value are skipped.
4. Web: connect the repo to Firebase App Hosting with root `apps/web`; settings are in `apps/web/apphosting.yaml`.

## How features are built

Each feature is built on its own branch and git worktree, run end to end (API and web started, the flow exercised), then merged into `main`. `PROGRESS.md` tracks each feature's branch, state, what it depends on and the re-test after its dependency lands.

Conventions:

- **Contracts in `packages/schemas`.** Add or change a shape there first; web and API import the same schema.
- **Numbers only from `packages/engine`.** Agents and UI never compute or invent a rupee amount.
- **Gemini through `generateStructured()`** in `apps/api/src/lib/gemini.ts`, with a fixture in `apps/api/fixtures/` so the flow runs with `FAKE_LLM=1`.
- **Data through `store`** (`apps/api/src/store`), so it runs on Firestore and in memory.
- **API routes** are one Fastify plugin per area in `apps/api/src/routes/`, registered in `server.ts`, under `/v1`.
- **UI text** goes in `apps/web/messages/<locale>/<feature>.json` (English and Hindi), one file per feature.
- **Secrets** only in `.env` (git-ignored) or Secret Manager. Never commit keys.
