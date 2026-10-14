# 12 · Roadmap after the hackathon

**How the hackathon build becomes a business without a rewrite.** Sources: [feasibility.md](../research/feasibility.md), [market-scan.md](../research/market-scan.md).

---

## Phase 0: Hackathon (to 18 Oct 2026)
Everything in docs 01–11. Demo Day (Singapore, 4 Dec) if shortlisted.

## Phase 1: Validation (Nov–Dec 2026)
- Interviews and the concierge "family insurance check" (feasibility.md §5), using the prototype as the tool. (Out of scope for the hackathon per Kshitij, 14 Oct.)
- If shortlisted: **Singapore rules pack** for the finale (MediShield Life + Integrated Shield Plans + riders with co-payment; CPF Dependants' Protection Scheme), and a Singapore hospital scene with an Integrated Shield Plan. Needs: `data/rules/SG/`, SGD money, English + Mandarin voice.
- Conversations with 1–2 licensed brokers and 3–5 HR teams.

## Phase 2: Licensed partner and employer pilot (Q1 2027)
- Partner hand-off becomes real (broker API or referral link with consented lead data).
- **Employer product (B2B2C):** tenant model; the employer's GMC wording loaded once for all employees; job-change continuity flow triggered by HR exit data (with consent); per-employee pricing.
- WhatsApp channel for renewals and the "At the hospital" entry point (Business API, approved templates).

## Phase 3: Data rails (2027)
- **Account Aggregator** via a licensed FIU partner: insurance and bank data as `source="aa"` events (no model change; connector interface in 02 §9).
- **Bima Sugam / e-insurance accounts** when third-party access is defined.
- **Insurer APIs** for policy status and cashless pre-authorisation status.

## Phase 4: Own licence and new markets
- Apply for IRDAI broker/web-aggregator licence once traction justifies it.
- Countries as rules packs: Singapore (SGFinDex), then markets with a "base layer + private top-up" structure (market-scan.md §4).

## Technical evolution
| Area | Now | Later |
|---|---|---|
| Data | Firestore, uploads | + AA/insurer connectors, BigQuery analytics |
| Models | Gemini Pro/Flash/Live, prompt + schema | + tuned extraction on labelled wordings; larger eval set per country |
| Channels | Web PWA | + WhatsApp, Android app |
| Compliance | Guidance only | Licensed distribution, audit trail already in the event log |
