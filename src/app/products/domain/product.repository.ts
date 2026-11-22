import type { Page } from './page';
import type { Product } from './product';
import type { ProductDraft } from './product-draft';
import type { ProductListRequest } from './product-filters';

/**
 * Puerto del dominio. `application` depende de esta clase abstracta; el
 * adaptador HTTP la implementa y se registra por DI en las rutas de la feature.
 */
export abstract class ProductRepository {
  abstract list(request: ProductListRequest): Promise<Page<Product>>;
  abstract getById(id: string): Promise<Product>;
  abstract create(draft: ProductDraft): Promise<Product>;
  abstract update(id: string, draft: ProductDraft): Promise<Product>;
  abstract remove(id: string): Promise<void>;
}
