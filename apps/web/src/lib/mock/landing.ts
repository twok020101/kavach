/**
 * Headline numbers on the landing page, from the engine's worked examples
 * (docs/research/red-team-response.md §3): HX-1 saving and CX-1 recoverable amount.
 * The City Heart section itself runs the engine on HX-1 (components/landing/data.ts); these
 * stay for the places that only need one figure.
 */
export const landingNumbers = {
  hospitalSaving: 90000,
  claimRecoverable: 14560,
  /** HX-1 out of pocket in the quoted (deluxe) room and in the room within the limit. */
  hx1Deluxe: 150800,
  hx1Standard: 60800,
  /** People in the Sharma demo household (data/personas/sharma.json). */
  familyMembers: 5,
};
