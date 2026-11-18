/** Contrato crudo de `/products`. Solo lo usa `infrastructure`. */

export interface ProductDto {
  readonly id: string;
  readonly sku: string;
  readonly name: string;
  readonly description: string | null;
  readonly price: number;
  readonly stock: number;
  readonly category: string | null;
  readonly isActive: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface PageMetaDto {
  readonly page: number;
  readonly limit: number;
  readonly total: number;
  readonly totalPages: number;
}

export interface PaginatedProductsDto {
  readonly data: readonly ProductDto[];
  readonly meta: PageMetaDto;
}

/** `size` de la UI viaja como `limit`; el backend no acepta otro nombre. */
export interface ListProductsQueryDto {
  readonly page: number;
  readonly limit: number;
}

/**
 * Cuerpo de `POST` y `PATCH`. La API es estricta y tipa `description` y
 * `category` como opcionales (no nullable): se omiten cuando no hay valor.
 */
export interface WriteProductRequestDto {
  readonly sku: string;
  readonly name: string;
  readonly price: number;
  readonly stock: number;
  readonly isActive: boolean;
  readonly description?: string;
  readonly category?: string;
}
