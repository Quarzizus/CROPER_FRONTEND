import type { Routes } from '@angular/router';
import { authGuard } from './auth/auth.guard';

/**
 * Rutas raíz. Cada feature se carga por su cuenta: `products` solo se descarga
 * con sesión y `auth` solo sin ella.
 */
export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'products' },
  {
    path: 'login',
    loadChildren: () => import('./auth/auth.routes').then((m) => m.AUTH_ROUTES),
  },
  {
    path: 'products',
    canMatch: [authGuard],
    loadChildren: () => import('./products/products.routes').then((m) => m.PRODUCTS_ROUTES),
  },
  { path: '**', redirectTo: 'products' },
];
