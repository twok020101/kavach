# Kavach

The AI that stands beside your family at every insurance moment.

Google Cloud AI Builder Cup 2026, BFSI track. Kavach remembers a household's insurance and acts at three moments: when life changes, at the hospital desk (live, in Hindi), and when a claim goes wrong.

- Plan: [`docs/implementation-plan.md`](docs/implementation-plan.md) (how we build it) and [`docs/plan`](docs/plan/README.md) (what we build)
- Build status: [`PROGRESS.md`](PROGRESS.md)

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

| Setting            | Local default | What it does                                                           |
| ------------------ | ------------- | ---------------------------------------------------------------------- |
| `FAKE_LLM=1`       | on            | Every Gemini call returns a recorded fixture from `apps/api/fixtures/` |
| `STORE=memory`     | on            | Data lives in the API process instead of Firestore (lost on restart)   |
| `AUTH_DISABLED=1`  | on            | The API accepts requests without a Firebase sign-in                    |
| `GCS_BUCKET` empty | –             | Uploaded and generated files go to `.data/blobs/`                      |

Fill in the keys in `.env` to switch each one to the real service.

## Deploying

1. `PROJECT=<id> REGION=asia-south1 ./infra/bootstrap.sh` (once): enables APIs, creates Firestore, the bucket, the image repository and empty secrets.
2. Add secret values: `printf '%s' "<value>" | gcloud secrets versions add <NAME> --data-file=-`.
3. API: `PROJECT=<id> ./infra/deploy-api.sh` (Cloud Build → Cloud Run, min 1 instance, WebSockets on).
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
