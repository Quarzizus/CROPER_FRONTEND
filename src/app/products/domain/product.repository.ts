import type { Page, PageRequest } from './page';
import type { Product } from './product';
import type { ProductDraft } from './product-draft';

/**
 * Puerto del dominio. `application` depende de esta clase abstracta; el
 * adaptador HTTP la implementa y se registra por DI en las rutas de la feature.
 */
export abstract class ProductRepository {
  abstract list(request: PageRequest): Promise<Page<Product>>;
  abstract getById(id: string): Promise<Product>;
  abstract create(draft: ProductDraft): Promise<Product>;
  abstract update(id: string, draft: ProductDraft): Promise<Product>;
  abstract remove(id: string): Promise<void>;
}
