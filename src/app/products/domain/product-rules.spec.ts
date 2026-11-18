import { describe, expect, it } from 'vitest';
import type { ProductDraft } from './product-draft';
import {
  hasDraftErrors,
  normalizeDraft,
  normalizeOptionalText,
  normalizeSku,
  validateDraft,
  validatePrice,
  validateSku,
  validateStock,
} from './product-rules';

const validDraft: ProductDraft = {
  sku: 'caf-001',
  name: 'Café molido 500 g',
  description: 'Tueste medio',
  price: 12.5,
  stock: 40,
  category: 'bebidas',
  isActive: true,
};

describe('validateSku', () => {
  it('exige al menos 3 caracteres después del trim', () => {
    expect(validateSku(' ab ')).toBe('El SKU debe tener al menos 3 caracteres');
  });

  it('rechaza caracteres fuera de letras, números y guiones', () => {
    expect(validateSku('CAF 001')).toBe('El SKU solo admite letras, números y guiones');
    expect(validateSku('CAF_001')).toBe('El SKU solo admite letras, números y guiones');
  });

  it('acepta un SKU en minúsculas: se normaliza a mayúsculas', () => {
    expect(validateSku(' caf-001 ')).toBeNull();
    expect(normalizeSku(' caf-001 ')).toBe('CAF-001');
  });

  it('rechaza más de 32 caracteres', () => {
    expect(validateSku('A'.repeat(33))).toBe('El SKU no puede superar los 32 caracteres');
  });
});

describe('validatePrice', () => {
  it('rechaza negativos', () => {
    expect(validatePrice(-0.01)).toBe('El precio no puede ser negativo');
  });

  it('acepta cero y hasta dos decimales', () => {
    expect(validatePrice(0)).toBeNull();
    expect(validatePrice(10.01)).toBeNull();
    expect(validatePrice(12.5)).toBeNull();
  });

  it('rechaza más de dos decimales', () => {
    expect(validatePrice(10.015)).toBe('El precio admite como máximo dos decimales');
  });

  it('trata un valor no numérico como obligatorio', () => {
    expect(validatePrice(Number.NaN)).toBe('El precio es obligatorio');
  });
});

describe('validateStock', () => {
  it('exige un entero', () => {
    expect(validateStock(1.5)).toBe('El stock debe ser un entero');
  });

  it('rechaza negativos y acepta cero', () => {
    expect(validateStock(-1)).toBe('El stock no puede ser negativo');
    expect(validateStock(0)).toBeNull();
  });
});

describe('validateDraft', () => {
  it('no devuelve errores para un borrador válido', () => {
    expect(validateDraft(validDraft)).toEqual({});
    expect(hasDraftErrors(validateDraft(validDraft))).toBe(false);
  });

  it('acumula un error por cada campo inválido', () => {
    const errors = validateDraft({
      ...validDraft,
      sku: '!',
      name: 'a',
      price: -1,
      stock: 2.5,
      description: 'x'.repeat(2001),
      category: 'c'.repeat(61),
    });

    expect(Object.keys(errors).sort()).toEqual([
      'category',
      'description',
      'name',
      'price',
      'sku',
      'stock',
    ]);
  });
});

describe('normalizeDraft', () => {
  it('recorta textos, sube el SKU y convierte vacíos en null', () => {
    expect(
      normalizeDraft({
        sku: ' caf-001 ',
        name: '  Café molido  ',
        description: '   ',
        price: 12.5,
        stock: 40,
        category: '',
        isActive: false,
      }),
    ).toEqual({
      sku: 'CAF-001',
      name: 'Café molido',
      description: null,
      price: 12.5,
      stock: 40,
      category: null,
      isActive: false,
    });
  });

  it('trata undefined como ausencia de valor', () => {
    expect(normalizeOptionalText(undefined)).toBeNull();
    expect(normalizeOptionalText(null)).toBeNull();
  });
});
