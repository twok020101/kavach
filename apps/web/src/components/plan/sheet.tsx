'use client';

import { X } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useTranslations } from 'next-intl';
import { useEffect, type ReactNode } from 'react';

/**
 * A bottom sheet over the page (S10 cell detail, S18 change confirm). It rises on the drawer
 * curve in 300 ms and leaves the way it came; Escape or the backdrop closes it. On a phone a
 * pull handle sits at the top.
 */
export function Sheet({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: ReactNode;
  onClose: () => void;
  children: ReactNode;
}) {
  const t = useTranslations('plan');
  const reduce = useReducedMotion();
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-40 flex items-end justify-center sm:items-center sm:p-6">
          <motion.button
            aria-label={t('close')}
            className="absolute inset-0 bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            className="relative max-h-[85dvh] w-full max-w-xl overflow-y-auto rounded-t-lg bg-surface p-4 pb-8 shadow-2 sm:max-h-[90dvh] sm:rounded-lg"
            initial={reduce ? { opacity: 0 } : { transform: 'translateY(100%)' }}
            animate={reduce ? { opacity: 1 } : { transform: 'translateY(0%)' }}
            exit={reduce ? { opacity: 0 } : { transform: 'translateY(100%)' }}
            transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
          >
            <div className="sticky -top-4 z-10 -mx-4 -mt-4 mb-3 flex flex-col bg-surface px-4 pb-2 pt-3">
              <span aria-hidden className="sheet-handle" />
              <div className="flex items-start gap-3">
                <h2 className="flex-1 font-display text-xl font-bold">{title}</h2>
                <button
                  onClick={onClose}
                  aria-label={t('close')}
                  className="press -mr-2 -mt-1 flex size-12 items-center justify-center rounded-md text-muted hover:bg-sunken"
                >
                  <X aria-hidden className="size-6" />
                </button>
              </div>
            </div>
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
