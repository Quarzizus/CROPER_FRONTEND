import { inject } from '@angular/core';
import { Router, type CanMatchFn } from '@angular/router';
import { SessionStore } from './application/session.store';

/** Rutas de la app: exige sesión. La feature se carga después, no antes. */
export const authGuard: CanMatchFn = () => {
  if (inject(SessionStore).isAuthenticated()) {
    return true;
  }

  return inject(Router).createUrlTree(['/login']);
};

/** Rutas de autenticación: con sesión activa no hay nada que hacer aquí. */
export const guestGuard: CanMatchFn = () => {
  if (!inject(SessionStore).isAuthenticated()) {
    return true;
  }

  return inject(Router).createUrlTree(['/products']);
};
