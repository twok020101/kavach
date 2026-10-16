import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Joins class names; later Tailwind classes win over earlier ones (e.g. min-h-12 then min-h-16). */
export function cn(...values: ClassValue[]) {
  return twMerge(clsx(values));
}
