import type { ElementType, HTMLAttributes } from 'react';
import { cn } from './cn';

type CardProps = HTMLAttributes<HTMLElement> & {
  as?: 'div' | 'section' | 'article' | 'li' | 'aside';
  /** `raised` (default) sits on the page with a soft shadow; `flat` is a bordered well; `soft` is a tinted panel with no border. */
  tone?: 'raised' | 'flat' | 'soft';
  /** Lifts on hover and shows a pointer: for cards that are links or buttons. */
  interactive?: boolean;
};

/** The default container for content: rounded, white, lightly raised. */
export function Card({ as = 'div', tone = 'raised', interactive, className, ...rest }: CardProps) {
  const Tag: ElementType = as;
  return (
    <Tag
      className={cn(
        'rounded-md p-4 sm:p-5',
        tone === 'raised' && 'border border-border bg-surface shadow-1',
        tone === 'flat' && 'border border-border bg-surface',
        tone === 'soft' && 'bg-sunken',
        interactive &&
          'press cursor-pointer hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-2',
        className,
      )}
      {...rest}
    />
  );
}
