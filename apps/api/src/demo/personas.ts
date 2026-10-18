import { DemoCheckpoint, DemoPersona, Household, Policy } from '@kavach/schemas';
import { z } from 'zod';
import sharma from '../../../../data/personas/sharma.json' with { type: 'json' };
import tan from '../../../../data/personas/tan.json' with { type: 'json' };

/** Shape of data/personas/*.json: the setup household, a policy catalogue and the checkpoints. */
const Persona = z.object({
  household: Household.omit({ policies: true }),
  policies: z.record(z.string(), Policy),
  checkpoints: z.partialRecord(
    DemoCheckpoint,
    z.object({
      asOf: z.iso.date(),
      /** Policy ids in force (or already bought) at this checkpoint. */
      policies: z.array(z.string()),
      /** Field changes to those policies at this checkpoint (checked when the household is built). */
      changes: z.record(z.string(), z.record(z.string(), z.unknown())).default({}),
    }),
  ),
});

/** The demo families: the Sharmas (Bengaluru) and the Tans (Singapore). */
const PERSONAS: Record<DemoPersona, z.infer<typeof Persona>> = {
  sharma: Persona.parse(sharma),
  tan: Persona.parse(tan),
};

/** A demo family as it stands at a checkpoint of its story. */
export function personaAt(persona: DemoPersona, checkpoint: DemoCheckpoint): Household {
  const data = PERSONAS[persona];
  const point = data.checkpoints[checkpoint];
  if (!point) {
    throw Object.assign(new Error(`The ${persona} family has no "${checkpoint}" checkpoint`), {
      statusCode: 400,
    });
  }
  const { asOf, policies, changes } = point;
  return Household.parse({
    ...structuredClone(data.household),
    asOf,
    policies: policies.map((id) => {
      const policy = data.policies[id];
      if (!policy)
        throw new Error(`${persona}.json: checkpoint ${checkpoint} lists unknown policy ${id}`);
      return { ...structuredClone(policy), ...changes[id] };
    }),
  });
}

/** Which family a demo household was cloned from: the Tans are the Singapore one. */
export const personaOf = (household: Pick<Household, 'country'>): DemoPersona =>
  household.country === 'SG' ? 'tan' : 'sharma';

// Build every checkpoint once at startup, so a mistake in the JSON fails fast.
for (const persona of DemoPersona.options) {
  for (const checkpoint of Object.keys(PERSONAS[persona].checkpoints) as DemoCheckpoint[]) {
    personaAt(persona, checkpoint);
  }
}
