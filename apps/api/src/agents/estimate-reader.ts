import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { formatMoney, type Country } from '@kavach/engine';
import { HospitalEstimate, type EstimateLine } from '@kavach/schemas';
import type { z } from 'zod';
import { generateStructured, models } from '../lib/gemini';
import { appRoot } from '../paths';

const prompt = readFileSync(resolve(appRoot, 'src/agents/prompts/estimate-reader.md'), 'utf8');

/** The market line appended to the prompt: the reader never converts, it reads the family's currency. */
const MARKET: Record<Country, string> = {
  IN: '## The family\n\nThe family is in India. Amounts are Indian rupees (₹). Room categories are hospital room types (General Ward, Twin Sharing, Deluxe…); leave `wardClass` out.',
  SG: '## The family\n\nThe family is in Singapore. Amounts are Singapore dollars (S$). Room categories are ward classes (C, B2, B1, A) or a private hospital room; set `wardClass` on each.',
};

export type EstimateImage = { data: Buffer; mimeType: string };

/**
 * Reads photos of a hospital estimate into a HospitalEstimate with the Pro model, then checks
 * the arithmetic in code. Anything that doesn't add up comes back with `needsConfirmation`.
 *
 * `fixture` picks the recorded reading used with FAKE_LLM=1; `country` tells the reader which
 * market's currency and room conventions to expect.
 */
export async function readEstimate(
  images: EstimateImage[],
  { fixture = 'estimate-city-heart', country = 'IN' }: { fixture?: string; country?: Country } = {},
): Promise<HospitalEstimate> {
  if (images.length === 0) throw new Error('No estimate image');
  const reading = await generateStructured({
    model: models.pro,
    schema: HospitalEstimate,
    systemInstruction: `${prompt}\n${MARKET[country]}\n`,
    contents: [
      {
        role: 'user',
        parts: [
          ...images.map((img) => ({
            inlineData: { data: img.data.toString('base64'), mimeType: img.mimeType },
          })),
          { text: 'Read this hospital estimate.' },
        ],
      },
    ],
    fixture,
    repair: repairReading,
  });
  return checkEstimate(reading, country);
}

/**
 * The model's JSON did not fit the schema. That happens for a photo that is not an estimate
 * (it answers with `days: 0` and no lines, as the prompt asks, which the strict schema rejects)
 * or for decimals and odd types. Round the numbers and make the stay at least a day, and if it
 * still does not fit, hand back an empty estimate that must be confirmed, with the reason, so
 * the desk says "check the estimate first" instead of failing.
 */
export function repairReading(raw: unknown, issues: z.ZodError): HospitalEstimate {
  const fixed = roundNumbers(raw) as Record<string, unknown>;
  if (typeof fixed.days !== 'number' || !(fixed.days >= 1)) fixed.days = 1;
  const second = HospitalEstimate.safeParse({ ...fixed, needsConfirmation: true });
  const notes = Array.isArray(fixed.notes) ? fixed.notes.filter((n) => typeof n === 'string') : [];
  const hasLines = Array.isArray(fixed.lines) && fixed.lines.length > 0;
  // A package poster has no lines, only a price per room; it is still an estimate.
  const hasPackage =
    !!fixed.packagePrices &&
    typeof fixed.packagePrices === 'object' &&
    Object.keys(fixed.packagePrices as object).length > 0;
  if (second.success && (hasLines || hasPackage)) {
    return {
      ...second.data,
      notes: [...second.data.notes, 'Some fields were adjusted while reading; please check them.'],
    };
  }
  const reason = issues.issues
    .slice(0, 3)
    .map((i) => `${i.path.join('.') || 'estimate'}: ${i.message}`)
    .join('; ');
  return {
    hospitalName: typeof fixed.hospitalName === 'string' ? fixed.hospitalName : 'Unknown hospital',
    procedure: typeof fixed.procedure === 'string' ? fixed.procedure : 'Unknown',
    treatment: 'general',
    admissionType: 'planned',
    days: 1,
    billingType: 'unknown',
    roomCategories: [{ id: 'unknown', label: 'Unknown room', rentPerDay: 0 }],
    lines: [],
    needsConfirmation: true,
    notes: [
      ...(notes as string[]),
      `This could not be read as a hospital estimate (${reason}). Take a photo of the printed estimate with the room charges, or type the numbers.`,
    ],
  };
}

/** Whole rupees everywhere: rounds every number in the model's JSON (estimates print no paise). */
function roundNumbers(value: unknown): unknown {
  if (typeof value === 'number') return Number.isFinite(value) ? Math.round(value) : 0;
  if (Array.isArray(value)) return value.map(roundNumbers);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, roundNumbers(v)]),
    );
  }
  return value;
}

