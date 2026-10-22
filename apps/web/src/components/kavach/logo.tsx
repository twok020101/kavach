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

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2 text-primary', className)}>
      <LogoMark />
      <span className="font-display text-2xl font-bold tracking-tight">Kavach</span>
    </span>
  );
}
