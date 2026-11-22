import { totalPagesFor, type Page } from '../domain/page';
import type { Product } from '../domain/product';
import type { ProductDraft } from '../domain/product-draft';
import type { ProductListRequest, ProductSort } from '../domain/product-filters';
import type {
  ListProductsQueryDto,
  PaginatedProductsDto,
  ProductDto,
  WriteProductRequestDto,
} from './product.dto';

/**
 * Frontera API <-> dominio. Si cambia el contrato del Ejercicio 1, cambia este
 * archivo: ni el store ni los componentes se enteran.
 */

/** Un texto opcional vacío en la base se lee como "sin valor". */
function optionalText(value: string | null): string | null {
  const trimmed = (value ?? '').trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function toProduct(dto: ProductDto): Product {
  return {
    id: dto.id,
    sku: dto.sku,
    name: dto.name,
    description: optionalText(dto.description),
    price: dto.price,
    stock: dto.stock,
    category: optionalText(dto.category),
    isActive: dto.isActive,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}

export function toPage(dto: PaginatedProductsDto): Page<Product> {
  return {
    items: dto.data.map(toProduct),
    page: dto.meta.page,
    size: dto.meta.limit,
    total: dto.meta.total,
    // El backend calcula `ceil(total / limit)`, que es 0 con el catálogo vacío.
    // La UI siempre necesita al menos una página.
    totalPages: totalPagesFor(dto.meta.total, dto.meta.limit),
  };
}

/**
 * La API es estricta con el query: un filtro vacío (`search=`) responde 400 y
 * un parámetro desconocido también. Por eso solo viaja lo que filtra de verdad.
 * `sort` va siempre: el orden por defecto lo fija el dominio, no el servidor.
 */
export function toListQuery(request: ProductListRequest): ListProductsQueryDto {
  const { filters } = request;
  const query: {
    page: number;
    limit: number;
    sort: ProductSort;
    search?: string;
    category?: string;
    minPrice?: number;
    maxPrice?: number;
  } = { page: request.page, limit: request.size, sort: filters.sort };

  if (filters.search !== null) {
    query.search = filters.search;
  }
  if (filters.category !== null) {
    query.category = filters.category;
  }
  if (filters.minPrice !== null) {
    query.minPrice = filters.minPrice;
  }
  if (filters.maxPrice !== null) {
    query.maxPrice = filters.maxPrice;
  }

  return query;
}

/**
 * `description` y `category` se omiten cuando están vacíos: enviar `null` o `''`
 * los guardaría como cadena vacía, y la API es estricta con los tipos.
 */
export function toWriteRequest(draft: ProductDraft): WriteProductRequestDto {
  const request: {
    sku: string;
    name: string;
    price: number;
    stock: number;
    isActive: boolean;
    description?: string;
    category?: string;
  } = {
    sku: draft.sku,
    name: draft.name,
    price: draft.price,
    stock: draft.stock,
    isActive: draft.isActive,
  };

  const description = optionalText(draft.description);
  if (description !== null) {
    request.description = description;
  }

  const category = optionalText(draft.category);
  if (category !== null) {
    request.category = category;
  }

  return request;
}
