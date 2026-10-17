import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { formatInr } from '@kavach/engine';
import { HospitalEstimate, type EstimateLine } from '@kavach/schemas';
import { generateStructured, models } from '../lib/gemini';
import { appRoot } from '../paths';

const prompt = readFileSync(resolve(appRoot, 'src/agents/prompts/estimate-reader.md'), 'utf8');

export type EstimateImage = { data: Buffer; mimeType: string };

/**
 * Reads photos of a hospital estimate into a HospitalEstimate with the Pro model, then checks
 * the arithmetic in code. Anything that doesn't add up comes back with `needsConfirmation`.
 *
 * `fixture` picks the recorded reading used with FAKE_LLM=1.
 */
export async function readEstimate(
  images: EstimateImage[],
  { fixture = 'estimate-city-heart' }: { fixture?: string } = {},
): Promise<HospitalEstimate> {
  if (images.length === 0) throw new Error('No estimate image');
  const reading = await generateStructured({
    model: models.pro,
    schema: HospitalEstimate,
    systemInstruction: prompt,
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
  });
  return checkEstimate(reading);
}

/** Deterministic checks on what the model read. Fixes only what is certain; flags the rest. */
export function checkEstimate(reading: HospitalEstimate): HospitalEstimate {
  const notes = [...reading.notes];
  let unsure = reading.needsConfirmation;
  const flag = (note: string) => {
    notes.push(note);
    unsure = true;
  };

  if (reading.lines.length === 0) flag('No charges could be read from the estimate.');

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
      `Tariff lists ${tariffOnly.map((r) => `${r.label} (${formatInr(r.rentPerDay)}/day)`).join(', ')} without estimated charges; ask the desk for an estimate in that room if needed.`,
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
        `${room.label}: room charges ${formatInr(charged)} are not ${formatInr(room.rentPerDay)} × ${days} days.`,
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
        `${room.label}: the lines add up to ${formatInr(sum)} but the printed total is ${formatInr(printed)}.`,
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
