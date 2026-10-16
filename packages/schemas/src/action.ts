import { z } from 'zod';

/** Something Kavach drafted for the family to approve: a letter, a reminder, an appeal. */
export const Action = z.object({
  id: z.string(),
  householdId: z.string(),
  kind: z.enum(['migration_letter', 'reminder', 'grievance_letter']),
  title: z.string(),
  dueDate: z.string().date().optional(),
  content: z.string(),
  pdfPath: z.string().optional(),
  status: z.enum(['draft', 'approved', 'done', 'dismissed']),
  /** Who the action is for (a reminder goes to this member on WhatsApp). */
  memberId: z.string().optional(),
  /** Another action this one is about, e.g. the letter a reminder points to. */
  relatedActionId: z.string().optional(),
  /** Who a letter is addressed to, e.g. "HR, Acme Software". */
  recipient: z.string().optional(),
  /** The life change that drafted this action. */
  lifeChangeId: z.string().optional(),
  createdAt: z.string().datetime(),
});
export type Action = z.infer<typeof Action>;
