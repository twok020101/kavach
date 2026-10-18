# Stitch layouts, adopted within 07

**Date:** 18 Oct 2026. **Decision by:** Jai ("adopt the layouts, keep 07 and the engine").

## Source

Google Stitch project "UI Modernization and Redesign" (id 1117529794156917346), generated from
the uploaded `07-design-system.md`, `11-trust-safety-compliance.md` and `game-plan.md`. Eleven
desktop screens, fetched through the Stitch MCP server on 18 Oct (images and HTML kept outside
the repo, in the session scratchpad). Because Stitch had the 07 document, its output already
uses Plus Jakarta Sans, Inter, Source Serif 4 and the Kavach indigo and marigold, and its
information architecture matches the screens that exist: the home dashboard is our Home with
the same seven sections; the plan and consent screens are ours with more chrome.

## What we take

| Stitch screen                    | Taken into the app                                                                                                                                                                                |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 06 Home dashboard                | The chosen cover cell opens **in place under the map on a laptop** (an inspector card with Needs / Has, the policies by layer, "See the fix in your plan" and the Why disclosure); a sheet on a phone. |
| 07 Plan                          | The budget meter is labelled with what the plan uses and what is left; each "thing to review" links to its policy.                                                                               |
| 04 Consent                       | Each purpose card carries an **Essential** or **Optional** badge; a live count says how many permissions are on.                                                                                   |
| 08 / 10 / 11 Hospital desk       | The read estimate opens into its **line items** for the quoted room, each marked with what the policy does to it (not payable, above the room limit, reduced with the room, ICU never reduced), with the engine's totals under it. Every "ask the desk" line gets a copy button. |

Everything else on those screens already existed (score ring, coming-up dates, ready panel,
quick actions, room comparison, rules applied, share to family).

## What we leave out, and why

- **Screens 01 and 02 (dark gateway and loader).** A dark glowing page before the landing is the
  "flashy" register Jai rejected on 17 Oct; the trust decision stands.
- **Compliance claims:** "IRDAI compliant framework", "ISO 27001 and DPDP compliant", "98.4%
  IRDAI settlement", "IRDAI Web Aggregator Reg. 104", "Secure Gateway v2.0", "ISO 2025 ready".
  None is true; 11 §4 forbids implying regulatory standing.
- **Typed figures:** "98 % installing", "67 % utilised", "32 ms latency", "44.4 % cut risk", a
  ₹5,00,00 room limit. Every figure on screen comes from the engine (the rupee amounts Stitch
  copied from our screenshots, such as the ₹3,77,50,000 life gap, are the engine's already).
- **"Cloudnine"** in screen 10: a real hospital brand. The scene stays at the fictional Lotus
  Women's Hospital.
- **Gradients, the glowing orb with ripple rings, raised card shadows, Material Symbols.** The
  plain register (17 Oct spec) and 07 elevation 0 win; lucide stays the icon set.
- **The sidebar's phone number and notification bell.** There is no call centre.

## Rules kept

07 type, radii and page colour; 48 px targets (64 on the desk); status never by colour alone;
EN and HI strings together; rule ids only in the Why panel and Proof; 11 §4 disclaimers.
