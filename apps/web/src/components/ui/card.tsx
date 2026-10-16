import type { ElementType, HTMLAttributes } from 'react';
import { cn } from './cn';

type CardProps = HTMLAttributes<HTMLElement> & { as?: 'div' | 'section' | 'article' | 'li' };

/** Flat bordered surface; the default container for content. */
export function Card({ as = 'div', className, ...rest }: CardProps) {
  const Tag: ElementType = as;
  return (
    <Tag
      className={cn('rounded-md border border-border bg-surface p-4 sm:p-6', className)}
      {...rest}
    />
  );
}
