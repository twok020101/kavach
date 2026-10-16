'use client';

import { X } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import type { Locale } from '@kavach/schemas';
import { AgentSteps } from '@/components/kavach/agent-steps';
import { HoldToSpeak, type VoiceNote } from '@/components/setup/hold-to-speak';
import { SetupFrame } from '@/components/setup/setup-frame';
import { useSetupHousehold } from '@/components/setup/use-setup-household';
import { Button } from '@/components/ui/button';
import { useRouter } from '@/i18n/navigation';
import { saveIntake, useParseFamily } from '@/lib/setup';

/** S04 Tell us about your family: one sentence, typed or spoken, read by the IntakeAgent. */
export default function FamilyPage() {
  const t = useTranslations('setup.family');
  const ts = useTranslations('setup');
  const locale = useLocale() as Locale;
  const router = useRouter();
  const { data: household } = useSetupHousehold();
  const parse = useParseFamily(household?.id);
  const [text, setText] = useState('');
  const [voice, setVoice] = useState<VoiceNote>();
  const [found, setFound] = useState<number>();

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
      <label className="flex flex-col gap-2">
        <span className="sr-only">{t('label')}</span>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={5}
          maxLength={1000}
          placeholder={t('placeholder')}
          className="w-full rounded-md border border-border-strong bg-surface p-4 text-lg placeholder:text-muted/70"
        />
      </label>

      {voice ? (
        <p className="flex items-center gap-2 self-center rounded-full bg-primary-soft px-4 py-2 text-primary-hover">
          {t('voiceReady', { seconds: voice.seconds })}
          <button
            onClick={() => setVoice(undefined)}
            aria-label={t('clearVoice')}
            className="flex size-8 items-center justify-center rounded-full hover:bg-surface"
          >
            <X aria-hidden className="size-4" />
          </button>
        </p>
      ) : (
        <HoldToSpeak onRecorded={setVoice} />
      )}

      <p className="text-muted">
        {t('try')}{' '}
        <button
          className="text-left font-medium text-primary underline"
          onClick={() => setText(t('example'))}
        >
          “{t('example')}”
        </button>
      </p>

      {working && (
        <AgentSteps
          steps={[
            { label: t('understanding'), state: found === undefined ? 'active' : 'done' },
            ...(found ? [{ label: t('found', { count: found }), state: 'done' as const }] : []),
          ]}
        />
      )}
      {found === 0 && <p className="rounded-md bg-partial-bg p-3 text-partial">{t('nobody')}</p>}
      {parse.isError && <p className="rounded-md bg-gap-bg p-3 text-gap">{ts('error')}</p>}
    </SetupFrame>
  );
}
