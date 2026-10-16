import { DemoCheckpoint, Household, Policy } from '@kavach/schemas';
import { z } from 'zod';
import persona from '../../../../data/personas/sharma.json' with { type: 'json' };

/** Shape of data/personas/sharma.json: the setup household, a policy catalogue and the checkpoints. */
const Persona = z.object({
  household: Household.omit({ policies: true }),
  policies: z.record(z.string(), Policy),
  checkpoints: z.record(
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

const sharma = Persona.parse(persona);

/** The Sharma household as it stands at a demo checkpoint. */
export function sharmaAt(checkpoint: DemoCheckpoint): Household {
  const { asOf, policies, changes } = sharma.checkpoints[checkpoint];
  return Household.parse({
    ...structuredClone(sharma.household),
    asOf,
    policies: policies.map((id) => {
      const policy = sharma.policies[id];
      if (!policy)
        throw new Error(`sharma.json: checkpoint ${checkpoint} lists unknown policy ${id}`);
      return { ...structuredClone(policy), ...changes[id] };
    }),
  });
}

// Build every checkpoint once at startup, so a mistake in the JSON fails fast.
for (const checkpoint of DemoCheckpoint.options) sharmaAt(checkpoint);
