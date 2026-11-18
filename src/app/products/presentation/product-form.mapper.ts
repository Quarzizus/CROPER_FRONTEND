import type { Product } from '../domain/product';
import type { ProductDraft } from '../domain/product-draft';

/**
 * Valor del formulario: todo texto (los inputs vacíos son cadenas) y números que
 * pueden faltar mientras la persona escribe.
 */
export interface ProductFormValue {
  readonly sku: string;
  readonly name: string;
  readonly description: string;
  readonly price: number | null;
  readonly stock: number | null;
  readonly category: string;
  readonly isActive: boolean;
}

export const EMPTY_FORM_VALUE: ProductFormValue = {
  sku: '',
  name: '',
  description: '',
  price: null,
  stock: null,
  category: '',
  isActive: true,
};

export function toDraft(value: ProductFormValue): ProductDraft {
  return {
    sku: value.sku,
    name: value.name,
    description: value.description,
    price: value.price ?? Number.NaN,
    stock: value.stock ?? Number.NaN,
    category: value.category,
    isActive: value.isActive,
  };
}

export function toFormValue(product: Product): ProductFormValue {
  return {
    sku: product.sku,
    name: product.name,
    description: product.description ?? '',
    price: product.price,
    stock: product.stock,
    category: product.category ?? '',
    isActive: product.isActive,
  };
}
