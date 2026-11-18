/**
 * Datos escribibles de un producto. Es el mismo tipo para crear y editar: el
 * backend acepta el objeto completo en `POST` y `PATCH`.
 */
export interface ProductDraft {
  readonly sku: string;
  readonly name: string;
  readonly description: string | null;
  readonly price: number;
  readonly stock: number;
  readonly category: string | null;
  readonly isActive: boolean;
}

export type ProductDraftField = keyof ProductDraft;

export type ProductDraftErrors = Readonly<Partial<Record<ProductDraftField, string>>>;
