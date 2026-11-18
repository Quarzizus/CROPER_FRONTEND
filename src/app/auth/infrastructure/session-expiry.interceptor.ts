import type { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { isAppError } from '../../core/http/app-error';
import { Notifier } from '../../core/notifications/notifier';
import { SessionStore } from '../application/session.store';

/**
 * Un 401 en una ruta protegida significa token ausente, inválido o expirado.
 * Un 401 de `/auth/*` es una credencial rechazada y lo maneja el formulario.
 */
export const sessionExpiryInterceptor: HttpInterceptorFn = (request, next) => {
  const sessions = inject(SessionStore);
  const router = inject(Router);
  const notifier = inject(Notifier);
  const isAuthRequest = request.url.includes('/auth/');

  return next(request).pipe(
    catchError((error: unknown) => {
      if (!isAuthRequest && isAppError(error) && error.status === 401) {
        sessions.logout();
        notifier.error(error.message);
        void router.navigate(['/login']);
      }

      return throwError(() => error);
    }),
  );
};
