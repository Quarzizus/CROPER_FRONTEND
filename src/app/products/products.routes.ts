import type { Routes } from '@angular/router';
import { ProductsStore } from './application/products.store';
import { ProductRepository } from './domain/product.repository';
import { HttpProductRepository } from './infrastructure/product.http-repository';

/**
 * La feature se provee en su propia ruta: el store vive mientras se navega
 * dentro de `products` y se destruye al salir.
 */
export const PRODUCTS_ROUTES: Routes = [
  {
    path: '',
    providers: [ProductsStore, { provide: ProductRepository, useClass: HttpProductRepository }],
    children: [
      {
        path: '',
        pathMatch: 'full',
        title: 'Productos · Catálogo',
        loadComponent: () =>
          import('./presentation/pages/product-list.page').then((m) => m.ProductListPage),
      },
      {
        path: 'new',
        title: 'Nuevo producto · Catálogo',
        loadComponent: () =>
          import('./presentation/pages/product-form.page').then((m) => m.ProductFormPage),
      },
      {
        path: ':id/edit',
        title: 'Editar producto · Catálogo',
        loadComponent: () =>
          import('./presentation/pages/product-form.page').then((m) => m.ProductFormPage),
      },
    ],
  },
];
