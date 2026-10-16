import { ChangeSet, type Household } from '@kavach/schemas';
import { generateStructured, models } from '../lib/gemini';
import { LIFE_EVENT_SYSTEM, lifeEventContext } from './life-event.prompt';

/** LifeEventAgent: the family's words ("Joining a startup on 1 Dec") → a typed change set to confirm. */
export async function parseLifeChange(household: Household, today: string, text: string) {
  return generateStructured({
    model: models.flash,
    schema: ChangeSet,
    systemInstruction: LIFE_EVENT_SYSTEM,
    contents: lifeEventContext(household, today, text),
    fixture: 'life-event-job-change',
  });
}
