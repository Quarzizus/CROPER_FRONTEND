import { describe, expect, it } from 'vitest';
import {
  APP_ERROR_MESSAGES,
  toAppError,
  unknownAppError,
  type AppErrorKind,
} from './app-error';

describe('toAppError', () => {
  it('trata el status 0 como caída de red, no como error del servidor', () => {
    const error = toAppError(0);

    expect(error.kind).toBe<AppErrorKind>('offline');
    expect(error.message).toBe(APP_ERROR_MESSAGES.offline);
  });

  it('usa el mensaje del doc para 404', () => {
    const error = toAppError(404, { statusCode: 404, code: 'PRODUCT_NOT_FOUND' });

    expect(error.kind).toBe('not-found');
    expect(error.message).toBe('El producto ya no existe.');
  });

  it('oculta el mensaje del backend en un 409 y responde el mensaje genérico', () => {
    const error = toAppError(409, {
      statusCode: 409,
      code: 'PRODUCT_SKU_ALREADY_EXISTS',
      message: 'Ya existe un producto con el SKU CAF-001',
    });

    expect(error.kind).toBe('conflict');
    expect(error.message).toBe('Ya existe un producto con esos datos.');
    expect(error.message).not.toContain('CAF-001');
  });

  it('colapsa cualquier 5xx en el mismo mensaje amigable', () => {
    for (const status of [500, 502, 503, 504]) {
      const error = toAppError(status, { statusCode: status, code: 'INTERNAL_ERROR' });

      expect(error.kind).toBe('server');
      expect(error.message).toBe('Algo salió mal de nuestro lado. Intenta más tarde.');
    }
  });

  it('separa los errores de campo de un VALIDATION_ERROR por nombre de campo', () => {
    const error = toAppError(400, {
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      message: 'La petición contiene datos inválidos',
      details: [
        { path: 'sku', code: 'too_small', message: 'El SKU debe tener al menos 3 caracteres' },
        { path: 'price', code: 'too_small', message: 'El precio no puede ser negativo' },
      ],
    });

    expect(error.kind).toBe('validation');
    expect(error.fieldErrors).toEqual([
      { field: 'sku', message: 'El SKU debe tener al menos 3 caracteres' },
      { field: 'price', message: 'El precio no puede ser negativo' },
    ]);
  });

  it('no inventa errores de campo cuando el 400 llega sin details utilizables', () => {
    const error = toAppError(400, {
      statusCode: 400,
      code: 'EMPTY_UPDATE',
      message: 'Debe enviar al menos un campo para actualizar',
      details: null,
    });

    expect(error.kind).toBe('validation');
    expect(error.fieldErrors).toEqual([]);
  });

  it('marca 401 y 429 con su propio kind para que la UI decida', () => {
    expect(toAppError(401).kind).toBe('unauthorized');
    expect(toAppError(429).kind).toBe('rate-limited');
  });
});

describe('unknownAppError', () => {
  it('no filtra detalles de un fallo no HTTP', () => {
    expect(unknownAppError()).toEqual({
      kind: 'unknown',
      status: -1,
      message: APP_ERROR_MESSAGES.unknown,
      fieldErrors: [],
    });
  });
});
