'use client';

import { X } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import type { Locale } from '@kavach/schemas';
import { AgentSteps } from '@/components/kavach/agent-steps';
import { Icon } from '@/components/kavach/icon';
import { HoldToSpeak, type VoiceNote } from '@/components/setup/hold-to-speak';
import { SetupFrame, SetupLoadState } from '@/components/setup/setup-frame';
import { useSetupHousehold } from '@/components/setup/use-setup-household';
import { Button } from '@/components/ui/button';
import { useRouter } from '@/i18n/navigation';
import { marketForLocale } from '@/lib/market';
import { saveIntake, useParseFamily } from '@/lib/setup';

/** S04 Tell us about your family: one sentence, typed or spoken, read by the IntakeAgent. */
export default function FamilyPage() {
  const t = useTranslations('setup.family');
  const ts = useTranslations('setup');
  const locale = useLocale() as Locale;
  const router = useRouter();
  const { data: household, error, refetch, isFetching } = useSetupHousehold();
  const parse = useParseFamily(household?.id);
  const [text, setText] = useState('');
  const [voice, setVoice] = useState<VoiceNote>();
  const [found, setFound] = useState<number>();
  // A Singapore reader's example family lives in Singapore, not Pune or Bengaluru.
  const sg = marketForLocale(locale) === 'SG';
  const example = t(sg ? 'exampleSg' : 'example');

  const submit = () =>
    parse.mutate(
      {
        text: text.trim() || undefined,
        audio: voice && { mimeType: voice.mimeType, data: voice.data },
        locale,
      },
      {
        onSuccess: (result) => {
          setFound(result.members.length);
          if (!result.members.length) return;
          saveIntake(result);
          // Let the "Found N people" step show for a moment.
          setTimeout(() => router.push('/setup/family/confirm'), 600);
        },
      },
    );

  const working = parse.isPending || (found ?? 0) > 0;

  return (
    <SetupFrame
      step={1}
      back="/setup/consent"
      title={t('title')}
      intro={t('intro')}
      footer={
        <Button
          size="lg"
          disabled={!household || (text.trim().length < 3 && !voice)}
          loading={working}
          onClick={submit}
        >
          {ts('continue')}
        </Button>
      }
    >
      {/* The sentence can be typed while the family loads; a failed load says so, with retry. */}
      {error && !household && (
        <SetupLoadState error={error} retrying={isFetching} onRetry={() => refetch()} />
      )}

      <label className="flex flex-col gap-2">
        <span className="sr-only">{t('label')}</span>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={5}
          maxLength={1000}
          placeholder={t(sg ? 'placeholderSg' : 'placeholder')}
          className="w-full rounded-lg border border-outline-variant bg-surface p-4 text-body-lg text-on-surface shadow-1 placeholder:text-on-surface-variant/70 focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        />
      </label>

      {voice ? (
        <p className="flex items-center gap-2 self-center rounded-full bg-primary-soft py-1 pl-4 pr-1 text-body-md font-medium text-primary">
          {t('voiceReady', { seconds: voice.seconds })}
          <button
            type="button"
            onClick={() => setVoice(undefined)}
            aria-label={t('clearVoice')}
            className="flex size-10 items-center justify-center rounded-full hover:bg-surface focus-visible:outline-2 focus-visible:outline-primary"
          >
            <X aria-hidden className="size-4" />
          </button>
        </p>
      ) : (
        <HoldToSpeak onRecorded={setVoice} />
      )}

      {/* An example sentence to start from, in the reader's language. */}
      <div className="flex flex-col gap-1 rounded-lg bg-surface-container-low p-4">
        <span className="text-label-caps uppercase text-on-surface-variant">{t('try')}</span>
        <button
          type="button"
          className="max-w-[60ch] text-left text-body-md font-medium text-primary underline decoration-primary/40 underline-offset-4 hover:decoration-primary"
          onClick={() => setText(example)}
        >
          “{example}”
        </button>
      </div>

      {working && (
        <AgentSteps
          steps={[
            { label: t('understanding'), state: found === undefined ? 'active' : 'done' },
            ...(found ? [{ label: t('found', { count: found }), state: 'done' as const }] : []),
          ]}
        />
      )}
      {found === 0 && (
        <p
          role="status"
          className="flex items-start gap-2 rounded-lg bg-partial-bg p-4 text-partial"
        >
          <Icon name="info" className="mt-0.5 text-lg" />
          {t('nobody')}
        </p>
      )}
      {parse.isError && (
        <p role="alert" className="flex items-start gap-2 rounded-lg bg-gap-bg p-4 text-gap">
          <Icon name="error" className="mt-0.5 text-lg" />
          {ts('error')}
        </p>
      )}
    </SetupFrame>
  );
}
