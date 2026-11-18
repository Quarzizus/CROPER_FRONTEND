import type { Routes } from '@angular/router';
import { guestGuard } from './auth.guard';

export const AUTH_ROUTES: Routes = [
  {
    path: '',
    pathMatch: 'full',
    canMatch: [guestGuard],
    title: 'Ingresar · Catálogo',
    loadComponent: () => import('./presentation/pages/login.page').then((m) => m.LoginPage),
  },
];
