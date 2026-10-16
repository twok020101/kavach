import { IntakeResult, type Locale } from '@kavach/schemas';
import type { ContentListUnion } from '@google/genai';
import { generateStructured, models } from '../lib/gemini';

/** IntakeAgent system instruction (S04, FR-H-01). */
const INTAKE_SYSTEM = `You turn one sentence about a family, typed or spoken in English, Hindi or a mix, into a list of the people in it.

TASK
1. List every person: the speaker first (relation "self"), then spouse, children, parents, parents-in-law, others.
2. name: their name if given. If not, a short label in the family's language ("Me", "Father", "Mother", "माँ") and named=false.
3. age: only if said or exactly derivable ("she is 5"). Otherwise null. Never guess an age.
4. earning: true/false only if said, or obvious (a 5-year-old child is not earning; the speaker who talks about "my parents depend on me" is earning). Put "earning" in assumed when you inferred it. Otherwise null.
5. conditions: health conditions mentioned for that person, as short snake_case ids (diabetes_t2, hypertension, heart_disease, asthma).
6. language: "hi" only if the family says this person speaks Hindi; otherwise null.
7. city: the city they live in, if said. familyName: a surname if said ("the Sharmas" → "Sharma"), else null.

RULES
- Use only what the family said. Never invent people, ages, incomes or illnesses.
- Output JSON matching the schema only.`;

/** IntakeAgent: "Me, my wife Priya, daughter Anaya, and my parents in Pune" → the people to confirm on S05. */
export async function parseFamily(input: {
  text?: string;
  audio?: { mimeType: string; data: string };
  locale: Locale;
}) {
  const contents: ContentListUnion = [
    {
      role: 'user',
      parts: [
        { text: `The family's preferred language: ${input.locale}` },
        ...(input.text ? [{ text: `The family says: """${input.text}"""` }] : []),
        ...(input.audio ? [{ inlineData: input.audio }] : []),
      ],
    },
  ];
  return generateStructured({
    model: models.flash,
    schema: IntakeResult,
    systemInstruction: INTAKE_SYSTEM,
    contents,
    fixture: 'intake-family',
  });
}
