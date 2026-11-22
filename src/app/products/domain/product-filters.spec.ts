import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PRODUCT_SORT,
  NO_PRODUCT_FILTERS,
  activeFilterCount,
  compactParams,
  filtersEqual,
  filtersFromQuery,
  filtersToQueryParams,
  hasActiveFilters,
  isPriceRangeInvalid,
  normalizePriceFilter,
  normalizeSort,
  normalizeTextFilter,
  type ProductFilters,
} from './product-filters';

function reader(params: Record<string, string>): { get(name: string): string | null } {
  return { get: (name) => params[name] ?? null };
}

function filters(overrides: Partial<ProductFilters> = {}): ProductFilters {
  return { ...NO_PRODUCT_FILTERS, ...overrides };
}

describe('normalizeTextFilter', () => {
  it('recorta y trata el vacío como ausencia de filtro', () => {
    expect(normalizeTextFilter('  semillas  ', 60)).toBe('semillas');
    expect(normalizeTextFilter('   ', 60)).toBeNull();
    expect(normalizeTextFilter(null, 60)).toBeNull();
    expect(normalizeTextFilter(undefined, 60)).toBeNull();
  });

  it('acota al máximo que acepta la API en lugar de provocar un 400', () => {
    expect(normalizeTextFilter('a'.repeat(130), 120)).toHaveLength(120);
  });
});

describe('normalizePriceFilter', () => {
  it('convierte la cadena de la URL a número y redondea a 2 decimales', () => {
    expect(normalizePriceFilter('12.567')).toBe(12.57);
    expect(normalizePriceFilter(0)).toBe(0);
  });

  it('descarta valores que la API rechazaría', () => {
    expect(normalizePriceFilter('')).toBeNull();
    expect(normalizePriceFilter('abc')).toBeNull();
    expect(normalizePriceFilter(-1)).toBeNull();
    expect(normalizePriceFilter(null)).toBeNull();
  });
});

describe('normalizeSort', () => {
  it('acepta los órdenes del contrato', () => {
    expect(normalizeSort('-price')).toBe('-price');
    expect(normalizeSort('name')).toBe('name');
  });

  it('cae al default ante cualquier valor desconocido', () => {
    expect(normalizeSort('nope')).toBe(DEFAULT_PRODUCT_SORT);
    expect(normalizeSort(null)).toBe(DEFAULT_PRODUCT_SORT);
  });
});

describe('filtersFromQuery', () => {
  it('lee y normaliza los filtros de la URL', () => {
    expect(
      filtersFromQuery(
        reader({ search: ' cafe ', category: 'bebidas', minPrice: '5', maxPrice: '20', sort: 'price' }),
      ),
    ).toEqual({
      search: 'cafe',
      category: 'bebidas',
      minPrice: 5,
      maxPrice: 20,
      sort: 'price',
    });
  });

  it('sin params devuelve el listado sin filtrar', () => {
    expect(filtersFromQuery(reader({}))).toEqual(NO_PRODUCT_FILTERS);
  });

  it('ignora params basura en vez de pedirle basura a la API', () => {
    expect(
      filtersFromQuery(reader({ minPrice: 'abc', maxPrice: '-3', sort: 'asc', search: '   ' })),
    ).toEqual(NO_PRODUCT_FILTERS);
  });
});

describe('filtersToQueryParams', () => {
  it('omite lo que no filtra y el sort por defecto', () => {
    expect(filtersToQueryParams(NO_PRODUCT_FILTERS)).toEqual({
      search: null,
      category: null,
      minPrice: null,
      maxPrice: null,
      sort: null,
    });
  });

  it('serializa los filtros activos para la URL', () => {
    expect(filtersToQueryParams(filters({ search: 'cafe', minPrice: 10, sort: 'name' }))).toEqual({
      search: 'cafe',
      category: null,
      minPrice: '10',
      maxPrice: null,
      sort: 'name',
    });
  });
});

describe('compactParams', () => {
  it('deja solo las claves con valor', () => {
    expect(compactParams({ page: '2', search: null, sort: 'price' })).toEqual({
      page: '2',
      sort: 'price',
    });
  });
});

describe('estado de los filtros', () => {
  it('sin filtros no hay nada activo', () => {
    expect(hasActiveFilters(NO_PRODUCT_FILTERS)).toBe(false);
    expect(activeFilterCount(NO_PRODUCT_FILTERS)).toBe(0);
  });

  it('cuenta cada filtro activo, incluido un orden distinto del default', () => {
    const active = filters({ search: 'cafe', minPrice: 0, sort: 'price' });

    expect(hasActiveFilters(active)).toBe(true);
    expect(activeFilterCount(active)).toBe(3);
  });

  it('compara por valor: dos objetos iguales no recargan', () => {
    expect(filtersEqual(filters({ search: 'a' }), filters({ search: 'a' }))).toBe(true);
    expect(filtersEqual(filters({ search: 'a' }), filters({ search: 'b' }))).toBe(false);
  });

  it('detecta el rango de precio invertido que la API no valida', () => {
    expect(isPriceRangeInvalid(filters({ minPrice: 100, maxPrice: 1 }))).toBe(true);
    expect(isPriceRangeInvalid(filters({ minPrice: 1, maxPrice: 100 }))).toBe(false);
    expect(isPriceRangeInvalid(filters({ minPrice: 10 }))).toBe(false);
  });
});
