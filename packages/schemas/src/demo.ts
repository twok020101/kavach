import { z } from 'zod';

/** Points in the demo story a demo household can be reset to (docs/plan/09 §1). */
export const DemoCheckpoint = z.enum(['setup', 'job_change', 'hospital', 'claim', 'maternity']);
export type DemoCheckpoint = z.infer<typeof DemoCheckpoint>;

export const StartDemoResponse = z.object({ householdId: z.string() });
export type StartDemoResponse = z.infer<typeof StartDemoResponse>;
