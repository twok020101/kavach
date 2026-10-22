'use client';

import { Camera, FileUp, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRef, useState } from 'react';
import { useAddSamples, useDocuments, useUploadDocuments } from '@/components/documents/api';
import { DocumentCard } from '@/components/documents/DocumentCard';
import { Icon } from '@/components/kavach/icon';
import { SetupFrame } from '@/components/setup/setup-frame';
import { Button, buttonClasses } from '@/components/ui/button';
import { cn } from '@/components/ui/cn';
import { Link } from '@/i18n/navigation';
import { useHousehold } from '@/lib/household';

const ACCEPT = 'application/pdf,image/png,image/jpeg,image/webp,image/heic';

/** S07 Documents: upload policies and summaries, watch them being read, confirm what was found. */
export default function DocumentsSetupPage() {
  const t = useTranslations('documents');
  const { data: household, error, refetch, isFetching } = useHousehold();
  const documents = useDocuments(household?.id);
  const { uploads, upload } = useUploadDocuments(household?.id);
  const samples = useAddSamples(household?.id);
  const fileInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const onFiles = (files: FileList | null) => files?.length && upload([...files]);
  const hasSamples = documents.data?.some((d) => d.isSample);
  const hasDocuments = Boolean(documents.data?.length);

  return (
    <SetupFrame
      step={3}
      back="/setup/money"
      title={t('setup.title')}
      intro={t('setup.intro')}
      footer={
        <div className="flex w-full flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <span className="text-body-md text-on-surface-variant">
            {t('setup.none')}{' '}
            <Link
              href="/setup/questions"
              className="inline-flex min-h-12 items-center font-medium text-primary underline underline-offset-4"
            >
              {t('setup.skip')}
            </Link>
          </span>
          {/* One primary per view: choosing files leads until there is something to continue with. */}
          <Link
            href="/setup/questions"
            className={buttonClasses({ size: 'lg', variant: hasDocuments ? 'primary' : 'soft' })}
          >
            {t('setup.continue')}
          </Link>
        </div>
      }
    >
      {error && (
        <div
          role="alert"
          className="flex flex-col items-start gap-3 rounded-lg bg-gap-bg p-4 text-gap sm:p-5"
        >
          <p className="flex items-start gap-2 text-body-md">
            <Icon name="error" className="mt-0.5 text-lg" />
            {t('error')}
          </p>
          <Button variant="secondary" loading={isFetching} onClick={() => refetch()}>
            <Icon name="refresh" className="text-xl" />
            {t('retry')}
          </Button>
        </div>
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
          'flex flex-col items-center gap-4 rounded-lg border-2 border-dashed p-6 text-center transition-colors sm:p-8',
          dragging ? 'border-primary bg-primary-soft' : 'border-outline-variant bg-surface',
        )}
      >
        <span className="flex size-12 items-center justify-center rounded-full bg-primary-soft text-primary">
          <FileUp aria-hidden className="size-6" />
        </span>
        <p className="font-display text-title-md text-on-surface">{t('setup.drop')}</p>
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

      {/* The sample documents are the Sharmas' Indian policies: offered to India's demo only. */}
      {household?.isDemo && household.country === 'IN' && !hasSamples && (
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
          role={u.failed ? 'alert' : 'status'}
          className={cn(
            'flex items-start gap-2 rounded-lg p-3 text-body-md',
            u.failed ? 'bg-gap-bg text-gap' : 'bg-surface-container-low text-on-surface',
          )}
        >
          <Icon name={u.failed ? 'error' : 'upload'} className="mt-0.5 text-lg" />
          {u.failed
            ? t('setup.uploadFailed', { name: u.name })
            : t('setup.uploading', { name: u.name, percent: Math.round(u.percent) })}
        </p>
      ))}

      {samples.isError && (
        <p role="alert" className="flex items-start gap-2 rounded-lg bg-gap-bg p-4 text-gap">
          <Icon name="error" className="mt-0.5 text-lg" />
          {t('error')}
        </p>
      )}

      {documents.isError && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-gap-bg p-4 text-gap"
        >
          <p className="flex items-start gap-2 text-body-md">
            <Icon name="error" className="mt-0.5 text-lg" />
            {t('error')}
          </p>
          <Button
            variant="secondary"
            loading={documents.isFetching}
            onClick={() => documents.refetch()}
          >
            {t('retry')}
          </Button>
        </div>
      )}

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
