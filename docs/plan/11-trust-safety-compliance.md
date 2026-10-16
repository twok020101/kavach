# 11 · Trust, safety and compliance

> Updated 16 Oct 2026 to match red-team-response.md and implementation-plan.md.

**What keeps Kavach safe for families and on the right side of Indian regulation: advice boundaries (IRDAI), data protection (DPDP Act 2023), AI safety, disclaimers and the rule-verification process.** This is product and design guidance, not legal advice; get a lawyer's review before any real launch.

---

## 1. Regulatory position

| Topic | Position for the hackathon | Position for the business |
|---|---|---|
| **Insurance advice and distribution (IRDAI)** | Category-level guidance only ("parents need their own health cover of about ₹5–10L"). No named product recommendations. Indicative premiums from an illustrative catalogue, labelled "Illustrative". Purchase = hand-off card to "a licensed partner" (demo only) | Partner with an IRDAI-licensed broker / corporate agent / web aggregator for purchase; later apply for own licence (feasibility.md §3). Disclose commission. Comply with the final version of the Sept 2026 commission-cap proposals |
| **Acting for the customer** | Kavach drafts; the family sends. No submission to insurers, HR, TPAs or portals on the user's behalf. WhatsApp messages go only to the household's own opted-in numbers (replies, Rahul's alert, dated reminders) | Any future "act on behalf" (e.g. filing a grievance) needs explicit authorisation and a review of the relevant rules |
| **Claims help** | Analysis and draft letters from the user's own documents, with the escalation path (insurer GRO → Bima Bharosa → Insurance Ombudsman) | Consider partnering with a claims-assistance firm; check rules on paid claims assistance |
| **Data access (AA, Bima Sugam)** | Not used; uploads and forwarded WhatsApp photos only | Through a licensed FIU partner; explicit AA consent artefacts |
| **WhatsApp Business policy (Meta)** | Since 15 Jan 2026 general-purpose AI assistants are barred on the WhatsApp Business Solution; business-specific bots stay allowed (secondary source). Kavach's WhatsApp door is insurance-only and declines off-topic chat. Meta test number (video) and Twilio sandbox (judges); no public production number | Business verification, a production number and approved templates |

## 2. DPDP Act 2023 (data protection)

Kavach processes personal data, including health information and financial details, so it is designed to the Act's principles from day one:

| Principle | Implementation |
|---|---|
| **Notice** | S03 consent screen in English and Hindi: what we collect, why, how long, rights, grievance contact. On WhatsApp, the first message from each number gets a short notice and consent request (08 W1) before any photo or voice note is processed |
| **Purpose-specific consent** | Separate toggles: planning, document reading, health details, WhatsApp messages to family. Stored as `consents[]` with version and timestamp; WhatsApp consent per number in `whatsappSenders/{e164}.consent` |
| **Data minimisation** | 4 money facts instead of expense tracking; health conditions only if the user states them and consents; no Aadhaar/PAN collected (mask if present in a document) |
| **Withdrawal** | Settings → consents; withdrawal stops processing for that purpose. "STOP" on WhatsApp withdraws that number's consent and stops proactive messages |
| **Retention of WhatsApp media** | Health data passes through Meta or Twilio. Inbound photos and voice notes are downloaded, processed in memory and dropped; only the extracted result (estimate, letter fields) is stored. Outbound voice notes and card images are deleted after a day. The deck carries one line on this |
| **Rights: access, correction, erasure** | Every fact editable ("change"); export ZIP; delete household |
| **Security safeguards** | 02 §5: encryption, least privilege, no PII in logs, all client access to Firestore denied, webhook signatures verified; Meta and Twilio tokens and the webhook verify token only in Secret Manager, never `.env` in git; GitHub secret scanning on before the repo goes public |
| **Children's data** | Anaya's data is entered by her parent as part of the household; no direct use by children; minimal fields (name, age) |
| **Breach readiness** | Error reporting and an incident checklist in `docs/` |
| **Data location** | Prefer `asia-south1` (Mumbai) for storage and compute; document any model calls outside India. WhatsApp messages pass through Meta's or Twilio's infrastructure; say so in the notice |

Family members with their own login (Kamala) see the household's shared data; the owner explains this at invite time, and the invite screen states it.

## 3. AI safety at the hospital desk

| Risk | Control |
|---|---|
| Wrong number spoken | The engine builds the spoken line (`say`), and the agent must speak it verbatim; cards render from the engine trace; the WhatsApp voice note is TTS of the same `say`. Spoken amounts are checked against the cards offline on the rehearsal recordings (03 §6) |
| Wrong rule applied | Proportionate deduction only on room-priced heads, never ICU (R-HL-001/002); when the billing type is unknown the engine computes both branches and the agent asks the desk first (R-HL-010), saying the smaller ₹16,000 figure out loud rather than inventing a bigger one |
| Wrong policy interpretation | Terms extracted with citations and verified; unverified terms are not used for advice; "Confirm with the TPA desk" on every answer |
| Medical advice | Out of scope; the agent redirects to the doctor |
| Emergency delay | "Treatment comes first; cashless approval can follow" rule |
| Over-reliance | Clear framing: "Kavach helps you understand your policy. The insurer decides the claim." |
| Distress | Calm tone; short sentences; acknowledge feelings in one line |
| Elderly users | Large type, captions, voice, Hindi; nothing requires typing; the WhatsApp door works with the app she already uses |
| Live link abuse during judging (19 Oct – 6 Nov) | Per-IP and per-WhatsApp-number rate limits; 5-minute cap per live session; daily live-minutes ceiling that switches the desk to text mode; GCP budget alert |

## 4. Disclaimers (copy)

- **Global footer:** "Kavach gives guidance based on your documents and published rules. It is not an insurer, broker or agent, and the insurer decides every claim."
- **Plan:** "Sizes are guidance, not product recommendations. Premiums are illustrative."
- **Hospital:** "Estimate only. Please confirm with the insurance (TPA) desk before you sign."
- **Claims:** "This letter is a draft for you to review and send yourself."
- **Samples:** "SAMPLE — NOT A REAL DOCUMENT" on every made-up document.
- **WhatsApp:** "Kavach helps with insurance only. Confirm with the TPA desk before you sign." closes every desk reply.
- Hindi versions of all of the above in `apps/web/messages/hi/*.json`.

## 5. Rule verification process (game-plan §6)

Every rule in `packages/engine/src/rules.ts` (readable copy in `data/rules/IN/README.md`) carries `status` and `sources`. A person, not an agent, checks each **VERIFY** rule against a primary source, records it and flips `status` to `verified`. **None of the hero's rules may remain unverified at gate G1.** Status after the 16 Oct check (red-team-response.md §3, §4):

| Rule | Question to verify | Primary source to check |
|---|---|---|
| R-HL-001 | **Corrected:** ratio only on heads the tariff prices by room category, and only at hospitals with differential billing; never pharmacy, consumables, implants, devices, diagnostics or ICU. Confirmed on IRDAI/HLT/REG/CIR/151/06/2020 and filed wordings. **Remaining:** copy the 2024 master circular paragraph number (5 minutes) | IRDAI Master Circular on Health Insurance Business (29 May 2024); the 2020 circular; the specific policy wordings |
| R-HL-002 | **Replaced:** ICU charges are never proportionately deducted (the old rule had it the wrong way round). Confirmed on the 2020 circular. **Remaining:** 2024 paragraph number | Same |
| R-HL-010, R-HL-014 | Billing type unknown → both branches and one question; package rate → no ratio, ask the price. Logic built on the same circular | Same |
| R-CLM-002, R-CLM-008 | Deduction on excluded heads, on ICU, or at a hospital without differential billing is challengeable. Supported by the same circular | Same |
| R-HL-005 | Current non-payable items list | IRDAI standardisation guidelines (list of items excluded / subsumed) |
| R-HL-006 | Choice of policy when holding multiple health policies; contribution. Reported in secondary summaries of the 2024 master circular | IRDAI health regulations / master circular; wordings' "multiple policies" clause |
| R-HL-007 | Maximum PED waiting period for new retail policies | IRDAI health regulations (2024 changes) |
| Migration window (job change) | Group-to-individual migration window and waiting-period credit. Not checked yet; keep "check with HR" on screen until verified. (This was labelled R-HL-008 in earlier drafts; R-HL-008 is now the room-rent cap in the engine) | IRDAI master circular on migration/portability; the GMC wording |
| R-CLM-007 | Grievance response timelines; ombudsman eligibility (time limit, value limit). Not checked yet; until then show "within the regulatory period" without days | IRDAI grievance guidelines; Insurance Ombudsman Rules 2017 (as amended) |
| R-MT-001 | Mandatory third-party motor cover | Motor Vehicles Act |
| R-TR-001 | Schengen minimum travel medical cover | Schengen visa rules |
| Stats in the deck | 45% GMC-only; out-of-pocket share; protection gap | TATA AIG (Aug 2026), National Health Accounts, Swiss Re (market-scan.md) |

Rules that can't be verified in time stay flagged `to_verify`, are shown with "Check with your insurer" in the UI, and are listed in the README.

## 6. Fairness and inclusion

- Advice must not change by gender, religion or caste; the engine never uses them (gender only where premiums legitimately differ in the illustrative catalogue, and shown).
- Hindi is first-class, not a translation afterthought; test with native speakers in the team.
- Works on low-end Android and 4G.
