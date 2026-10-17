import { IntakeResult, type Locale } from '@kavach/schemas';
import { audioLocation, generateStructured, generateText, models } from '../lib/gemini';
import { toGeminiAudio } from '../lib/speech';

/** IntakeAgent system instruction (S04, FR-H-01). */
const INTAKE_SYSTEM = `You turn one sentence about a family, typed or spoken in English, Hindi or a mix, into a list of the people in it.

TASK
1. List every person: the speaker first (relation "self"), then spouse, children, parents, parents-in-law, others.
2. name: their name if given. If not, a short label in the family's language ("Me", "Father", "Mother", "माँ") and named=false.
3. age: only if said or exactly derivable. Ages are often spoken, so read them in every form: digits or words,
   English or Hindi ("sixty-two", "बासठ", "62 saal ke hain", "age 58", "58 ki hain"); a pair for two people in the
   order the people were named ("my parents, 62 and 58" → the first parent 62, the second 58); or a birth year
   ("born in 1964" → today's year minus 1964). Attach each age to the person named just before it.
   Before answering, check every person once more: if a number was spoken near their name, they have an age.
   Otherwise null. Never guess an age.
4. earning: true/false only if said, or obvious (a 5-year-old child is not earning; the speaker who talks about "my parents depend on me" is earning). Put "earning" in assumed when you inferred it. Otherwise null.
5. conditions: health conditions mentioned for that person, as short snake_case ids (diabetes_t2, hypertension, heart_disease, asthma).
6. language: "hi" only if the family says this person speaks Hindi; otherwise null.
7. city: the city they live in, if said. familyName: a surname if said ("the Sharmas" → "Sharma"), else null.

RULES
- Use only what the family said. Never invent people, ages, incomes or illnesses.
- Output JSON matching the schema only.`;

const TRANSCRIBE_SYSTEM = `Transcribe the recording word for word, in the language spoken: Hindi in Devanagari, English in Latin letters, a mix as spoken. Write every number as digits (e.g. "sixty-two" → 62, "बासठ" → 62). Do not summarise, translate or add anything.`;

/**
 * IntakeAgent: "Me, my wife Priya, daughter Anaya, and my parents in Pune" → the people to confirm on S05.
 * A voice note is transcribed first (numbers as digits), then the transcript is parsed, which keeps
 * spoken ages far more reliably than reading people straight off the audio. The transcript is
 * returned so the family can see what was heard.
 */
export async function parseFamily(input: {
  text?: string;
  audio?: { mimeType: string; data: string };
  locale: Locale;
}): Promise<IntakeResult> {
  let text = input.text?.trim();
  if (input.audio) {
    const audio = await toGeminiAudio(input.audio);
    const heard = await generateText({
      model: models.audio,
      location: audioLocation,
      contents: [{ role: 'user', parts: [{ inlineData: audio }, { text: TRANSCRIBE_SYSTEM }] }],
      fixture: 'intake-transcript',
    });
    text = [text, heard].filter(Boolean).join('\n');
  }
  const today = new Date().toISOString().slice(0, 10);
  const result = await generateStructured({
    model: models.flash,
    schema: IntakeResult,
    systemInstruction: INTAKE_SYSTEM,
    contents: [
      {
        role: 'user',
        parts: [
          { text: `Today's date: ${today}. The family's preferred language: ${input.locale}` },
          { text: `The family says: """${text ?? ''}"""` },
        ],
      },
    ],
    fixture: 'intake-family',
  });
  return { ...result, transcript: text ?? null };
}
