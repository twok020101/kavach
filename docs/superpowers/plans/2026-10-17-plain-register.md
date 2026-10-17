# Plain Register Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the trust-first "plain register" to the Kavach web app within Kshitij's design system: remove every decorative device (wash, gradients, raised cards, glow, words-rise, pills, scale presses), keep everything 07 specifies (type, radii, sand page, left nav, orb, score ring, motion timings, 48 px targets), and add the trust content (statement headline, "what Kavach is / is not", the 11 §4 disclaimers, the evidence band, citations beside numbers).

**Architecture:** The look is read from tokens in `apps/web/src/app/globals.css` and five primitives (`Button`, `Card`, `AppShell`, `ListeningOrb`, `Captions`). Task 1 edits the tokens (shadows, wash, radii to 07's exact values); Task 2 strips decoration from the primitives; Task 3 adds the shared trust pieces (`DisclaimerBar`, `EvidenceBand`, `IsIsNot`); Task 4 rewrites the landing page; Task 5 sweeps the screens; Task 6 verifies, records and opens the pull request. Nothing outside `apps/web` changes except `PROGRESS.md`.

**Tech Stack:** Next.js 16 App Router, Tailwind v4 (`@theme inline`), next-intl (en/hi), lucide-react, motion/react (kept where 07 §7 asks for it).

**Rules this plan obeys** (from README, implementation-plan §8, 07, 08, 11): one feature, one branch (`feat/ui-polish`), small commits, no squashing, a pull request to `main` that a human merges; UI strings in `apps/web/messages/{en,hi}/<feature>.json`; no rupee figure typed into copy (they come from `landingNumbers`, i.e. the engine's worked examples); status never by colour alone; targets ≥ 48 px (desk 64); the disclaimers of 11 §4 verbatim; no exclamation marks in hospital mode.

**Working rules for every task**

- Work in `C:/Users/JAI GANESH/OneDrive/Documents/Kavach/kavach` on `feat/real-gemini` (which contains `feat/ui-polish`); Task 6 fast-forwards `feat/ui-polish` to it and opens the PR from `feat/ui-polish`.
- Prettier only on changed files: `pnpm exec prettier --write <files>`.
- Before each commit: `pnpm --filter @kavach/web typecheck` and `pnpm --filter @kavach/web lint` print nothing after their `>` lines.
- Commit with `git -c core.safecrlf=false commit`, message ending `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.

---

### Task 1: Tokens and global CSS

**Files:**
- Modify: `apps/web/src/app/globals.css`

- [ ] **Step 1: Tokens**

In the `:root, [data-mode='desk']` block change these lines (leave every other token as it is):

```css
  --border: #ddd8ce;
  --citation: #23357a;
  --citation-bg: #f2f4fc;
  --radius-sm: 6px;
  --radius-md: 12px;
  --radius-lg: 20px;
  /* Elevation (07 §5): 0 is the default (flat, bordered); 2 only for sheets and popovers. */
  --shadow-1: none;
  --shadow-2: 0 8px 24px rgba(15, 27, 61, 0.12);
  --shadow-accent: none;
  --wash: none;
```

In the `[data-theme='dark']` block change:

```css
  --shadow-1: none;
  --shadow-2: 0 12px 32px rgba(0, 0, 0, 0.5);
  --shadow-accent: none;
  --wash: none;
```

Delete the `--wash:` multi-line radial-gradient values from both blocks.

- [ ] **Step 2: Component layer**

Replace the `.press` rules with a colour-only press (no scale):

```css
  /* Pressing a control changes its colour only (nothing moves unless it explains). */
  .press {
    transition:
      background-color 160ms,
      border-color 160ms,
      color 160ms;
  }
  .press:active:not(:disabled) {
    filter: brightness(0.92);
  }
```

Replace the `.rv` rules with 300 ms / 8 px:

```css
  .rv {
    opacity: 0;
    transform: translateY(8px);
    transition:
      opacity 0.3s ease-out,
      transform 0.3s ease-out;
  }
  .rv.in {
    opacity: 1;
    transform: none;
  }
```

Delete the `.wr-word`, `@keyframes wr-rise`, `.mark` and `.tab-hero` rules, and the `.wr-word > span` lines inside the reduced-motion block. Add after `.hairline`:

```css
  /* A panel: sunken fill with a 6 px left rule (info, next step, missing). */
  .panel {
    background: var(--surface-sunken);
    border-left: 6px solid var(--primary);
    border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
    padding: 12px 14px;
  }
  .panel-partial {
    border-left-color: var(--status-partial);
  }
  .panel-gap {
    border-left-color: var(--status-gap);
  }

  /* Small uppercase label: table headers, eyebrows. */
  .label {
    font-size: 0.75rem;
    line-height: 1.2;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--text-muted);
  }
```

Change `::selection` to `background: var(--primary-soft); color: var(--text);`.

- [ ] **Step 3: Check and commit**

Run: `pnpm --filter @kavach/web typecheck && pnpm --filter @kavach/web lint` (the `.mark` class is still referenced from `WordsRise`; that is harmless CSS-wise and is removed in Task 4).

```bash
git add apps/web/src/app/globals.css
git -c core.safecrlf=false commit -m "web: plain-register tokens: no wash, no raised shadows, 07 radii, colour-only press

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 2: Primitives and shell without decoration

**Files:**
- Modify: `apps/web/src/components/ui/button.tsx:9-15`
- Modify: `apps/web/src/components/ui/card.tsx:13-27`
- Modify: `apps/web/src/components/kavach/app-shell.tsx` (wash, blur, centre tab)
- Modify: `apps/web/src/components/kavach/language-switch.tsx:27-43`
- Modify: `apps/web/src/components/kavach/listening-orb.tsx:38-74`
- Modify: `apps/web/src/components/kavach/captions.tsx:30-35`
- Modify: `apps/web/src/components/kavach/answer-card.tsx:46-50`
- Modify: `apps/web/src/components/setup/setup-frame.tsx:28-33, 68`
- Modify: `apps/web/src/components/plan/sheet.tsx:44`, `apps/web/src/components/documents/ClauseSheet.tsx:62`

- [ ] **Step 1: Buttons without shadows**

In `button.tsx` replace the `variants` map:

```tsx
const variants: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-on-primary hover:bg-primary-hover',
  secondary: 'border-2 border-primary bg-surface text-primary hover:bg-primary-soft',
  soft: 'bg-primary-soft text-primary-hover hover:bg-primary/15',
  ghost: 'text-primary hover:bg-primary-soft',
  // Marigold is reserved for the hospital button and brand moments.
  accent: 'bg-accent text-accent-ink hover:brightness-95',
};
```

Sizes already meet 48 px (`min-h-12`); leave them.

- [ ] **Step 2: Cards are flat by default (07 elevation 0)**

In `card.tsx` replace the `className={cn(...)}` body:

```tsx
      className={cn(
        'rounded-md p-4 sm:p-5',
        tone === 'soft' ? 'bg-sunken' : 'border border-border bg-surface',
        interactive && 'press cursor-pointer hover:border-primary',
        className,
      )}
```

and update the comment above the component to `/** The default container for content: rounded, white, bordered (elevation 0). */` and the `tone` doc comment to `` /** `raised` and `flat` are both a bordered box (elevation 0); `soft` is a sunken panel. */ ``.

- [ ] **Step 3: Shell: no wash, no blur, flat centre tab**

In `app-shell.tsx`:

- Outer `div` class: `'flex min-h-dvh flex-col lg:pl-66'` (remove `wash`).
- Phone header class: `'sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-bg px-4 py-2 lg:hidden'`.
- Desktop aside class: `'fixed inset-y-0 left-0 z-30 hidden w-66 flex-col gap-6 border-r border-border bg-surface px-4 py-5 lg:flex'`.
- Bottom nav class: `'fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden'` and the `ul` class `'mx-auto grid max-w-3xl grid-cols-5'` (drop `items-end`).
- Replace the centre `li` with:

```tsx
          <li className="flex items-stretch justify-center p-1.5">
            <Link
              href="/desk"
              className="press flex min-h-14 w-full flex-col items-center justify-center gap-0.5 rounded-md bg-accent text-xs font-bold text-accent-ink"
            >
              <Hospital aria-hidden className="size-6" strokeWidth={2} />
              {t('nav.hospital')}
            </Link>
          </li>
```

- In `PhoneTab`, the icon wrapper span class becomes `cn('flex h-7 w-12 items-center justify-center rounded-md', active && 'bg-primary-soft')` (no `transition-colors`, `rounded-md` instead of full).

- [ ] **Step 4: Language switch: 6 px chips, no shadow**

In `language-switch.tsx`: nav class `cn('inline-flex rounded-sm border border-border bg-surface p-0.5', className)`; link classes:

```tsx
          className={cn(
            'press flex items-center justify-center rounded-sm font-semibold',
            compact ? 'min-h-9 min-w-10 px-2 text-xs' : 'min-h-11 min-w-12 px-3 text-sm',
            l === locale ? 'bg-primary-soft text-primary-hover' : 'text-muted hover:text-text',
          )}
```

- [ ] **Step 5: Orb per 07 §7 only (breathing), no rings, gradient, shadow or spinner ring**

In `listening-orb.tsx` delete the two `motion.span` ripple elements (the `size === 'lg' && active && !reduce` block) and the `thinking` spinner span; replace the main `motion.span` class with `cn('absolute inset-0 rounded-full', colour)`. Keep `pulse` as it is (that is 07's "slow breathing scale 1 → 1.06 at 1.6 s"). Remove the now-unused imports if any.

- [ ] **Step 6: Captions and answer cards without shadows**

`captions.tsx`: agent bubble class `'rounded-bl-sm border border-border bg-surface font-semibold text-text'`.
`answer-card.tsx`: article class `warning ? 'border-partial/40 bg-partial-bg' : 'border-border bg-surface'` (drop `shadow-1`).

- [ ] **Step 7: Setup frame and sheets**

`setup-frame.tsx`: outer div class drops `wash` (`'flex min-h-dvh flex-col lg:flex-row'`); the step bar spans use `rounded-sm` instead of `rounded-full`.
`sheet.tsx` line 44 and `ClauseSheet.tsx` line 62: replace `shadow-xl` with `shadow-2` (07 elevation 2).

- [ ] **Step 8: Check and commit**

Run the checks, then open http://localhost:3000/en/home?demo=1 at 390 px and 1366 px: flat cards, flat marigold centre tab, no glow, no wash.

```bash
git add apps/web/src/components/ui/button.tsx apps/web/src/components/ui/card.tsx apps/web/src/components/kavach/app-shell.tsx apps/web/src/components/kavach/language-switch.tsx apps/web/src/components/kavach/listening-orb.tsx apps/web/src/components/kavach/captions.tsx apps/web/src/components/kavach/answer-card.tsx apps/web/src/components/setup/setup-frame.tsx apps/web/src/components/plan/sheet.tsx apps/web/src/components/documents/ClauseSheet.tsx
git -c core.safecrlf=false commit -m "web: flat primitives and shell: no shadows, glow, blur or ripple rings

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 3: Shared trust pieces: DisclaimerBar, EvidenceBand, IsIsNot

**Files:**
- Create: `apps/web/src/components/kavach/disclaimer-bar.tsx`
- Create: `apps/web/src/components/kavach/evidence-band.tsx`
- Create: `apps/web/src/components/kavach/is-is-not.tsx`
- Modify: `apps/web/messages/en/common.json`, `apps/web/messages/hi/common.json`

- [ ] **Step 1: Strings (11 §4 verbatim for the disclaimers)**

Add to `messages/en/common.json`:

```json
  "disclaimer": {
    "global": "Kavach gives guidance based on your documents and published rules. It is not an insurer, broker or agent, and the insurer decides every claim.",
    "plan": "Sizes are guidance, not product recommendations. Premiums are illustrative.",
    "hospital": "Estimate only. Please confirm with the insurance (TPA) desk before you sign.",
    "claims": "This letter is a draft for you to review and send yourself."
  },
  "evidence": {
    "sources": "Rules checked against",
    "irdai2024": "IRDAI master circular on health insurance, 29 May 2024",
    "irdai2020": "IRDAI circular on proportionate deductions, 2020",
    "wordings": "{count} public policy wordings tested, {checked} labelled by a person",
    "sample": "Demo data is marked SAMPLE and is not about real people"
  },
  "isNot": {
    "isTitle": "What Kavach is",
    "notTitle": "What it is not",
    "rows": {
      "reader": "A reader and calculator for the policies you already have",
      "notInsurer": "An insurer, broker, agent or seller of policies",
      "cites": "Every rupee shown comes from written policy terms, with the page",
      "notGuarantee": "A guarantee of what a claim will pay: the insurer decides every claim",
      "consent": "Nothing is read or stored without your consent",
      "notPayments": "Something that takes payments or contacts insurers for you"
    }
  },
```

Add to `messages/hi/common.json`:

```json
  "disclaimer": {
    "global": "कवच आपके दस्तावेज़ों और प्रकाशित नियमों के आधार पर मार्गदर्शन देता है। यह बीमा कंपनी, ब्रोकर या एजेंट नहीं है, और हर क्लेम का फ़ैसला बीमा कंपनी करती है।",
    "plan": "कवर की मात्रा मार्गदर्शन है, किसी प्रोडक्ट की सिफ़ारिश नहीं। प्रीमियम उदाहरण के तौर पर हैं।",
    "hospital": "यह सिर्फ़ अनुमान है। साइन करने से पहले बीमा (TPA) डेस्क से पक्का कर लीजिए।",
    "claims": "यह लेटर एक ड्राफ़्ट है, जिसे आप ख़ुद देखकर भेजें।"
  },
  "evidence": {
    "sources": "नियम इनसे जाँचे गए",
    "irdai2024": "IRDAI स्वास्थ्य बीमा मास्टर परिपत्र, 29 मई 2024",
    "irdai2020": "IRDAI परिपत्र, आनुपातिक कटौती, 2020",
    "wordings": "{count} सार्वजनिक पॉलिसी वर्डिंग जाँची गईं, {checked} किसी व्यक्ति ने लेबल कीं",
    "sample": "डेमो डेटा पर SAMPLE लिखा है और वह किसी असली व्यक्ति का नहीं है"
  },
  "isNot": {
    "isTitle": "कवच क्या है",
    "notTitle": "क्या नहीं है",
    "rows": {
      "reader": "आपकी मौजूदा पॉलिसियों को पढ़ने और हिसाब लगाने वाला",
      "notInsurer": "बीमा कंपनी, ब्रोकर, एजेंट या पॉलिसी बेचने वाला",
      "cites": "दिखाई गई हर रक़म लिखी हुई पॉलिसी शर्तों से आती है, पेज नंबर के साथ",
      "notGuarantee": "क्लेम में कितना मिलेगा इसकी गारंटी: हर क्लेम का फ़ैसला बीमा कंपनी करती है",
      "consent": "आपकी सहमति के बिना कुछ पढ़ा या रखा नहीं जाता",
      "notPayments": "पैसे लेने वाला या आपकी ओर से बीमा कंपनी से बात करने वाला"
    }
  },
```

- [ ] **Step 2: DisclaimerBar (07 §8)**

```tsx
// apps/web/src/components/kavach/disclaimer-bar.tsx
'use client';

import { useTranslations } from 'next-intl';
import { cn } from '../ui/cn';

export type DisclaimerKind = 'global' | 'plan' | 'hospital' | 'claims';

/** The thin disclaimer bar from 07 §8, with the copy of 11 §4. Client, so screens can place it. */
export function DisclaimerBar({ kind, className }: { kind: DisclaimerKind; className?: string }) {
  const t = useTranslations('common.disclaimer');
  return (
    <p className={cn('border-t border-border pt-3 text-sm text-muted', className)}>{t(kind)}</p>
  );
}
```

- [ ] **Step 3: EvidenceBand**

```tsx
// apps/web/src/components/kavach/evidence-band.tsx
import { getTranslations } from 'next-intl/server';

/**
 * The one dark band in the app: the rules' sources, the honest wording count and the sample
 * notice, plus the global disclaimer of 11 §4. A footer or a page header, not a theme.
 */
export async function EvidenceBand({
  wordings,
  checked,
  as = 'footer',
}: {
  wordings?: number;
  checked?: number;
  as?: 'footer' | 'header';
}) {
  const t = await getTranslations('common.evidence');
  const td = await getTranslations('common.disclaimer');
  const Tag = as;
  return (
    <Tag className="bg-primary-hover text-sm leading-relaxed text-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-5 sm:px-6">
        <p>
          <span className="text-white/70">{t('sources')} </span>
          <span className="font-semibold text-accent">{t('irdai2024')}</span>
          <span className="text-white/70"> · </span>
          <span className="font-semibold text-accent">{t('irdai2020')}</span>
        </p>
        {wordings !== undefined && <p>{t('wordings', { count: wordings, checked: checked ?? 0 })}</p>}
        <p className="text-white/70">{t('sample')}</p>
        <p className="mt-2 border-t border-white/20 pt-2 text-white/85">{td('global')}</p>
      </div>
    </Tag>
  );
}
```

- [ ] **Step 4: IsIsNot**

```tsx
// apps/web/src/components/kavach/is-is-not.tsx
import { getTranslations } from 'next-intl/server';

const ROWS = [
  ['reader', 'notInsurer'],
  ['cites', 'notGuarantee'],
  ['consent', 'notPayments'],
] as const;

/** Two plain columns saying what Kavach is and is not (spec trust rule 4). Server component. */
export async function IsIsNot() {
  const t = await getTranslations('common.isNot');
  return (
    <table className="w-full border-collapse text-base">
      <thead>
        <tr>
          <th scope="col" className="label border-b border-border pb-2 pr-4 text-left">
            {t('isTitle')}
          </th>
          <th scope="col" className="label border-b border-border pb-2 text-left">
            {t('notTitle')}
          </th>
        </tr>
      </thead>
      <tbody>
        {ROWS.map(([is, not]) => (
          <tr key={is}>
            <td className="border-b border-border py-3 pr-4 align-top">{t(`rows.${is}`)}</td>
            <td className="border-b border-border py-3 align-top text-muted">{t(`rows.${not}`)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

- [ ] **Step 5: Check and commit**

```bash
git add apps/web/src/components/kavach/disclaimer-bar.tsx apps/web/src/components/kavach/evidence-band.tsx apps/web/src/components/kavach/is-is-not.tsx apps/web/messages/en/common.json apps/web/messages/hi/common.json
git -c core.safecrlf=false commit -m "web: disclaimer bar (11 §4 copy), evidence band and the is/is-not table

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 4: Landing page

**Files:**
- Modify: `apps/web/src/app/[locale]/page.tsx` (whole file)
- Modify: `apps/web/messages/en/landing.json`, `apps/web/messages/hi/landing.json`
- Modify: `apps/web/src/components/kavach/reveal.tsx` (delete `WordsRise`)
- Modify: `apps/web/src/components/kavach/whatsapp-card.tsx:37-40`

- [ ] **Step 1: Strings (no rupee literals: `<saving>`, `<deluxe>`, `<standard>` are filled from the engine's numbers)**

Add to `messages/en/landing.json`:

```json
  "titlePlain": "Your family's insurance,",
  "titleEm": "explained at the moment it matters.",
  "lead": "Kavach remembers every policy in the house and tells you what to do when life changes, at the hospital desk, and when a claim comes back short. In Hindi or English. Every rupee comes from written policy terms, with the page number.",
  "howItWorks": "How it works",
  "moment": {
    "title": "The <saving></saving> moment",
    "body": "Suresh is being admitted. The deluxe room costs the family about <deluxe></deluxe> out of pocket; the cheaper room about <standard></standard>. Kavach says which one, and why, before anyone signs."
  },
  "trustLine": "Built for the Google Cloud AI Builder Cup 2026 · Demo data is marked SAMPLE · Nothing is stored without consent · No payments, ever."
```

Add to `messages/hi/landing.json`:

```json
  "titlePlain": "आपके परिवार का बीमा,",
  "titleEm": "उसी पल समझाया हुआ जब ज़रूरत हो।",
  "lead": "कवच घर की हर पॉलिसी याद रखता है और बताता है कि क्या करना है: जब ज़िंदगी बदले, अस्पताल के काउंटर पर, और जब क्लेम कम आए। हिंदी या English में। हर रक़म लिखी हुई पॉलिसी शर्तों से आती है, पेज नंबर के साथ।",
  "howItWorks": "यह कैसे काम करता है",
  "moment": {
    "title": "<saving></saving> वाला पल",
    "body": "सुरेश को भर्ती करना है। डीलक्स कमरे में परिवार को क़रीब <deluxe></deluxe> अपनी जेब से देने होंगे; सस्ते कमरे में क़रीब <standard></standard>। कवच बताता है कौन सा, और क्यों, किसी के साइन करने से पहले।"
  },
  "trustLine": "Google Cloud AI Builder Cup 2026 के लिए बना · डेमो डेटा पर SAMPLE लिखा है · सहमति के बिना कुछ नहीं रखा जाता · पैसे कभी नहीं लिए जाते।"
```

- [ ] **Step 2: Engine numbers for the two room totals**

In `apps/web/src/lib/mock/landing.ts` add the two HX-1 out-of-pocket figures from the engine's worked example (docs/plan/05 §HX-1; `packages/engine/src/examples.ts`):

```ts
export const landingNumbers = {
  hospitalSaving: 90000,
  claimRecoverable: 14560,
  /** HX-1 out of pocket in the quoted (deluxe) room and in the room within the limit. */
  hx1Deluxe: 150800,
  hx1Standard: 60800,
};
```

- [ ] **Step 3: Rewrite the page**

Replace `page.tsx` with:

```tsx
import { ProofResponse } from '@kavach/schemas';
import { ArrowRight, FileWarning, GitBranch, Hospital, type LucideIcon } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { ReactNode } from 'react';
import { Amount } from '@/components/kavach/amount';
import { AnimatedAmount } from '@/components/kavach/animated-amount';
import { EvidenceBand } from '@/components/kavach/evidence-band';
import { IsIsNot } from '@/components/kavach/is-is-not';
import { LanguageSwitch } from '@/components/kavach/language-switch';
import { Logo } from '@/components/kavach/logo';
import { Reveal } from '@/components/kavach/reveal';
import { ThemeToggle } from '@/components/kavach/theme-toggle';
import { WhatsAppCard } from '@/components/kavach/whatsapp-card';
import { buttonClasses } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { api } from '@/lib/api';
import { landingNumbers } from '@/lib/mock/landing';

async function proofCounts() {
  try {
    const proof = await api('/v1/public/proof', ProofResponse, { cache: 'no-store' });
    return { wordings: proof.results.wordings, checked: proof.results.labelsChecked };
  } catch {
    return {};
  }
}

/** S01 Landing in the plain register: a statement, two buttons, the moment, what Kavach is not. */
export default async function LandingPage({ params }: PageProps<'/[locale]'>) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('landing');
  const ts = await getTranslations('setup.landing');
  const tProof = await getTranslations('proof');
  const counts = await proofCounts();

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-6">
          <Logo />
          <ThemeToggle className="ml-auto" />
          <LanguageSwitch compact />
          <Link
            href="/sign-in"
            className={buttonClasses({ variant: 'ghost', size: 'sm', className: 'hidden sm:inline-flex' })}
          >
            {ts('signIn')}
          </Link>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-14 px-4 pb-16 pt-10 sm:px-6 lg:pt-14">
        <section className="flex max-w-3xl flex-col gap-6">
          <h1 className="font-display text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl">
            {t('titlePlain')} <em className="not-italic text-primary">{t('titleEm')}</em>
          </h1>
          <p className="max-w-2xl text-lg leading-relaxed">{t('lead')}</p>
          <div className="flex flex-wrap gap-3">
            <Link
              href={{ pathname: '/desk', query: { demo: '1' } }}
              className={buttonClasses({ variant: 'accent', size: 'lg' })}
            >
              <Hospital aria-hidden className="size-6" />
              {t('tryHospital')}
            </Link>
            <a href="#moments" className={buttonClasses({ variant: 'secondary', size: 'lg' })}>
              {t('howItWorks')}
            </a>
          </div>
          <p className="text-sm text-muted">{t('tryHospitalSub')}</p>
        </section>

        <Reveal as="section" aria-labelledby="moment-title" className="panel max-w-3xl">
          <h2 id="moment-title" className="font-display text-xl font-bold">
            {t.rich('moment.title', {
              saving: () => <AnimatedAmount value={landingNumbers.hospitalSaving} />,
            })}
          </h2>
          <p className="mt-2 text-base leading-relaxed">
            {t.rich('moment.body', {
              deluxe: () => <Amount value={landingNumbers.hx1Deluxe} className="font-semibold" />,
              standard: () => <Amount value={landingNumbers.hx1Standard} className="font-semibold" />,
            })}
          </p>
        </Reveal>

        <section id="moments" aria-labelledby="moments-title" className="flex flex-col gap-5">
          <div className="flex max-w-2xl flex-col gap-1">
            <h2 id="moments-title" className="font-display text-2xl font-bold">
              {t('momentsTitle')}
            </h2>
            <p className="text-muted">{t('momentsIntro')}</p>
          </div>
          <ol className="grid gap-4 md:grid-cols-3">
            <Moment n={1} icon={GitBranch} title={t('moments.change.title')} body={t('moments.change.body')} stat={t('moments.change.stat')} />
            <Moment
              n={2}
              icon={Hospital}
              title={t('moments.hospital.title')}
              body={t('moments.hospital.body')}
              stat={t.rich('moments.hospital.stat', {
                amount: () => <AnimatedAmount value={landingNumbers.hospitalSaving} />,
              })}
            />
            <Moment
              n={3}
              icon={FileWarning}
              title={t('moments.claim.title')}
              body={t('moments.claim.body')}
              stat={t.rich('moments.claim.stat', {
                amount: () => <AnimatedAmount value={landingNumbers.claimRecoverable} />,
              })}
            />
          </ol>
        </section>

        <Reveal as="section" aria-label={t('trust.title')} className="max-w-3xl">
          <IsIsNot />
        </Reveal>

        <Reveal as="section" className="max-w-3xl">
          <WhatsAppCard />
        </Reveal>

        <Reveal as="section" className="flex max-w-3xl flex-col gap-3 border-t border-border pt-6">
          <h2 className="font-display text-xl font-bold">{t('trust.title')}</h2>
          <p className="text-muted">{t('trust.body')}</p>
          <Link
            href="/proof"
            className="inline-flex min-h-12 w-fit items-center gap-1 font-semibold text-primary underline underline-offset-4"
          >
            {tProof('linkFromLanding')}
            <ArrowRight aria-hidden className="size-4" />
          </Link>
          <p className="text-sm text-muted">{t('trustLine')}</p>
        </Reveal>
      </main>

      <EvidenceBand wordings={counts.wordings} checked={counts.checked} />
    </div>
  );
}

function Moment({
  n,
  icon: Icon,
  title,
  body,
  stat,
}: {
  n: number;
  icon: LucideIcon;
  title: string;
  body: string;
  stat: ReactNode;
}) {
  return (
    <li className="flex h-full flex-col gap-3 rounded-md border border-border bg-surface p-5">
      <div className="flex items-center justify-between">
        <Icon aria-hidden className="size-6 text-primary" strokeWidth={1.75} />
        <span className="label">0{n}</span>
      </div>
      <h3 className="font-display text-lg font-bold">{title}</h3>
      <p className="text-muted">{body}</p>
      <p className="mt-auto pt-2 font-display font-bold text-primary-hover">{stat}</p>
    </li>
  );
}
```

- [ ] **Step 4: Remove `WordsRise`** (everything from `/** A heading whose words rise` to the end of `reveal.tsx`). Change the WhatsApp card icon span to `className="flex size-12 items-center justify-center rounded-md bg-safe-bg text-safe"`.

- [ ] **Step 5: Check, look, commit**

Run the checks; open /en and /hi at 390 px and 1366 px. The old `footer.*` landing strings stay in the message files (unused keys are harmless); the evidence band now carries the global disclaimer.

```bash
git add "apps/web/src/app/[locale]/page.tsx" apps/web/messages/en/landing.json apps/web/messages/hi/landing.json apps/web/src/components/kavach/reveal.tsx apps/web/src/components/kavach/whatsapp-card.tsx apps/web/src/lib/mock/landing.ts
git -c core.safecrlf=false commit -m "web: plain landing page: statement, engine-sourced moment, is/is-not table, evidence band

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 5: Screens sweep and disclaimers in place

**Files:**
- Modify: `apps/web/src/app/[locale]/(app)/home/home-screen.tsx:95-110, 118-137, 150-154`
- Modify: `apps/web/src/app/[locale]/(app)/plan/plan-screen.tsx` (add `DisclaimerBar kind="plan"` at the end of the main column)
- Modify: `apps/web/src/app/[locale]/desk/_components/desk-session.tsx` (chips, bars, hospital disclaimer)
- Modify: `apps/web/src/app/[locale]/desk/_components/desk-start.tsx:34, 76`
- Modify: `apps/web/src/components/claims/claim-frame.tsx` (add `DisclaimerBar kind="claims"`)
- Modify: `apps/web/src/app/[locale]/(app)/timeline/timeline-screen.tsx:197-198`
- Modify: `apps/web/src/app/[locale]/proof/page.tsx` (evidence band header)
- Modify: every other file matching `shadow-1|shadow-2|shadow-accent|hover:-translate|backdrop-blur|wash` (grep)

- [ ] **Step 1: Home**

Demo pill: `<div className="flex items-center gap-1 rounded-md border border-border py-1 pl-3 pr-1 text-sm">` and its button `className="min-h-9 px-2.5 text-sm"`. Drafts card: `<Card interactive className="panel panel-partial flex items-center gap-3 border-0">`; next-step card: `<Card interactive className="panel flex items-center gap-3 border-0">`. "On job" pill: `rounded-sm` instead of `rounded-full`. Score card and `ScoreRing` stay.

- [ ] **Step 2: Plan and claims disclaimers**

In `plan-screen.tsx`, as the last child of the outer column, add `<DisclaimerBar kind="plan" />` (import from `@/components/kavach/disclaimer-bar`). In `claim-frame.tsx`, as the last child of its content column, add `<DisclaimerBar kind="claims" />`. Read each file first to find the column element.

- [ ] **Step 3: Desk**

In `desk-session.tsx`: suggestion button class `'press min-h-12 shrink-0 rounded-sm border-2 border-primary bg-surface px-4 font-semibold text-primary hover:bg-primary-soft disabled:opacity-50'`; both bottom bar classes drop `backdrop-blur-md` and use `bg-bg`; after the answer cards' `<Card className="p-2 sm:p-3">…Why…</Card>` block add `<DisclaimerBar kind="hospital" className="text-base" />`. In `desk-start.tsx`: `selectedTile = 'border-primary bg-primary-soft'` (drop `shadow-1`); the demo note `p` class `'panel flex gap-2 text-base'`.

- [ ] **Step 4: Timeline, proof, sweep**

`timeline-screen.tsx` 197–198: `'flex min-w-0 flex-1 items-center gap-3 rounded-md border border-border bg-surface p-3'` and `entry.href && 'press hover:border-primary'`.
`proof/page.tsx`: import `EvidenceBand`; after the `<header>` insert `<EvidenceBand as="header" wordings={proof?.results.wordings} checked={proof?.results.labelsChecked} />`.
Then: `grep -rn "shadow-1\|shadow-2\|shadow-accent\|hover:-translate\|backdrop-blur\|\bwash\b" apps/web/src --include=*.tsx` and remove each remaining occurrence except `shadow-2` on `sheet.tsx` and `ClauseSheet.tsx`.

- [ ] **Step 5: Check and commit**

```bash
git add -A apps/web/src
git -c core.safecrlf=false commit -m "web: screens without decoration; plan, hospital and claims disclaimers in place

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 6: Verify, record, pull request

- [ ] **Step 1: Full checks**

Run: `pnpm --filter @kavach/web lint && pnpm --filter @kavach/web typecheck && pnpm --filter @kavach/web build`. Expected: build lists every route.

- [ ] **Step 2: Screenshots**

Start the API if port 8080 is silent (`pnpm --filter @kavach/api dev` in the background). In the scratchpad, `npm i playwright-core`, then a script that opens `/en`, `/hi`, `/en/home?demo=1`, `/hi/desk?demo=1`, `/en/plan?demo=1`, `/en/proof` at 390×844 and 1366×900 with Chromium at `%LOCALAPPDATA%\ms-playwright\chromium-1248\chrome-win64\chrome.exe`, scrolls to the bottom and back, and saves `{route}-{width}.png`. Read every image.

- [ ] **Step 3: Trust read-through**

Check each screenshot against the spec's six rules and 07 §10. Fix in place, re-run Step 1.

- [ ] **Step 4: PROGRESS.md**

On the "UI/UX polish" row append to Notes: `Plain register applied on top (spec 2026-10-17-plain-register-design.md, 07 wins on type/radii/page).` Run `pnpm exec prettier --write PROGRESS.md`, commit as `docs: record the plain-register pass`.

- [ ] **Step 5: Fast-forward `feat/ui-polish` and open the PR**

```bash
git -C "../kavach-ui-polish" status --short        # must be clean in apps/web
git -C "../kavach-ui-polish" merge --ff-only feat/real-gemini
git -C "../kavach-ui-polish" push -u origin feat/ui-polish
gh pr create --base main --head feat/ui-polish --title "UI/UX polish in the plain register, real Gemini on Vertex" --body-file <body>
```

The body lists: what changed (UI polish + plain register + real-Gemini API fixes), the checks run, the screenshots, and ends with `🤖 Generated with [Claude Code](https://claude.com/claude-code)`. Do not merge; Jai or Kshitij merges at the gate.
