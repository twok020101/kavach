import type { CSSProperties } from 'react';
import { cn } from '../ui/cn';

/**
 * A Material Symbols Outlined icon (the Stitch icon set), by its ligature name, e.g. `shield`,
 * `local_hospital`, `family_restroom`. Always decorative: the words beside it carry the meaning.
 * Size it with a text size (`text-xl`) or `size-*`; `fill` switches to the filled glyph.
 */
export function Icon({
  name,
  fill = false,
  weight,
  className,
  style,
}: {
  name: string;
  fill?: boolean;
  /** 300 to 600; defaults to 400. */
  weight?: number;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <span
      aria-hidden
      translate="no"
      className={cn('msym', className)}
      style={
        {
          ...(fill ? { '--msym-fill': 1 } : null),
          ...(weight ? { '--msym-wght': weight } : null),
          ...style,
        } as CSSProperties
      }
    >
      {name}
    </span>
  );
}
