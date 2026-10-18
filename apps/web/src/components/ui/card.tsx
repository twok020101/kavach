import type { ElementType, HTMLAttributes } from 'react';
import { cn } from './cn';

type CardProps = HTMLAttributes<HTMLElement> & {
  as?: 'div' | 'section' | 'article' | 'li' | 'aside';
  /** `raised` and `flat` are both a bordered box (07 elevation 0); `soft` is a sunken panel with no border. */
  tone?: 'raised' | 'flat' | 'soft';
  /** For cards that are links or buttons: the border takes the primary on hover and the card gives on press. */
  interactive?: boolean;
};

/** The default container for content: rounded, white, bordered (elevation 0, never raised). */
export function Card({ as = 'div', tone = 'raised', interactive, className, ...rest }: CardProps) {
  const Tag: ElementType = as;
  return (
    <Tag
      className={cn(
        'rounded-md p-4 sm:p-5',
        tone === 'soft' ? 'bg-sunken' : 'border border-border bg-surface',
        interactive && 'press cursor-pointer hover:border-primary',
        className,
      )}
      {...rest}
    />
  );
}
