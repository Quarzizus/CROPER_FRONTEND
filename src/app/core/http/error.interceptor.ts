import { HttpErrorResponse, type HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { isAppError, toAppError, unknownAppError } from './app-error';

/**
 * Convierte cualquier fallo HTTP en `AppError` antes de que llegue al store.
 * Un `status === 0` es una caída de red, no un error del servidor.
 */
export const errorInterceptor: HttpInterceptorFn = (request, next) =>
  next(request).pipe(
    catchError((error: unknown) => {
      if (isAppError(error)) {
        return throwError(() => error);
      }

      if (error instanceof HttpErrorResponse) {
        return throwError(() => toAppError(error.status, error.error));
      }

      return throwError(() => unknownAppError());
    }),
  );
