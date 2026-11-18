import type { ProductDraft, ProductDraftErrors } from './product-draft';

/**
 * Reglas de negocio del producto, espejo exacto de `create-product.dto.ts` del
 * backend. Son funciones puras: las usa el formulario para validar y la
 * presentación para normalizar antes de guardar.
 */

export const SKU_MIN_LENGTH = 3;
export const SKU_MAX_LENGTH = 32;
export const NAME_MIN_LENGTH = 2;
export const NAME_MAX_LENGTH = 120;
export const DESCRIPTION_MAX_LENGTH = 2000;
export const CATEGORY_MAX_LENGTH = 60;
export const SKU_PATTERN = /^[A-Za-z0-9-]+$/;

const PRICE_SCALE = 100;
const DECIMAL_EPSILON = 1e-9;

/** El backend normaliza el SKU a mayúsculas; el formulario hace lo mismo. */
export function normalizeSku(sku: string): string {
  return sku.trim().toUpperCase();
}

/** Un texto opcional vacío se guarda como `null`, no como cadena vacía. */
export function normalizeOptionalText(value: string | null | undefined): string | null {
  const trimmed = (value ?? '').trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function normalizeDraft(draft: ProductDraft): ProductDraft {
  return {
    sku: normalizeSku(draft.sku),
    name: draft.name.trim(),
    description: normalizeOptionalText(draft.description),
    price: draft.price,
    stock: draft.stock,
    category: normalizeOptionalText(draft.category),
    isActive: draft.isActive,
  };
}

export function validateSku(sku: string): string | null {
  const value = normalizeSku(sku);

  if (value.length < SKU_MIN_LENGTH) {
    return `El SKU debe tener al menos ${SKU_MIN_LENGTH} caracteres`;
  }
  if (value.length > SKU_MAX_LENGTH) {
    return `El SKU no puede superar los ${SKU_MAX_LENGTH} caracteres`;
  }
  if (!SKU_PATTERN.test(value)) {
    return 'El SKU solo admite letras, números y guiones';
  }
  return null;
}

export function validateName(name: string): string | null {
  const value = name.trim();

  if (value.length < NAME_MIN_LENGTH) {
    return `El nombre debe tener al menos ${NAME_MIN_LENGTH} caracteres`;
  }
  if (value.length > NAME_MAX_LENGTH) {
    return `El nombre no puede superar los ${NAME_MAX_LENGTH} caracteres`;
  }
  return null;
}

export function validatePrice(price: number): string | null {
  if (!Number.isFinite(price)) {
    return 'El precio es obligatorio';
  }
  if (price < 0) {
    return 'El precio no puede ser negativo';
  }

  const scaled = price * PRICE_SCALE;
  if (Math.abs(scaled - Math.round(scaled)) > DECIMAL_EPSILON) {
    return 'El precio admite como máximo dos decimales';
  }
  return null;
}

export function validateStock(stock: number): string | null {
  if (!Number.isFinite(stock)) {
    return 'El stock es obligatorio';
  }
  if (!Number.isInteger(stock)) {
    return 'El stock debe ser un entero';
  }
  if (stock < 0) {
    return 'El stock no puede ser negativo';
  }
  return null;
}

export function validateDescription(description: string | null): string | null {
  return (description ?? '').trim().length > DESCRIPTION_MAX_LENGTH
    ? `La descripción no puede superar los ${DESCRIPTION_MAX_LENGTH} caracteres`
    : null;
}

export function validateCategory(category: string | null): string | null {
  return (category ?? '').trim().length > CATEGORY_MAX_LENGTH
    ? `La categoría no puede superar los ${CATEGORY_MAX_LENGTH} caracteres`
    : null;
}

/** Un solo mapa de errores para pintar el formulario de una vez. */
export function validateDraft(draft: ProductDraft): ProductDraftErrors {
  // `-readonly` es necesario: `ProductDraft` declara campos readonly y el mapeo
  // los conservaría, impidiendo construir el objeto de errores.
  const errors: { -readonly [K in keyof ProductDraft]?: string } = {};

  const sku = validateSku(draft.sku);
  if (sku) {
    errors.sku = sku;
  }

  const name = validateName(draft.name);
  if (name) {
    errors.name = name;
  }

  const description = validateDescription(draft.description);
  if (description) {
    errors.description = description;
  }

  const price = validatePrice(draft.price);
  if (price) {
    errors.price = price;
  }

  const stock = validateStock(draft.stock);
  if (stock) {
    errors.stock = stock;
  }

  const category = validateCategory(draft.category);
  if (category) {
    errors.category = category;
  }

  return errors;
}

export function hasDraftErrors(errors: ProductDraftErrors): boolean {
  return Object.keys(errors).length > 0;
}
