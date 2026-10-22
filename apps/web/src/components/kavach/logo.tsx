import { cn } from '../ui/cn';

/**
 * The Kavach mark: a shield holding a family, with an open hand (logo/Kavach Family Shield Logo.png,
 * cut out at apps/web/public/logo/kavach-mark.png). Square; size it with a `size-*` class.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- a static asset, no optimisation needed
    <img
      src="/logo/kavach-mark.png"
      alt=""
      aria-hidden
      draggable={false}
      className={cn('size-8 select-none object-contain', className)}
    />
  );
}

/** The mark and the word. `deva` adds कवच before it, as on the Stitch brand panel. */
export function Logo({ className, deva = false }: { className?: string; deva?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-2 text-primary', className)}>
      <LogoMark />
      <span className="font-display text-2xl font-bold tracking-tight">
        {deva && (
          <span lang="hi" className="mr-1.5">
            कवच
          </span>
        )}
        Kavach
      </span>
    </span>
  );
}

/** The full lockup (mark and wordmark as drawn), for places that show the brand large. */
export function LogoLockup({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- a static asset, no optimisation needed
    <img
      src="/logo/kavach-lockup.png"
      alt="Kavach"
      draggable={false}
      className={cn('h-10 w-auto select-none object-contain', className)}
    />
  );
}
