import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/**
 * tailwind-merge that knows the Stitch type scale (globals.css @theme): without this it reads
 * `text-body-sm` as a colour and drops it when a text colour sits in the same call.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [
        {
          text: [
            'headline-xl',
            'headline-lg',
            'headline-md',
            'headline-sm',
            'title-md',
            'body-lg',
            'body-md',
            'body-sm',
            'numeral-lg',
            'numeral-md',
            'citation-md',
            'citation-sm',
            'label-caps',
          ],
        },
      ],
    },
  },
});

/** Joins class names; later Tailwind classes win over earlier ones (e.g. min-h-12 then min-h-16). */
export function cn(...values: ClassValue[]) {
  return twMerge(clsx(values));
}
