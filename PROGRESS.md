# Build progress

Each feature is built on its own branch and worktree, tested by running it, then merged into `main`. When a feature depends on another branch, the dependency is listed here; once that branch is merged, the dependent feature is re-tested against it and the result is recorded below.

Work packages (WP) refer to [`docs/implementation-plan.md`](docs/implementation-plan.md) §4.

**States:** ⏳ not started · 🔨 in progress · ✅ merged · ⚠️ merged, needs a live-key check

## Features

| Feature                              | WP   | Branch                         | State | Depends on                                         | Notes                                                                                                                                                    |
| ------------------------------------ | ---- | ------------------------------ | ----- | -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Base project setup                   | 0    | `claude/project-thread-azp2sp` | ✅    | –                                                  | Monorepo, web, API, schemas, engine skeleton, infra, CI                                                                                                  |
| Rules engine                         | 1    | `feat/engine`                  | ✅    | Demo household                                     | PR #6. Hospital and claim rules, HX-1/CX-1 checks (`pnpm --filter @kavach/engine check`)                                                                 |
| Demo household                       | 7    | `feat/demo-household`          | ✅    | –                                                  | PR #4. Sharma persona, demo checkpoints and clock                                                                                                        |
| Sample documents                     | 7    | `feat/samples`                 | ✅    | –                                                  | PR #5. Estimate, letters, schedules in `data/samples`                                                                                                    |
| Design system, landing, desk screens | 2, 3 | `feat/web-design`              | ✅    | Demo household, engine                             | PR #7                                                                                                                                                    |
| Plan-doc updates                     | 13   | `docs/plan-updates`            | ✅    | –                                                  | PR #9                                                                                                                                                    |
| Desk core and estimate reader        | 3, 4 | `feat/desk-core`               | ⚠️    | Engine, demo household, design system              | PR #10. Estimate reader needs a real Gemini Pro check                                                                                                    |
| Documents and citations              | 8    | `feat/documents`               | ⚠️    | Design system                                      | PR #11. Doc reader, clause segmentation and embeddings need real keys; then rerun `pnpm ingest`                                                          |
| Job change                           | 9    | `feat/job-change`              | ⚠️    | Engine, design system, documents                   | PR #13. LifeEventAgent needs a real Gemini check; R-MG-001 migration window to_verify. Nudge hook `apps/api/src/letters/nudges.ts` for the WhatsApp door |
| WhatsApp door                        | 5    | `feat/whatsapp`                | 🔨    | Desk core; job change and claim appeal for layer 2 | Needs Meta/Twilio keys for a real send                                                                                                                   |
| Live desk (audio)                    | 6    | `feat/live-desk`               | 🔨    | Desk core, documents                               | Real phone check needs Vertex live model                                                                                                                 |
| Claim appeal                         | 10   | `feat/claim-appeal`            | 🔨    | Engine, documents, samples                         |                                                                                                                                                          |
| Proof page and evals                 | 11   | `feat/proof-evals`             | 🔨    | Documents                                          | Labels need Jai's check                                                                                                                                  |
| Remaining screens and onboarding     | 12   | `feat/screens`                 | 🔨    | Design system, job change, documents               |                                                                                                                                                          |

## Dependency re-tests

| Feature       | Dependency                                        | Re-tested after it merged                                                    | Result                                                                                 |
| ------------- | ------------------------------------------------- | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Engine        | Demo household (`copayFromAge`, persona policies) | Yes: merged main, reran the engine check                                     | All HX-1/CX-1 numbers still match; co-pay applies only from 61                         |
| Design system | Demo household, engine                            | Yes: merged main, lint/typecheck/build, landing and desk loaded in Chromium  | Works on mock data; real data arrives with the desk core                               |
| Desk core     | Design system, plan docs                          | Yes: merged main, built, ran API with FAKE_LLM                               | Sample capture for Suresh in Hindi returns ₹90,000 saving and the Hindi line           |
| Documents     | Desk core                                         | Yes: merged main (server.ts, Dockerfile conflicts kept both), built, ran API | Three samples read, clause search ranks ICU §3.3 first, desk sessions still work       |
| Job change    | Design system, desk core, documents               | Yes: merged main, engine check, built API, recorded the change               | PX-1 checks pass; three actions drafted; desk hero still ₹90,000 after persona changes |

## Waiting on keys or people

| Item                                                                                                                   | Needed for                                | Who     |
| ---------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- | ------- |
| Google Cloud project, billing, Vertex AI model IDs                                                                     | Real Gemini calls (`FAKE_LLM=0`), deploy  | Kshitij |
| Firebase project + web config                                                                                          | Firestore, anonymous sign-in, App Hosting | Kshitij |
| Meta WhatsApp test number, token, app secret, verify token; two utility templates                                      | WhatsApp door in the video                | Kshitij |
| Twilio account + WhatsApp sandbox                                                                                      | WhatsApp door for judges                  | Kshitij |
| IRDAI 2024 master circular paragraph numbers                                                                           | Marking hero rules `verified`             | Jai     |
| Turn on CI: move `infra/github-ci.yml` to `.github/workflows/ci.yml` (Claude's GitHub access can't add workflow files) | Lint, typecheck and build on every PR     | Kshitij |
| Exact submission cut-off time                                                                                          | Gate times                                | Kshitij |
