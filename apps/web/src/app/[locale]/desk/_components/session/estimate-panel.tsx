'use client';

import type { BranchResult, HospitalEstimate } from '@kavach/schemas';
import { useTranslations } from 'next-intl';
import type { CSSProperties, Ref } from 'react';
import { Amount } from '@/components/kavach/amount';
import { EstimateLines } from '@/components/kavach/estimate-lines';
import { Icon } from '@/components/kavach/icon';
import { Button } from '@/components/ui/button';
import { cn } from '@/components/ui/cn';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * "Show the hospital estimate" (Stitch desk co-pilot): the two capture buttons, then the scanned
 * bill built from the estimate's lines with the engine's flag on each, the total, and what the
 * policy pays. While a photo is read, the table waits as skeleton rows.
 */
export function EstimatePanel({
  demo,
  estimate,
  result,
  checking,
  capturing,
  busy,
  photoUrl,
  onPhoto,
  onSample,
  billRef,
}: {
  demo: boolean;
  estimate?: HospitalEstimate;
  result?: BranchResult;
  /** The engine is still evaluating the estimate. */
  checking: boolean;
  /** A photo (or the sample) is being read right now. */
  capturing: boolean;
  busy: boolean;
  photoUrl?: string;
  onPhoto: () => void;
  onSample: () => void;
  billRef?: Ref<HTMLDivElement>;
}) {
  const t = useTranslations('desk.session');
  const unclear = estimate?.needsConfirmation && estimate.lines.length === 0;
  const quoted = estimate?.roomCategories[0];

  return (
    <section
      aria-labelledby="capture-title"
      className="rise-in flex flex-col gap-5 rounded-xl border border-border bg-surface p-5 shadow-1 lg:p-6"
      style={{ '--i': 1 } as CSSProperties}
    >
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 id="capture-title" className="font-display text-lg font-bold text-text">
            {t('capture.title')}
          </h2>
          {demo && (
            <span className="inline-flex items-center gap-1 rounded-sm border border-primary/15 bg-primary-soft px-2 py-0.5 text-xs font-semibold text-primary-hover">
              <Icon name="science" className="text-sm" />
              {t('capture.demoData')}
            </span>
          )}
        </div>
        <p className="text-sm text-muted">{t('capture.hint')}</p>
      </div>

      <div className={cn('grid gap-3', demo && 'sm:grid-cols-2')}>
        {/* One line each on a laptop: a tighter label and icon gap than the phone's 64 px buttons. */}
        <Button
          size="desk"
          className="gap-1.5 px-3 text-center text-base lg:text-sm"
          disabled={busy}
          onClick={onPhoto}
        >
          <Icon name="photo_camera" className="text-xl" />
          {t('capture.photo')}
        </Button>
        {demo && (
          <Button
            variant="secondary"
            size="desk"
            className="gap-1.5 px-3 text-center text-base lg:text-sm"
            disabled={busy}
            onClick={onSample}
          >
            <Icon name="description" className="text-xl" />
            {t('capture.sample')}
          </Button>
        )}
      </div>

      {capturing && (
        <div aria-hidden className="flex flex-col gap-2 rounded-lg border border-border p-3">
          <Skeleton className="h-6 w-2/3" />
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-10" />
          ))}
        </div>
      )}

      {estimate && !capturing && (
        <div ref={billRef} data-desk-bill className="flex scroll-mt-40 flex-col gap-3">
          <div className="flex items-start gap-3">
            {photoUrl ? (
              // A local preview of the photo just taken; next/image adds nothing for blob URLs.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photoUrl}
                alt={t('estimate.photoAlt')}
                className="size-14 shrink-0 rounded-md border border-border object-cover"
              />
            ) : (
              <span className="flex size-14 shrink-0 items-center justify-center rounded-md bg-sunken text-muted">
                <Icon name="receipt_long" className="text-3xl" />
              </span>
            )}
            <div className="min-w-0">
              <h3 className="font-display text-base font-bold leading-snug text-text">
                {t('bill.title', { hospital: estimate.hospitalName })}
              </h3>
              <p className="text-sm text-muted">{estimate.procedure}</p>
              {quoted && !unclear && (
                <p className="mt-1 inline-flex items-center gap-1 rounded-sm bg-sunken px-2 py-0.5 text-xs font-semibold text-muted">
                  <Icon name="bed" className="text-sm" />
                  {t('bill.quoted', { room: quoted.label, days: estimate.days })}
                </p>
              )}
            </div>
          </div>

          {unclear ? (
            <ul className="flex flex-col gap-1 rounded-md border border-partial/30 bg-partial-bg p-3 text-sm text-partial">
              {estimate.notes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          ) : estimate.lines.length > 0 ? (
            <EstimateLines estimate={estimate} result={result} checking={checking} />
          ) : (
            // A package list: one price per room for the whole stay.
            <ul className="flex flex-wrap gap-2" aria-label={t('estimate.rooms')}>
              {estimate.roomCategories.map((room) => {
                const figure = estimate.packagePrices?.[room.id] ?? room.rentPerDay;
                return (
                  <li key={room.id} className="rounded-sm bg-sunken px-2.5 py-1.5 text-sm">
                    {figure > 0 && <Amount value={figure} className="font-semibold" />} {room.label}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
