# 12 · Roadmap after the hackathon

> Updated 16 Oct 2026 to match red-team-response.md and implementation-plan.md.

**How the hackathon build becomes a business without a rewrite.** Sources: [feasibility.md](../research/feasibility.md), [market-scan.md](../research/market-scan.md).

---

## Phase 0: Hackathon (to 18 Oct 2026)
Everything in docs 01–11, built as layers per [implementation-plan.md](../implementation-plan.md), including the WhatsApp door (Meta test number and Twilio sandbox). Infrastructure judges never see was deferred to keep the scope: event sourcing, a separate worker, inter-labeller agreement on the eval set, and more than 8 labelled wordings. Demo Day (Singapore, 4 Dec) if shortlisted.

## Phase 1: Validation (Nov–Dec 2026)
- Interviews and the concierge "family insurance check" (feasibility.md §5), using the prototype as the tool. (Out of scope for the hackathon per Kshitij, 14 Oct.)
- If shortlisted: **Singapore rules pack** for the finale (MediShield Life + Integrated Shield Plans + riders with co-payment; CPF Dependants' Protection Scheme), and a Singapore hospital scene with an Integrated Shield Plan. Needs: `data/rules/SG/`, SGD money, English + Mandarin voice.
- Conversations with 1–2 licensed brokers and 3–5 HR teams.

## Phase 2: Licensed partner and employer pilot (Q1 2027)
- Partner hand-off becomes real (broker API or referral link with consented lead data).
- **Employer product (B2B2C):** tenant model; the employer's GMC wording loaded once for all employees; job-change continuity flow triggered by HR exit data (with consent); per-employee pricing.
- WhatsApp goes to production: Meta business verification and a public number, more approved utility templates (renewals, migration deadlines, claim status), so the year-round touches reach every family, not just the sandbox.

## Phase 3: Data rails (2027)
- **Event-sourced household:** move from plain Firestore documents to an append-only event log with a projection (timeline, diffs and audit for free; connectors become event writers). The timeline entries written today make this a replay.
- **Account Aggregator** via a licensed FIU partner: insurance and bank data as `source="aa"` facts (connector interface in 02 §9).
- **Bima Sugam / e-insurance accounts** when third-party access is defined.
- **Insurer APIs** for policy status and cashless pre-authorisation status.

## Phase 4: Own licence and new markets
- Apply for IRDAI broker/web-aggregator licence once traction justifies it.
- Countries as rules packs: Singapore (SGFinDex), then markets with a "base layer + private top-up" structure (market-scan.md §4).

## Technical evolution
| Area | Now | Later |
|---|---|---|
| Data | Firestore plain documents + timeline, uploads and WhatsApp forwards | + event sourcing, AA/insurer connectors, BigQuery analytics |
| Models | Gemini Pro/Flash/Live/TTS through `@google/genai`, prompt + Zod schema | + tuned extraction on labelled wordings; larger eval set per country (8 → 20+ wordings, two labellers) |
| Channels | Web PWA + WhatsApp (test number and sandbox) | + WhatsApp production number, Android app |
| Compliance | Guidance only | Licensed distribution, audit trail from the event log |
