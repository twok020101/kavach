/**
 * The one door the desk screens use to reach the desk core (API routes under
 * /v1/households/{hid}/desk/sessions). The household is the one this browser remembers.
 */
import {
  CreateDeskSessionResponse,
  type DemoCheckpoint,
  DeskAnswer,
  DeskCaptureResponse,
  DeskEvaluation,
  DeskSession,
  DeskSessionSummary,
  type HospitalEstimate,
  Household,
  type Locale,
  type Member,
} from '@kavach/schemas';
import type { z } from 'zod';
import { api } from './api';
import { getIdToken } from './firebase';
import { loadCurrentHousehold } from './household';
import { startDemo, storedHouseholdId } from './session';

export type DeskHousehold = {
  householdId: string;
  hospitalName?: string;
  members: Member[];
};

export type { DeskSessionSummary };

export interface DeskClient {
  /** Household members to pick the patient from (S21). */
  getHousehold(): Promise<DeskHousehold>;
  /**
   * A demo scene is written for a checkpoint of the Sharma story (Suresh's angioplasty at
   * `hospital`, Priya's delivery at `maternity`). A demo family is moved there first, or started
   * there, so the scene meets the policy that is in force then (issue #27). A real family is
   * left alone.
   */
  prepareScene(checkpoint: DemoCheckpoint): Promise<void>;
  startSession(input: {
    patientMemberId: string;
    language: Locale;
  }): Promise<{ sessionId: string }>;
  getSession(sessionId: string): Promise<DeskSession>;
  /** Uploads a photo of the estimate (or `'sample'` for the demo estimate) and reads it. */
  capture(sessionId: string, photo: File | 'sample', fixture?: string): Promise<HospitalEstimate>;
  /** Text turn: a typed question gets an answer with cards. */
  ask(sessionId: string, text: string, language: Locale): Promise<DeskAnswer>;
  /** Direct engine result, for the Why panel and "Compare rooms". */
  evaluate(sessionId: string, language: Locale): Promise<DeskEvaluation>;
  end(sessionId: string): Promise<DeskSessionSummary>;
}

/** Calls a desk route of the current household (POST unless `method` says otherwise). */
async function desk<S extends z.ZodType>(
  path: string,
  schema: S,
  init: RequestInit & { json?: unknown } = {},
) {
  const householdId = storedHouseholdId() ?? (await loadCurrentHousehold()).id;
  return api(`/v1/households/${householdId}/desk/sessions${path}`, schema, {
    method: 'POST',
    ...init,
    token: await getIdToken(),
  });
}

export const deskClient: DeskClient = {
  async getHousehold() {
    const household = await loadCurrentHousehold();
    return { householdId: household.id, members: household.members };
  },

  async prepareScene(checkpoint) {
    if (!storedHouseholdId()) {
      await startDemo(checkpoint);
      return;
    }
    const household = await loadCurrentHousehold();
    if (!household.isDemo) return;
    await api(`/v1/households/${household.id}/demo:reset`, Household, {
      method: 'POST',
      json: { checkpoint },
      token: await getIdToken(),
    });
  },

  async startSession(input) {
    const { sessionId } = await desk('', CreateDeskSessionResponse, { json: input });
    return { sessionId };
  },

  getSession: (sessionId) => desk(`/${sessionId}`, DeskSession, { method: 'GET' }),

  async capture(sessionId, photo, fixture) {
    if (photo === 'sample') {
      const q = fixture ? `?fixture=${encodeURIComponent(fixture)}` : '';
      return (await desk(`/${sessionId}/captures:sample${q}`, DeskCaptureResponse)).estimate;
    }
    const body = new FormData();
    body.append('photo', photo);
    return (await desk(`/${sessionId}/captures`, DeskCaptureResponse, { body })).estimate;
  },

  ask: (sessionId, text, language) =>
    desk(`/${sessionId}/turns`, DeskAnswer, { json: { text, language } }),

  evaluate: (sessionId) => desk(`/${sessionId}:evaluate`, DeskEvaluation, { json: {} }),

  end: (sessionId) => desk(`/${sessionId}:end`, DeskSessionSummary),
};
