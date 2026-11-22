import type { PageRequest } from './page';

/**
 * Filtros del listado, alineados con `GET /products` del backend:
 * `search`, `category`, `minPrice`, `maxPrice` y `sort`.
 *
 * Dos bordes del contrato que este archivo absorbe:
 * - El backend valida con Zod en modo estricto: un parámetro vacío (`search=`)
 *   o desconocido devuelve 400. Por eso "sin filtro" es `null` y no `''`.
 * - `sort` tiene default `-createdAt`; pedirlo explícito evita depender del eco
 *   del servidor.
 */

export const PRODUCT_SORTS = [
  'createdAt',
  '-createdAt',
  'price',
  '-price',
  'name',
  '-name',
] as const;

export type ProductSort = (typeof PRODUCT_SORTS)[number];

export const DEFAULT_PRODUCT_SORT: ProductSort = '-createdAt';

/** Límites de la API. Enviar más devuelve 400 y el usuario no debe verlo. */
export const SEARCH_MAX_LENGTH = 120;
export const CATEGORY_MAX_LENGTH = 60;

export interface ProductFilters {
  /** Coincidencia parcial, sin distinguir mayúsculas, **solo sobre `name`**. */
  readonly search: string | null;
  /** Coincidencia exacta, distinguendo mayúsculas y acentos. */
  readonly category: string | null;
  readonly minPrice: number | null;
  readonly maxPrice: number | null;
  readonly sort: ProductSort;
}

export const NO_PRODUCT_FILTERS: ProductFilters = {
  search: null,
  category: null,
  minPrice: null,
  maxPrice: null,
  sort: DEFAULT_PRODUCT_SORT,
};

export interface ProductListRequest extends PageRequest {
  readonly filters: ProductFilters;
}

/** Lo mínimo que necesita `filtersFromQuery`; compatible con `ParamMap`. */
export interface QueryParamReader {
  get(name: string): string | null;
}

/** Texto opcional: se recorta, se acota a lo que acepta la API y vacío es `null`. */
export function normalizeTextFilter(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }

  return trimmed.slice(0, maxLength);
}

/**
 * Precio opcional. Un `''`, `null`, `NaN` o negativo no es un filtro válido:
 * se descarta en lugar de provocar un 400. Se redondea a 2 decimales porque el
 * catálogo se guarda como precio decimal.
 */
export function normalizePriceFilter(value: unknown): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }

  return Math.round(parsed * 100) / 100;
}

/** Cualquier valor fuera del enum cae al default: la URL no puede romper la API. */
export function normalizeSort(value: unknown): ProductSort {
  if (typeof value !== 'string') {
    return DEFAULT_PRODUCT_SORT;
  }

  const match = PRODUCT_SORTS.find((sort) => sort === value);
  return match ?? DEFAULT_PRODUCT_SORT;
}

/** La URL manda; aquí se normaliza todo lo que llega de ella. */
export function filtersFromQuery(params: QueryParamReader): ProductFilters {
  return {
    search: normalizeTextFilter(params.get('search'), SEARCH_MAX_LENGTH),
    category: normalizeTextFilter(params.get('category'), CATEGORY_MAX_LENGTH),
    minPrice: normalizePriceFilter(params.get('minPrice')),
    maxPrice: normalizePriceFilter(params.get('maxPrice')),
    sort: normalizeSort(params.get('sort')),
  };
}

export function filtersEqual(left: ProductFilters, right: ProductFilters): boolean {
  return (
    left.search === right.search &&
    left.category === right.category &&
    left.minPrice === right.minPrice &&
    left.maxPrice === right.maxPrice &&
    left.sort === right.sort
  );
}

export function hasActiveFilters(filters: ProductFilters): boolean {
  return (
    filters.search !== null ||
    filters.category !== null ||
    filters.minPrice !== null ||
    filters.maxPrice !== null ||
    filters.sort !== DEFAULT_PRODUCT_SORT
  );
}

/** Cuántos filtros están puestos, para el contador del botón de limpiar. */
export function activeFilterCount(filters: ProductFilters): number {
  let count = 0;
  if (filters.search !== null) count += 1;
  if (filters.category !== null) count += 1;
  if (filters.minPrice !== null) count += 1;
  if (filters.maxPrice !== null) count += 1;
  if (filters.sort !== DEFAULT_PRODUCT_SORT) count += 1;
  return count;
}

/**
 * El backend no compara `minPrice` con `maxPrice`: si el rango está invertido
 * responde `total: 0` y el usuario no sabría por qué. La UI lo avisa antes.
 */
export function isPriceRangeInvalid(filters: ProductFilters): boolean {
  return (
    filters.minPrice !== null &&
    filters.maxPrice !== null &&
    filters.minPrice > filters.maxPrice
  );
}

/**
 * Params para navegar. `null` elimina la clave cuando el router fusiona
 * (`queryParamsHandling: 'merge'`); el sort por defecto no ensucia la URL.
 */
export function filtersToQueryParams(filters: ProductFilters): Record<string, string | null> {
  return {
    search: filters.search,
    category: filters.category,
    minPrice: filters.minPrice === null ? null : String(filters.minPrice),
    maxPrice: filters.maxPrice === null ? null : String(filters.maxPrice),
    sort: filters.sort === DEFAULT_PRODUCT_SORT ? null : filters.sort,
  };
}

/** Quita las claves sin valor: enlaces y retornos no arrastran `null`. */
export function compactParams(
  params: Readonly<Record<string, string | null>>,
): Record<string, string> {
  const compact: Record<string, string> = {};

  for (const [key, value] of Object.entries(params)) {
    if (value !== null) {
      compact[key] = value;
    }
  }

  return compact;
}
