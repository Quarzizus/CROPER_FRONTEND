import { describe, expect, it } from 'vitest';
import { NO_PRODUCT_FILTERS } from '../domain/product-filters';
import type { ProductDraft } from '../domain/product-draft';
import type { PaginatedProductsDto, ProductDto } from './product.dto';
import { toListQuery, toPage, toProduct, toWriteRequest } from './product.mapper';

const dto: ProductDto = {
  id: '6650f1c2a8e4b1a2c3d4e5f6',
  sku: 'CAF-001',
  name: 'Café molido 500 g',
  description: 'Tueste medio',
  price: 12.5,
  stock: 40,
  category: 'bebidas',
  isActive: true,
  createdAt: '2026-01-01T10:00:00.000Z',
  updatedAt: '2026-01-02T10:00:00.000Z',
};

const draft: ProductDraft = {
  sku: 'CAF-001',
  name: 'Café molido 500 g',
  description: 'Tueste medio',
  price: 12.5,
  stock: 40,
  category: 'bebidas',
  isActive: true,
};

describe('toProduct', () => {
  it('conserva los campos del contrato', () => {
    expect(toProduct(dto)).toEqual({
      id: dto.id,
      sku: dto.sku,
      name: dto.name,
      description: 'Tueste medio',
      price: 12.5,
      stock: 40,
      category: 'bebidas',
      isActive: true,
      createdAt: dto.createdAt,
      updatedAt: dto.updatedAt,
    });
  });

  it('lee description y category vacías como null', () => {
    expect(toProduct({ ...dto, description: '', category: '   ' })).toMatchObject({
      description: null,
      category: null,
    });
  });
});

describe('toPage', () => {
  const paginated: PaginatedProductsDto = {
    data: [dto],
    meta: { page: 2, limit: 20, total: 41, totalPages: 3 },
  };

  it('traduce `limit` de la API a `size` del dominio', () => {
    expect(toPage(paginated)).toMatchObject({ page: 2, size: 20, total: 41, totalPages: 3 });
    expect(toPage(paginated).items).toHaveLength(1);
  });

  it('nunca deja el catálogo vacío sin una página', () => {
    const empty = toPage({
      data: [],
      meta: { page: 1, limit: 10, total: 0, totalPages: 0 },
    });

    expect(empty.totalPages).toBe(1);
    expect(empty.items).toEqual([]);
  });
});

describe('toListQuery', () => {
  it('envía page y limit: la API no acepta `size`', () => {
    expect(toListQuery({ page: 3, size: 50, filters: NO_PRODUCT_FILTERS })).toEqual({
      page: 3,
      limit: 50,
      sort: '-createdAt',
    });
  });

  it('omite los filtros vacíos: la API responde 400 a `search=`', () => {
    const query = toListQuery({ page: 1, size: 10, filters: NO_PRODUCT_FILTERS });

    expect(query).not.toHaveProperty('search');
    expect(query).not.toHaveProperty('category');
    expect(query).not.toHaveProperty('minPrice');
    expect(query).not.toHaveProperty('maxPrice');
  });

  it('traduce los filtros activos, con el orden pedido', () => {
    expect(
      toListQuery({
        page: 2,
        size: 20,
        filters: {
          search: 'cafe',
          category: 'bebidas',
          minPrice: 5,
          maxPrice: 20,
          sort: 'price',
        },
      }),
    ).toEqual({
      page: 2,
      limit: 20,
      search: 'cafe',
      category: 'bebidas',
      minPrice: 5,
      maxPrice: 20,
      sort: 'price',
    });
  });

  it('envía un rango de precio abierto', () => {
    const query = toListQuery({
      page: 1,
      size: 10,
      filters: { ...NO_PRODUCT_FILTERS, minPrice: 0 },
    });

    expect(query).toMatchObject({ minPrice: 0 });
    expect(query).not.toHaveProperty('maxPrice');
  });
});

describe('toWriteRequest', () => {
  it('omite description y category vacías para no romper el contrato estricto', () => {
    const request = toWriteRequest({ ...draft, description: null, category: '  ' });

    expect(request).toEqual({
      sku: 'CAF-001',
      name: 'Café molido 500 g',
      price: 12.5,
      stock: 40,
      isActive: true,
    });
    expect('description' in request).toBe(false);
    expect('category' in request).toBe(false);
  });

  it('incluye los opcionales cuando tienen valor y conserva isActive false', () => {
    const request = toWriteRequest({ ...draft, isActive: false });

    expect(request).toMatchObject({
      description: 'Tueste medio',
      category: 'bebidas',
      isActive: false,
    });
  });
});
