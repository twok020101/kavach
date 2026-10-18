import type { ButtonHTMLAttributes } from 'react';
import { cn } from './cn';
import { Spinner } from './spinner';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'accent' | 'soft';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'desk' | 'hero';

/**
 * Solid buttons stand on a hard 2 px base and press down onto it (`.btn-solid` in globals.css);
 * ghost and soft ones only give a little under the finger (`.press`). Hover darkens by a step.
 */
const variants: Record<ButtonVariant, string> = {
  primary: 'btn-solid bg-primary text-on-primary hover:bg-primary-hover',
  secondary:
    'btn-solid btn-outline border-2 border-primary bg-surface text-primary hover:bg-primary-soft',
  soft: 'press bg-primary-soft text-primary-hover hover:bg-primary/15',
  ghost: 'press text-primary hover:bg-primary-soft',
  // Marigold is reserved for the hospital button and brand moments.
  accent: 'btn-solid btn-accent bg-accent text-accent-ink hover:bg-accent-hover',
};

const sizes: Record<ButtonSize, string> = {
  sm: 'min-h-12 px-3 text-base rounded-md',
  md: 'min-h-12 px-4 text-base rounded-md',
  lg: 'min-h-14 px-5 text-lg rounded-lg',
  // Desk mode: 64 px or taller, full width.
  desk: 'min-h-16 w-full px-5 text-lg rounded-lg',
  // The one button on a member's home (S09m): 96 px, full width.
  hero: 'min-h-24 w-full px-6 text-2xl rounded-lg',
};

/** Button styles, also for links that look like buttons. */
export function buttonClasses({
  variant = 'primary',
  size = 'md',
  className,
}: { variant?: ButtonVariant; size?: ButtonSize; className?: string } = {}) {
  return cn(
    'btn inline-flex items-center justify-center gap-2 font-semibold select-none',
    'disabled:cursor-not-allowed disabled:opacity-50',
    variants[variant],
    sizes[size],
    className,
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
};

export function Button({
  variant,
  size,
  loading = false,
  className,
  children,
  disabled,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClasses({ variant, size, className })}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading && <Spinner className="size-5" />}
      {children}
    </button>
  );
}