/** Deterministic checks on what the model read. Fixes only what is certain; flags the rest. */
export function checkEstimate(
  reading: HospitalEstimate,
  country: Country = 'IN',
): HospitalEstimate {
  const money = (n: number) => formatMoney(n, country);
  const notes = [...reading.notes];
  let unsure = reading.needsConfirmation;
  const flag = (note: string) => {
    notes.push(note);
    unsure = true;
  };

  const packaged =
    reading.billingType === 'package' &&
    Object.keys(reading.packagePrices ?? {}).length > 0 &&
    reading.roomCategories.some((r) => reading.packagePrices?.[r.id] !== undefined);
  if (reading.lines.length === 0 && !packaged) {
    // Nothing to check: say so once (the reader's own note says what the photo shows).
    flag('No charges could be read from the estimate.');
    return { ...reading, needsConfirmation: true, notes };
  }
  // A package list prices whole rooms; its categories must each carry a package price.
  if (packaged) {
    const unpriced = reading.roomCategories.filter(
      (r) => reading.packagePrices?.[r.id] === undefined,
    );
    for (const r of unpriced) notes.push(`${r.label}: no package price printed; ask the desk.`);
  }

  // Estimates often print a rent-only tariff table (General Ward … Suite) next to charges
  // priced for two or three rooms. A category with no charge in any line and no printed
  // total is tariff-only: the desk cannot compare it, so it is set aside with a note rather
  // than flagged as unreadable. The quoted room (first) always stays.
  const priced = (id: string) =>
    reading.lines.some((l) => l.amounts[id] !== undefined) ||
    reading.printedTotals?.[id] !== undefined ||
    reading.packagePrices?.[id] !== undefined;
  const tariffOnly = reading.roomCategories.filter((r, i) => i > 0 && !priced(r.id));
  const rooms = reading.roomCategories.filter((r) => !tariffOnly.includes(r));
  if (tariffOnly.length > 0) {
    notes.push(
      `Tariff lists ${tariffOnly.map((r) => `${r.label} (${money(r.rentPerDay)}/day)`).join(', ')} without estimated charges; ask the desk for an estimate in that room if needed.`,
    );
  }

  const roomIds = new Set(rooms.map((r) => r.id));
  if (roomIds.size !== rooms.length) flag('Two room categories have the same id.');

  const lines = reading.lines.map((line) => withConsistentPricing(line, rooms.length, notes));

  for (const line of lines) {
    for (const id of Object.keys(line.amounts)) {
      if (!roomIds.has(id)) flag(`"${line.label}" has an amount for an unknown room "${id}".`);
    }
  }

  for (const room of rooms) {
    // Room rent should be rent per day × days charged.
    const roomLine = lines.find((l) => l.head === 'room');
    const charged = roomLine?.amounts[room.id];
    const days = roomLine?.days ?? reading.days;
    if (charged !== undefined && charged !== room.rentPerDay * days) {
      flag(
        `${room.label}: room charges ${money(charged)} are not ${money(room.rentPerDay)} × ${days} days.`,
      );
    }

    const missing = lines.filter((l) => amountIn(l, room.id) === undefined);
    if (missing.length > 0 && reading.billingType !== 'package') {
      flag(`${room.label}: no amount read for ${missing.map((l) => `"${l.label}"`).join(', ')}.`);
    }
  }

  // Lines must add up to the totals printed on the estimate.
  const totals = reading.printedTotals ?? {};
  const checked = rooms.filter((r) => totals[r.id] !== undefined);
  if (checked.length === 0 && reading.billingType !== 'package') {
    flag('No printed total was read, so the lines could not be checked.');
  }
  for (const room of checked) {
    const sum = lines.reduce((acc, l) => acc + (amountIn(l, room.id) ?? 0), 0);
    const printed = totals[room.id]!;
    if (sum !== printed) {
      flag(
        `${room.label}: the lines add up to ${money(sum)} but the printed total is ${money(printed)}.`,
      );
    }
  }

  return { ...reading, roomCategories: rooms, lines, needsConfirmation: unsure, notes };
}

/** A head's amount in one room: its own column, or the single amount when it isn't priced by room. */
function amountIn(line: EstimateLine, roomId: string): number | undefined {
  const own = line.amounts[roomId];
  if (own !== undefined || line.pricedByRoom) return own;
  return Object.values(line.amounts)[0];
}

/**
 * `pricedByRoom` must match the numbers: different amounts per room means priced by room,
 * identical amounts in every room means it isn't (R-HL-001 only cuts heads that differ).
 */
function withConsistentPricing(line: EstimateLine, roomCount: number, notes: string[]) {
  if (line.head === 'room') return { ...line, pricedByRoom: true };
  const values = Object.values(line.amounts);
  if (values.length < 2 || values.length < roomCount) return line;
  const differs = new Set(values).size > 1;
  if (differs === line.pricedByRoom) return line;
  notes.push(
    differs
      ? `"${line.label}" differs by room, so it is treated as priced by room.`
      : `"${line.label}" is the same in every room, so it is treated as not priced by room.`,
  );
  return { ...line, pricedByRoom: differs };
}
