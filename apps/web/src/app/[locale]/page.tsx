import { ProofResponse, type WordingResult } from '@kavach/schemas';
import { setRequestLocale } from 'next-intl/server';
import { Boot } from '@/components/kavach/boot';
import { AdmissionSection } from '@/components/landing/admission';
import { admissionData } from '@/components/landing/data';
import { Hero } from '@/components/landing/hero';
import { LandingNav } from '@/components/landing/nav';
import {
  CtaBand,
  ElderSection,
  LandingFooter,
  Moments,
  Policies,
  PromiseSection,
} from '@/components/landing/sections';
import { api } from '@/lib/api';

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
 * glass header, the statement with the engine's check of the Sharma household, the City Heart
 * admission decision (run through the engine on every render), the three moments, the WhatsApp
 * door, the public wordings Kavach is tested on, what Kavach is and is not, the closing band and
 * the footer. The gateway opening (Boot) plays first on a first visit. No rupee here is typed.
 */
export default async function LandingPage({ params }: PageProps<'/[locale]'>) {
  const { locale } = await params;
  setRequestLocale(locale);
  const counts = await proof();
  const admission = admissionData();

  return (
    <>
      <Boot saving={admission.saving} rulesCount={admission.rulesCount} />
      <div className="landing flex min-h-dvh flex-col">
        <LandingNav />
        <main className="flex flex-1 flex-col">
          <Hero admission={admission} wordings={counts.wordings} />
          <AdmissionSection a={admission} />
          <Moments />
          <ElderSection a={admission} />
          {counts.results.length > 0 && (
            <Policies
              results={counts.results}
              checked={counts.checked ?? 0}
              fixtures={counts.fixtures ?? false}
              masterUrl={admission.masterUrl}
            />
          )}
          <PromiseSection />
          <CtaBand />
        </main>
        <LandingFooter
          wordings={counts.wordings}
          checked={counts.checked}
          masterUrl={admission.masterUrl}
        />
      </div>
    </>
  );
}
