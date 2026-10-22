import { ProofResponse, type Locale, type WordingResult } from '@kavach/schemas';
import { setRequestLocale } from 'next-intl/server';
import { Boot } from '@/components/kavach/boot';
import { AdmissionSection } from '@/components/landing/admission';
import { AdmissionSectionSg } from '@/components/landing/admission-sg';
import { admissionData, admissionDataSg, type LandingCase } from '@/components/landing/data';
import { Hero } from '@/components/landing/hero';
import { LandingNav } from '@/components/landing/nav';
import {
  CtaBand,
  type ElderChat,
  ElderSection,
  LandingFooter,
  Moments,
  Policies,
  PromiseSection,
  SgRules,
} from '@/components/landing/sections';
import { api } from '@/lib/api';
import { CountryProvider } from '@/lib/country';
import { marketForLocale } from '@/lib/market';

/** The proof run: the honest wording counts and the wordings themselves; none when the API is down. */
async function proof(): Promise<{
  wordings?: number;
  checked?: number;
  fixtures?: boolean;
  results: WordingResult[];
}> {
  try {
    const p = await api('/v1/public/proof', ProofResponse, { cache: 'no-store' });
    return {
      wordings: p.results.wordings,
      checked: p.results.labelsChecked,
      fixtures: p.results.mode === 'fixtures',
      results: p.results.results,
    };
  } catch {
    return { results: [] };
  }
}

/**
 * S01 Landing, rebuilt on the Stitch "family insurance intelligence" screen: announcement bar and
 * glass header, the statement with the engine's check of the sample household, the admission
 * decision (run through the engine on every render), the three moments, the WhatsApp door, the
 * evidence, what Kavach is and is not, the closing band and the footer. The gateway opening
 * (Boot) plays first on a first visit. No amount here is typed.
 *
 * The page follows the reader's market: Mandarin and Malay are Singapore, so they get the Tan
 * family at Sample General Hospital (SX-1: S$, MediShield Life, a Shield plan and Singapore's
 * written rules); the other languages get the Sharmas at City Heart Hospital (HX-1, ₹, IRDAI).
 */
export default async function LandingPage({ params }: PageProps<'/[locale]'>) {
  const { locale } = await params;
  setRequestLocale(locale);
  const market = marketForLocale(locale as Locale) ?? 'IN';
  const counts = await proof();

  let lead: LandingCase;
  let admission;
  let chat: ElderChat;
  let sourceUrl: string | undefined;
  if (market === 'SG') {
    const a = admissionDataSg();
    lead = a;
    admission = <AdmissionSectionSg a={a} />;
    chat = {
      hospital: a.hospital,
      rent: a.quoted.rentPerDay,
      cut: a.aboveWard,
      saving: a.saving,
      pickRent: a.pick.rentPerDay,
      pay: a.pick.outOfPocket,
      ward: a.ward,
      quotedWard: a.quotedWard,
    };
    sourceUrl = a.prorationSource?.url;
  } else {
    const a = admissionData();
    lead = a;
    admission = <AdmissionSection a={a} />;
    chat = {
      hospital: a.hospital,
      rent: a.quoted.rentPerDay,
      cut: a.quoted.rows.find((r) => r.key === 'R-HL-001')?.amount ?? 0,
      saving: a.saving,
      pickRent: a.pick.rentPerDay,
      pay: a.pick.outOfPocket,
      limit: a.limit,
    };
    sourceUrl = a.masterUrl;
  }

  return (
    <CountryProvider country={market}>
      <Boot market={market} saving={lead.saving} rulesCount={lead.rulesCount} />
      <div className="landing flex min-h-dvh flex-col">
        <LandingNav market={market} />
        <main className="flex flex-1 flex-col">
          <Hero market={market} admission={lead} wordings={counts.wordings} />
          {admission}
          <Moments market={market} saving={lead.saving} />
          <ElderSection market={market} chat={chat} />
          {market === 'SG' ? (
            <SgRules />
          ) : (
            counts.results.length > 0 && (
              <Policies
                results={counts.results}
                checked={counts.checked ?? 0}
                fixtures={counts.fixtures ?? false}
                masterUrl={sourceUrl}
              />
            )
          )}
          <PromiseSection market={market} />
          <CtaBand market={market} />
        </main>
        <LandingFooter
          market={market}
          wordings={counts.wordings}
          checked={counts.checked}
          masterUrl={sourceUrl}
        />
      </div>
    </CountryProvider>
  );
}
