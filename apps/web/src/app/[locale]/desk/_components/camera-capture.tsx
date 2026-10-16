'use client';

import { Camera, FileText, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';

/**
 * Camera preview with a document frame guide and a Capture button (S22 camera state).
 * Nothing is streamed: only the still goes to the captures endpoint. If the camera can't open,
 * `onUnavailable` hands over to the phone's own camera through a file input.
 */
export function CameraCapture({
  onCapture,
  onClose,
  onUnavailable,
  onSample,
}: {
  onCapture(photo: File): void;
  onClose(): void;
  onUnavailable(): void;
  /** Demo only: use the sample estimate instead of a photo. */
  onSample?: () => void;
}) {
  const t = useTranslations('live.camera');
  const video = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let stream: MediaStream | undefined;
    let cancelled = false;
    navigator.mediaDevices
      .getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      })
      .then((s) => {
        if (cancelled) return s.getTracks().forEach((tr) => tr.stop());
        stream = s;
        if (video.current) video.current.srcObject = s;
      })
      .catch(() => !cancelled && onUnavailable());
    return () => {
      cancelled = true;
      stream?.getTracks().forEach((tr) => tr.stop());
    };
  }, [onUnavailable]);

  function capture() {
    const v = video.current;
    if (!v || !v.videoWidth) return;
    const canvas = document.createElement('canvas');
    canvas.width = v.videoWidth;
    canvas.height = v.videoHeight;
    canvas.getContext('2d')?.drawImage(v, 0, 0);
    canvas.toBlob(
      (blob) => blob && onCapture(new File([blob], 'estimate.jpg', { type: 'image/jpeg' })),
      'image/jpeg',
      0.92,
    );
  }

  return (
    <section
      aria-label={t('title')}
      className="fixed inset-0 z-30 flex flex-col gap-3 bg-bg px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-4"
    >
      <div className="relative min-h-0 flex-1 overflow-hidden rounded-lg bg-text">
        <video
          ref={video}
          autoPlay
          playsInline
          muted
          onLoadedData={() => setReady(true)}
          className="size-full object-cover"
        />
        {/* Document frame guide */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-6 rounded-md border-4 border-dashed border-accent"
        />
      </div>
      <p className="text-center text-lg font-semibold">{t('hint')}</p>
      <div className="grid grid-cols-[1fr_auto] gap-3">
        <Button variant="accent" size="desk" disabled={!ready} onClick={capture}>
          <Camera aria-hidden className="size-6" />
          {t('capture')}
        </Button>
        <Button
          variant="secondary"
          className="min-h-16 min-w-16 px-0"
          aria-label={t('back')}
          onClick={onClose}
        >
          <X aria-hidden className="size-7" />
        </Button>
      </div>
      {onSample && (
        <Button variant="ghost" size="desk" onClick={onSample}>
          <FileText aria-hidden className="size-6" />
          {t('sample')}
        </Button>
      )}
    </section>
  );
}
