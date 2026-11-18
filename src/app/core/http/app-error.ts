/**
 * Error de aplicación: el único error que llega a la UI.
 *
 * Traduce el sobre de error del backend (`statusCode`, `code`, `message`,
 * `details`, `timestamp`, `path`) y los fallos de red a un mensaje amigable.
 * El mensaje técnico crudo nunca se propaga: el backend puede cambiar sus
 * textos y el usuario no debe leerlos.
 */

export type AppErrorKind =
  | 'offline'
  | 'unauthorized'
  | 'forbidden'
  | 'not-found'
  | 'conflict'
  | 'validation'
  | 'rate-limited'
  | 'server'
  | 'unknown';

export interface FieldError {
  readonly field: string;
  readonly message: string;
}

export interface AppError {
  readonly kind: AppErrorKind;
  readonly status: number;
  readonly message: string;
  readonly fieldErrors: readonly FieldError[];
}

/** Mensajes exactos de docs/ARCHITECTURE.md §7 más los casos que la API añade. */
export const APP_ERROR_MESSAGES = {
  offline: 'No hay conexión. Revisa tu internet e intenta de nuevo.',
  unauthorized: 'Tu sesión expiró. Inicia sesión de nuevo.',
  forbidden: 'No tienes permiso para realizar esta acción.',
  notFound: 'El producto ya no existe.',
  conflict: 'Ya existe un producto con esos datos.',
  validation: 'Revisa los datos marcados en el formulario.',
  rateLimited: 'Demasiadas peticiones. Espera un momento e intenta de nuevo.',
  server: 'Algo salió mal de nuestro lado. Intenta más tarde.',
  unknown: 'No pudimos completar la operación. Intenta de nuevo.',
} as const;

const KIND_BY_STATUS: Readonly<Record<number, AppErrorKind>> = {
  0: 'offline',
  400: 'validation',
  401: 'unauthorized',
  403: 'forbidden',
  404: 'not-found',
  409: 'conflict',
  422: 'validation',
  429: 'rate-limited',
};

export const VALIDATION_ERROR_CODE = 'VALIDATION_ERROR';

interface ValidationDetailLike {
  readonly path?: unknown;
  readonly message?: unknown;
}

function kindFor(status: number): AppErrorKind {
  const known = KIND_BY_STATUS[status];
  if (known) {
    return known;
  }
  return status >= 500 ? 'server' : 'unknown';
}

/**
 * `details` de un `VALIDATION_ERROR` es `[{ path, code, message }]`. Se ignoran
 * las entradas malformadas en lugar de romper el render del formulario.
 */
function fieldErrorsFrom(details: unknown): readonly FieldError[] {
  if (!Array.isArray(details)) {
    return [];
  }

  return details.flatMap((detail: ValidationDetailLike): readonly FieldError[] => {
    const field = typeof detail?.path === 'string' ? detail.path : '';
    const message = typeof detail?.message === 'string' ? detail.message : '';
    return field.length > 0 && message.length > 0 ? [{ field, message }] : [];
  });
}

/** Único constructor de `AppError`: la UI nunca arma uno a mano. */
export function toAppError(status: number, body?: unknown): AppError {
  const kind = kindFor(status);
  const payload = typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : {};
  const isValidation =
    kind === 'validation' && payload['code'] === VALIDATION_ERROR_CODE;

  return {
    kind,
    status,
    message: APP_ERROR_MESSAGES[messageKeyFor(kind)],
    fieldErrors: isValidation ? fieldErrorsFrom(payload['details']) : [],
  };
}

function messageKeyFor(kind: AppErrorKind): keyof typeof APP_ERROR_MESSAGES {
  switch (kind) {
    case 'not-found':
      return 'notFound';
    case 'rate-limited':
      return 'rateLimited';
    default:
      return kind;
  }
}

/** Fallos que no vienen de HTTP (un `throw` inesperado en un adaptador). */
export function unknownAppError(): AppError {
  return { kind: 'unknown', status: -1, message: APP_ERROR_MESSAGES.unknown, fieldErrors: [] };
}

export function isAppError(value: unknown): value is AppError {
  return (
    typeof value === 'object' &&
    value !== null &&
    'kind' in value &&
    'message' in value &&
    'fieldErrors' in value
  );
}

/**
 * Normaliza cualquier `catch` a `AppError`. El interceptor ya entrega AppError;
 * esto cubre lo que se lance fuera de una petición HTTP.
 */
export function asAppError(value: unknown): AppError {
  return isAppError(value) ? value : unknownAppError();
}
