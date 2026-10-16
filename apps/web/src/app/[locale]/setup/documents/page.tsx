'use client';

import { Camera, FileUp, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRef, useState } from 'react';
import { useAddSamples, useDocuments, useUploadDocuments } from '@/components/documents/api';
import { DocumentCard } from '@/components/documents/DocumentCard';
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
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col gap-6 px-4 py-6">
      <header className="flex flex-col gap-2">
        <p className="text-sm font-medium text-muted">{t('setup.step')}</p>
        <div className="flex gap-1" aria-hidden>
          {[1, 2, 3, 4].map((n) => (
            <span
              key={n}
              className={cn('h-1.5 flex-1 rounded-full', n <= 3 ? 'bg-primary' : 'bg-border')}
            />
          ))}
        </div>
        <h1 className="font-display text-2xl font-bold">{t('setup.title')}</h1>
        <p className="text-muted">{t('setup.intro')}</p>
      </header>

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

      <footer className="mt-auto flex items-center justify-between gap-3 border-t border-border pt-4">
        <span className="text-sm text-muted">
          {t('setup.none')}{' '}
          <Link href="/policies" className="font-medium text-primary underline">
            {t('setup.skip')}
          </Link>
        </span>
        <Link href="/policies" className={buttonClasses()}>
          {t('setup.continue')}
        </Link>
      </footer>
    </main>
  );
}
