import type { ButtonHTMLAttributes } from 'react';
import { cn } from './cn';
import { Spinner } from './spinner';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'accent' | 'soft';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'desk' | 'hero';

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-on-primary shadow-1 hover:bg-primary-hover',
  secondary: 'border-2 border-primary bg-surface text-primary hover:bg-primary-soft',
  soft: 'bg-primary-soft text-primary-hover hover:bg-primary/15',
  ghost: 'text-primary hover:bg-primary-soft',
  // Marigold is reserved for the hospital button and brand moments.
  accent: 'bg-accent text-accent-ink shadow-accent hover:brightness-[1.03] hover:shadow-2',
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
    'press inline-flex items-center justify-center gap-2 font-semibold',
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
