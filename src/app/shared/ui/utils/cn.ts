import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Une clases condicionales y resuelve conflictos de Tailwind (la última gana).
 * Es el equivalente de `cn` en shadcn: los componentes permiten composición sin
 * que dos utilidades de padding se anulen entre sí.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
