/** Paginación base 1, igual que el contrato de la API. */

export interface PageRequest {
  /** Página solicitada, base 1. */
  readonly page: number;
  /** Tamaño de página (`size` en la URL, `limit` en la API). */
  readonly size: number;
}

export interface Page<T> {
  readonly items: readonly T[];
  readonly page: number;
  readonly size: number;
  readonly total: number;
  readonly totalPages: number;
}

export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 10;
export const MAX_PAGE_SIZE = 100;
export const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

export function totalPagesFor(total: number, size: number): number {
  return size > 0 ? Math.max(1, Math.ceil(total / size)) : 1;
}

/** Acepta cualquier número y devuelve una página válida. */
export function normalizePage(value: unknown, totalPages?: number): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    return DEFAULT_PAGE;
  }
  return typeof totalPages === 'number' ? Math.min(parsed, Math.max(totalPages, 1)) : parsed;
}

/** Solo se aceptan los tamaños ofrecidos por la UI, dentro del límite de la API. */
export function normalizePageSize(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > MAX_PAGE_SIZE) {
    return DEFAULT_PAGE_SIZE;
  }
  return parsed;
}
