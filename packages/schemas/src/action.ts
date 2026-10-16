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
  createdAt: z.string().datetime(),
});
export type Action = z.infer<typeof Action>;
