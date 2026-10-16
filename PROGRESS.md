# Build progress

Each feature is built on its own branch and worktree, tested by running it, then merged into `main`. When a feature depends on another branch, the dependency is listed here; once that branch is merged, the dependent feature is re-tested against it and the result is recorded below.

Work packages (WP) refer to [`docs/implementation-plan.md`](docs/implementation-plan.md) §4.

**States:** ⏳ not started · 🔨 in progress · ✅ merged · ⚠️ merged, needs a live-key check

## Features

| Feature            | WP  | Branch                         | State | Depends on | Notes                                                   |
| ------------------ | --- | ------------------------------ | ----- | ---------- | ------------------------------------------------------- |
| Base project setup | 0   | `claude/project-thread-azp2sp` | ✅    | –          | Monorepo, web, API, schemas, engine skeleton, infra, CI |

## Dependency re-tests

| Feature | Dependency | Re-tested after it merged | Result |
| ------- | ---------- | ------------------------- | ------ |

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
