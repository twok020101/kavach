import { z } from 'zod';

/** Points in the demo story a demo household can be reset to (docs/plan/09 §1). */
export const DemoCheckpoint = z.enum(['setup', 'job_change', 'hospital', 'claim', 'maternity']);
export type DemoCheckpoint = z.infer<typeof DemoCheckpoint>;

/** The demo families: the Sharmas (Bengaluru, INR) and the Tans (Singapore, SGD). */
export const DemoPersona = z.enum(['sharma', 'tan']);
export type DemoPersona = z.infer<typeof DemoPersona>;

export const StartDemoResponse = z.object({ householdId: z.string() });
export type StartDemoResponse = z.infer<typeof StartDemoResponse>;
