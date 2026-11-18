import { totalPagesFor, type Page, type PageRequest } from '../domain/page';
import type { Product } from '../domain/product';
import type { ProductDraft } from '../domain/product-draft';
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

export function toListQuery(request: PageRequest): ListProductsQueryDto {
  return { page: request.page, limit: request.size };
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
