# 11 · Trust, safety and compliance

**What keeps Kavach safe for families and on the right side of Indian regulation: advice boundaries (IRDAI), data protection (DPDP Act 2023), AI safety, disclaimers and the rule-verification process.** This is product and design guidance, not legal advice; get a lawyer's review before any real launch.

---

## 1. Regulatory position

| Topic | Position for the hackathon | Position for the business |
|---|---|---|
| **Insurance advice and distribution (IRDAI)** | Category-level guidance only ("parents need their own health cover of about ₹5–10L"). No named product recommendations. Indicative premiums from an illustrative catalogue, labelled "Illustrative". Purchase = hand-off card to "a licensed partner" (demo only) | Partner with an IRDAI-licensed broker / corporate agent / web aggregator for purchase; later apply for own licence (feasibility.md §3). Disclose commission. Comply with the final version of the Sept 2026 commission-cap proposals |
| **Acting for the customer** | Kavach drafts; the family sends. No submission to insurers, HR, TPAs or portals on the user's behalf | Any future "act on behalf" (e.g. filing a grievance) needs explicit authorisation and a review of the relevant rules |
| **Claims help** | Analysis and draft letters from the user's own documents, with the escalation path (insurer GRO → Bima Bharosa → Insurance Ombudsman) | Consider partnering with a claims-assistance firm; check rules on paid claims assistance |
| **Data access (AA, Bima Sugam)** | Not used; uploads only | Through a licensed FIU partner; explicit AA consent artefacts |

## 2. DPDP Act 2023 (data protection)

Kavach processes personal data, including health information and financial details, so it is designed to the Act's principles from day one:

| Principle | Implementation |
|---|---|
| **Notice** | S03 consent screen in English and Hindi: what we collect, why, how long, rights, grievance contact |
| **Purpose-specific consent** | Separate toggles: planning, document reading, health details. Stored as `consents[]` with version and timestamp |
| **Data minimisation** | 4 money facts instead of expense tracking; health conditions only if the user states them and consents; no Aadhaar/PAN collected (mask if present in a document) |
| **Withdrawal** | Settings → consents; withdrawal stops processing for that purpose |
| **Rights: access, correction, erasure** | Every fact editable ("change"); export ZIP; delete household |
| **Security safeguards** | 02 §5: encryption, least privilege, no PII in logs, rules tests |
| **Children's data** | Anaya's data is entered by her parent as part of the household; no direct use by children; minimal fields (name, age) |
| **Breach readiness** | Error reporting and an incident checklist in `docs/` |
| **Data location** | Prefer `asia-south1` (Mumbai) for storage and compute; document any model calls outside India |

Family members with their own login (Kamala) see the household's shared data; the owner explains this at invite time, and the invite screen states it.

## 3. AI safety at the hospital desk

| Risk | Control |
|---|---|
| Wrong number spoken | Numbers only from tool results (prompt rule); after-turn number check against tool outputs; spoken correction if mismatch (03 §6) |
| Wrong policy interpretation | Terms extracted with citations and verified; unverified terms are not used for advice; "Confirm with the TPA desk" on every answer |
| Medical advice | Out of scope; the agent redirects to the doctor |
| Emergency delay | "Treatment comes first; cashless approval can follow" rule |
| Over-reliance | Clear framing: "Kavach helps you understand your policy. The insurer decides the claim." |
| Distress | Calm tone; short sentences; acknowledge feelings in one line |
| Elderly users | Large type, captions, voice, Hindi; nothing requires typing |

## 4. Disclaimers (copy)

- **Global footer:** "Kavach gives guidance based on your documents and published rules. It is not an insurer, broker or agent, and the insurer decides every claim."
- **Plan:** "Sizes are guidance, not product recommendations. Premiums are illustrative."
- **Hospital:** "Estimate only. Please confirm with the insurance (TPA) desk before you sign."
- **Claims:** "This letter is a draft for you to review and send yourself."
- **Samples:** "SAMPLE — NOT A REAL DOCUMENT" on every made-up document.
- Hindi versions of all of the above in `messages/hi.json`.

## 5. Rule verification process (game-plan §6)

Every rule in `data/rules/IN/*.yaml` carries `status` and `sources`. Before submission, a person checks each **VERIFY** rule against a primary source and records it:

| Rule | Question to verify | Primary source to check |
|---|---|---|
| R-HL-001/002 | Does proportionate deduction still apply, and which heads are excluded? | IRDAI Master Circular on Health Insurance Business (May 2024) and the standardisation guidelines it consolidates; the specific policy wordings |
| R-HL-005 | Current non-payable items list | IRDAI standardisation guidelines (list of items excluded / subsumed) |
| R-HL-006 | Choice of policy when holding multiple health policies; contribution | IRDAI health regulations / master circular; wordings' "multiple policies" clause |
| R-HL-007 | Maximum PED waiting period for new retail policies | IRDAI health regulations (2024 changes) |
| R-HL-008 / migration | Group-to-individual migration window and waiting-period credit | IRDAI master circular on migration/portability; the GMC wording |
| R-CLM-007 | Grievance response timelines; ombudsman eligibility (time limit, value limit) | IRDAI grievance guidelines; Insurance Ombudsman Rules 2017 (as amended) |
| R-MT-001 | Mandatory third-party motor cover | Motor Vehicles Act |
| R-TR-001 | Schengen minimum travel medical cover | Schengen visa rules |
| Stats in the deck | 45% GMC-only; out-of-pocket share; protection gap | TATA AIG (Aug 2026), National Health Accounts, Swiss Re (market-scan.md) |

Rules that can't be verified in time stay flagged `to_verify`, are shown with "Check with your insurer" in the UI, and are listed in the README.

## 6. Fairness and inclusion

- Advice must not change by gender, religion or caste; the engine never uses them (gender only where premiums legitimately differ in the illustrative catalogue, and shown).
- Hindi is first-class, not a translation afterthought; test with native speakers in the team.
- Works on low-end Android and 4G.
