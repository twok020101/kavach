import { Quote } from 'lucide-react';
import { cn } from '../ui/cn';

/** Where a fact came from, e.g. "Policy wording §4.2.1 · p14". Opens the source when it has a link. */
export function CitationChip({
  label,
  href,
  className,
}: {
  label: string;
  href?: string;
  className?: string;
}) {
  const classes = cn(
    'inline-flex min-h-8 items-center gap-1 rounded-sm bg-citation-bg px-2 text-xs font-medium text-citation',
    href && 'underline-offset-2 hover:underline',
    className,
  );
  const content = (
    <>
      <Quote aria-hidden className="size-3.5 shrink-0" />
      <span>{label}</span>
    </>
  );
  return href ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className={classes}>
      {content}
    </a>
  ) : (
    <span className={classes}>{content}</span>
  );
}
