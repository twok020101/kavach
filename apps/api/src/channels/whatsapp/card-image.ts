import { resolve } from 'node:path';
import { createCanvas, GlobalFonts, Path2D, type SKRSContext2D } from '@napi-rs/canvas';
import { formatInr } from '@kavach/engine';
import type { CardShare, DeskCard } from '@kavach/schemas';
import { appRoot } from '../../paths';

/**
 * WhatsAppCard (docs/plan/07 §8): a shared desk answer's main card as a 1080 × 1350 PNG.
 * Drawn with Skia (@napi-rs/canvas), which shapes Devanagari correctly (next/og does not).
 */

const C = {
  bg: '#fbfaf7',
  surface: '#ffffff',
  border: '#ddd8ce',
  text: '#1c1a17',
  muted: '#5e6472',
  primary: '#2e45a0',
  accent: '#f4a62a',
  accentInk: '#0f1b3d',
  safe: '#1f7a4d',
  safeBg: '#e4f3ea',
  partialBg: '#fdf1dc',
};

const LABELS = {
  en: {
    for: (p: string) => `For ${p}`,
    sample: 'SAMPLE',
    verified: 'Every amount from Kavach’s rules engine',
    confirm: 'Confirm with the TPA desk before you sign.',
  },
  hi: {
    for: (p: string) => `${p} के लिए`,
    sample: 'नमूना',
    verified: 'हर रक़म Kavach के नियम-इंजन से',
    confirm: 'साइन करने से पहले TPA डेस्क से पक्का करें।',
  },
};

// Noto Sans Devanagari, Latin and Devanagari subsets (Devanagari has ₹), one family per weight.
const fontDir = resolve(appRoot, 'assets/fonts');
for (const subset of ['latin', 'devanagari']) {
  for (const weight of [400, 700]) {
    GlobalFonts.registerFromPath(
      resolve(fontDir, `noto-sans-devanagari-${subset}-${weight}-normal.woff`),
      `K${subset}${weight}`,
    );
  }
}
const font = (size: number, bold = false) => {
  const w = bold ? 700 : 400;
  return `${size}px Klatin${w}, Kdevanagari${w}`;
};

const W = 1080;
const H = 1350;
const PAD = 64;

export function renderCardPng(share: CardShare, cardId?: string): Buffer {
  const t = LABELS[share.locale];
  const main =
    share.cards.find((c) => c.id === cardId) ??
    share.cards.find((c) => c.kind === 'room_compare') ??
    share.cards[0];
  const ask = share.cards.find((c) => c.kind === 'ask_desk' && c !== main);

  const canvas = createCanvas(W, H);
  const g = canvas.getContext('2d');
  g.fillStyle = C.bg;
  g.fillRect(0, 0, W, H);
  g.textBaseline = 'alphabetic';

  // Header: mark, name, SAMPLE badge on demo data.
  drawMark(g, PAD, 52, 64);
  text(g, 'Kavach', PAD + 84, 104, font(52, true), C.primary);
  if (share.isDemo) {
    g.font = font(30, true);
    const bw = g.measureText(t.sample).width + 40;
    g.fillStyle = C.accent;
    roundRect(g, W - PAD - bw, 56, bw, 56, 8);
    text(g, t.sample, W - PAD - bw + 20, 95, font(30, true), C.accentInk);
  }

  let y = 196;
  text(g, t.for(share.patientName), PAD, y, font(40, true), C.text);
  if (share.hospitalName) {
    y += 48;
    text(g, share.hospitalName, PAD, y, font(32), C.muted);
  }
  y += 48;

  if (main) y = drawMainCard(g, main, y);

  if (ask) {
    y += 64;
    text(g, ask.title, PAD, y, font(34, true), C.text);
    for (const line of ask.body.split('\n').filter(Boolean).slice(0, 2)) {
      for (const wrapped of wrap(g, line, font(32), W - 2 * PAD)) {
        y += 46;
        text(g, wrapped, PAD, y, font(32), C.muted);
      }
    }
  }

  text(g, t.verified, PAD, H - PAD - 48, font(28, true), C.safe);
  text(g, t.confirm, PAD, H - PAD, font(28), C.muted);
  return canvas.toBuffer('image/png');
}

