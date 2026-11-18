import type { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { SessionStore } from '../application/session.store';

/** Añade el `Bearer` a cada petición cuando hay sesión activa. */
export const authTokenInterceptor: HttpInterceptorFn = (request, next) => {
  const token = inject(SessionStore).accessToken();

  if (!token) {
    return next(request);
  }

  return next(request.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
};
