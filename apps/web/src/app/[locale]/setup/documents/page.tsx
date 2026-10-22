'use client';

import { Camera, FileUp, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRef, useState } from 'react';
import { useAddSamples, useDocuments, useUploadDocuments } from '@/components/documents/api';
import { DocumentCard } from '@/components/documents/DocumentCard';
import { SetupFrame } from '@/components/setup/setup-frame';
import { Button, buttonClasses } from '@/components/ui/button';
import { cn } from '@/components/ui/cn';
import { Link } from '@/i18n/navigation';
import { useHousehold } from '@/lib/household';

const ACCEPT = 'application/pdf,image/png,image/jpeg,image/webp,image/heic';

/** S07 Documents: upload policies and summaries, watch them being read, confirm what was found. */
export default function DocumentsSetupPage() {
  const t = useTranslations('documents');
  const { data: household, error, refetch } = useHousehold();
  const documents = useDocuments(household?.id);
  const { uploads, upload } = useUploadDocuments(household?.id);
  const samples = useAddSamples(household?.id);
  const fileInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const onFiles = (files: FileList | null) => files?.length && upload([...files]);
  const hasSamples = documents.data?.some((d) => d.isSample);

  return (
    <SetupFrame
      step={3}
      back="/setup/money"
      title={t('setup.title')}
      intro={t('setup.intro')}
      footer={
        <div className="flex w-full items-center justify-between gap-3">
          <span className="text-sm text-muted">
            {t('setup.none')}{' '}
            <Link href="/setup/questions" className="font-medium text-primary underline">
              {t('setup.skip')}
            </Link>
          </span>
          <Link href="/setup/questions" className={buttonClasses()}>
            {t('setup.continue')}
          </Link>
        </div>
      }
    >
      {error && (
        <p className="rounded-md bg-gap-bg p-3 text-gap">
          {t('error')}{' '}
          <button className="underline" onClick={() => refetch()}>
            {t('retry')}
          </button>
        </p>
      )}

      <section
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          onFiles(e.dataTransfer.files);
        }}
        className={cn(
          'flex flex-col items-center gap-3 rounded-lg border-2 border-dashed p-6 text-center',
          dragging ? 'border-primary bg-primary-soft' : 'border-border-strong bg-surface',
        )}
      >
        <FileUp aria-hidden className="size-8 text-muted" />
        <p className="font-medium">{t('setup.drop')}</p>
        <div className="flex flex-wrap justify-center gap-2">
          <Button disabled={!household} onClick={() => fileInput.current?.click()}>
            {t('setup.choose')}
          </Button>
          <Button
            variant="secondary"
            disabled={!household}
            onClick={() => cameraInput.current?.click()}
          >
            <Camera aria-hidden className="size-5" />
            {t('setup.photo')}
          </Button>
        </div>
        <input
          ref={fileInput}
          type="file"
          accept={ACCEPT}
          multiple
          hidden
          onChange={(e) => onFiles(e.target.files)}
        />
        <input
          ref={cameraInput}
          type="file"
          accept="image/*"
          capture="environment"
          hidden
          onChange={(e) => onFiles(e.target.files)}
        />
      </section>

      {household?.isDemo && !hasSamples && (
        <Button
          variant="ghost"
          loading={samples.isPending}
          onClick={() => samples.mutate()}
          className="self-center"
        >
          <Sparkles aria-hidden className="size-5" />
          {t('setup.useSamples')}
        </Button>
      )}

      {uploads.map((u) => (
        <p
          key={u.name}
          className={cn('rounded-md p-3 text-sm', u.failed ? 'bg-gap-bg text-gap' : 'bg-sunken')}
        >
          {u.failed
            ? t('setup.uploadFailed', { name: u.name })
            : t('setup.uploading', { name: u.name, percent: Math.round(u.percent) })}
        </p>
      ))}

      {household && (
        <div className="flex flex-col gap-3">
          {documents.data?.map((document) => (
            <DocumentCard key={document.id} document={document} household={household} />
          ))}
        </div>
      )}
    </SetupFrame>
  );
}
