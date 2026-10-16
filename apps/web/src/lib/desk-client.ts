/**
 * The one door the desk screens use to reach the desk core.
 * Today it is the mock in lib/mock/desk.ts; when the API's desk routes land (WP-3),
 * implement `DeskClient` with `api()` from lib/api.ts and export that instead.
 */
import type {
  DeskAnswer,
  DeskEvaluation,
  DeskSession,
  HospitalEstimate,
  Locale,
  Member,
} from '@kavach/schemas';
import { mockDeskClient } from './mock/desk';

export type DeskHousehold = {
  householdId: string;
  hospitalName?: string;
  members: Member[];
};

export type DeskSessionSummary = {
  session: DeskSession;
  /** The same summary in both languages, so the family can share either. */
  summary: Record<Locale, string>;
};

export interface DeskClient {
  /** Household members to pick the patient from (S21). */
  getHousehold(): Promise<DeskHousehold>;
  startSession(input: {
    patientMemberId: string;
    language: Locale;
  }): Promise<{ sessionId: string }>;
  getSession(sessionId: string): Promise<DeskSession>;
  /** Uploads a photo of the estimate (or `'sample'` for the demo estimate) and reads it. */
  capture(sessionId: string, photo: File | 'sample'): Promise<HospitalEstimate>;
  /** Text turn: a typed question gets an answer with cards. */
  ask(sessionId: string, text: string, language: Locale): Promise<DeskAnswer>;
  /** Direct engine result, for the Why panel and "Compare rooms". */
  evaluate(sessionId: string, language: Locale): Promise<DeskEvaluation>;
  end(sessionId: string): Promise<DeskSessionSummary>;
}

export const deskClient: DeskClient = mockDeskClient;