/** The card box: title, then each amount (the recommended room and the saving highlighted). */
function drawMainCard(g: SKRSContext2D, card: DeskCard, top: number): number {
  const inner = W - 2 * PAD - 96;
  const left = PAD + 48;
  const rows: { lines: string[]; amount: string; emphasis: boolean; h: number }[] =
    card.amounts.map((a) => {
      const amount = formatInr(a.amount);
      g.font = font(a.emphasis ? 60 : 48, true);
      const amountWidth = g.measureText(amount).width;
      const lines = wrap(g, a.label, font(34), inner - amountWidth - 48);
      return { lines, amount, emphasis: a.emphasis, h: Math.max(lines.length * 44, 64) + 40 };
    });
  const bodyLines =
    card.amounts.length === 0
      ? card.body
          .split('\n')
          .filter(Boolean)
          .slice(0, 6)
          .flatMap((l) => wrap(g, l, font(32), inner))
      : [];
  const height = 48 + 56 + rows.reduce((s, r) => s + r.h + 16, 0) + bodyLines.length * 46 + 40;

  g.fillStyle = card.kind === 'warning' ? C.partialBg : C.surface;
  roundRect(g, PAD, top, W - 2 * PAD, height, 20);
  g.strokeStyle = C.border;
  g.lineWidth = 2;
  g.stroke();

  let y = top + 48 + 44;
  text(g, card.title, left, y, font(44, true), C.text);
  y += 32;
  for (const row of rows) {
    if (row.emphasis) {
      g.fillStyle = C.safeBg;
      roundRect(g, left - 24, y, inner + 48, row.h, 12);
    }
    const color = row.emphasis ? C.safe : C.text;
    row.lines.forEach((line, i) => text(g, line, left, y + 20 + 36 + i * 44, font(34), color));
    g.font = font(row.emphasis ? 60 : 48, true);
    const aw = g.measureText(row.amount).width;
    text(g, row.amount, left + inner - aw, y + row.h / 2 + (row.emphasis ? 22 : 18), g.font, color);
    y += row.h + 16;
  }
  for (const line of bodyLines) {
    y += 46;
    text(g, line, left, y, font(32), C.text);
  }
  return top + height;
}

function text(g: SKRSContext2D, s: string, x: number, y: number, f: string, color: string) {
  g.font = f;
  g.fillStyle = color;
  g.fillText(s, x, y);
}

/** Greedy word wrap to a width. */
function wrap(g: SKRSContext2D, s: string, f: string, width: number): string[] {
  g.font = f;
  const lines: string[] = [];
  let line = '';
  for (const word of s.split(' ')) {
    const next = line ? `${line} ${word}` : word;
    if (line && g.measureText(next).width > width) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function roundRect(g: SKRSContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  g.roundRect(x, y, w, h, r);
  g.fill();
}

/** The Kavach mark (apps/web logo.tsx): two shield arcs and two people. */
function drawMark(g: SKRSContext2D, x: number, y: number, size: number) {
  g.save();
  g.translate(x, y);
  g.scale(size / 32, size / 32);
  g.lineWidth = 3.2;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.strokeStyle = C.primary;
  g.stroke(new Path2D('M15 4 5 7.5V15c0 6.6 4.2 11 10 13'));
  g.strokeStyle = C.accent;
  g.stroke(new Path2D('M17 4l10 3.5V15c0 6.6-4.2 11-10 13'));
  for (const [cx, color] of [
    [12, C.primary],
    [20, C.accent],
  ] as const) {
    g.fillStyle = color;
    g.beginPath();
    g.arc(cx, 13, 2.2, 0, Math.PI * 2);
    g.fill();
  }
  g.restore();
}
