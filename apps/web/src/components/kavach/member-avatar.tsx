import type { Member } from '@kavach/schemas';
import { cn } from '../ui/cn';

const tints: Record<Member['relation'], string> = {
  self: 'bg-primary-soft text-primary-hover',
  spouse: 'bg-primary-soft text-primary-hover',
  child: 'bg-safe-bg text-safe',
  parent: 'bg-partial-bg text-partial',
  parent_in_law: 'bg-partial-bg text-partial',
  other: 'bg-na-bg text-na',
};

/** Initials on a circle tinted by relation. */
export function MemberAvatar({ member, className }: { member: Member; className?: string }) {
  const initials = member.name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('');
  return (
    <span
      aria-hidden
      className={cn(
        'inline-flex size-12 shrink-0 items-center justify-center rounded-full font-display text-lg font-bold',
        tints[member.relation],
        className,
      )}
    >
      {initials}
    </span>
  );
}
