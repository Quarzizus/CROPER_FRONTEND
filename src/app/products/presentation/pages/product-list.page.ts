import { ChangeDetectionStrategy, Component, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucidePlus } from '@ng-icons/lucide';
import { asAppError } from '../../../core/http/app-error';
import { Notifier } from '../../../core/notifications/notifier';
import { ButtonDirective } from '../../../shared/ui/button/button.directive';
import { ProductsStore } from '../../application/products.store';
import { DEFAULT_PAGE, normalizePage, normalizePageSize } from '../../domain/page';
import type { Product } from '../../domain/product';
import {
  NO_PRODUCT_FILTERS,
  compactParams,
  filtersFromQuery,
  filtersToQueryParams,
  type ProductFilters,
} from '../../domain/product-filters';
import { ConfirmDeleteDialog } from '../components/confirm-delete-dialog';
import { ProductFiltersBar } from '../components/product-filters';
import { ProductsTable } from '../components/products-table';

/**
 * Página smart del catálogo: traduce la URL al store, los eventos del usuario a
 * métodos del store y dirige la navegación. No hace HTTP.
 */
@Component({
  selector: 'app-product-list-page',
  imports: [NgIcon, ButtonDirective, ProductsTable, ProductFiltersBar],
  viewProviders: [provideIcons({ lucidePlus })],
  template: `
    <div class="space-y-6">
      <header class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 class="text-2xl font-semibold tracking-tight">Productos</h1>
          <p class="text-muted-foreground mt-1 text-sm">
            @if (store.total() > 0) {
              {{ store.total() }}
              @if (store.hasFilters()) {
                {{ store.total() === 1 ? 'resultado' : 'resultados' }}
              } @else {
                {{ store.total() === 1 ? 'producto' : 'productos' }} en el catálogo
              }
            } @else {
              Alta, edición y baja de productos
            }
          </p>
        </div>

        <button appButton type="button" (click)="create()">
          <ng-icon name="lucidePlus" />
          Nuevo producto
        </button>
      </header>

      <app-product-filters
        [filters]="store.filters()"
        (filtersChange)="onFiltersChange($event)"
      />

      <app-products-table
        [items]="store.items()"
        [page]="store.page()"
        [pageSize]="store.pageSize()"
        [total]="store.total()"
        [totalPages]="store.totalPages()"
        [status]="store.status()"
        [error]="store.error()"
        [hasFilters]="store.hasFilters()"
        (pageChange)="onPageChange($event)"
        (pageSizeChange)="onPageSizeChange($event)"
        (edit)="edit($event)"
        (remove)="remove($event)"
        (retry)="store.retry()"
        (createRequested)="create()"
        (clearFilters)="onClearFilters()"
      />
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductListPage {
  protected readonly store = inject(ProductsStore);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly notifier = inject(Notifier);
  private readonly confirmDelete = inject(ConfirmDeleteDialog);

  private readonly queryParams = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });

  constructor() {
    // Única dirección: URL -> store. Así el estado es compartible y sobrevive al
    // refresh. La paginación y los filtros nunca escriben el store antes que la
    // URL, que es lo que provocaba carreras entre el eco del router y la carga.
    effect(() => {
      const params = this.queryParams();
      this.store.applyQuery(
        normalizePage(params.get('page')),
        normalizePageSize(params.get('size')),
        filtersFromQuery(params),
      );
    });
  }

  protected onPageChange(page: number): void {
    this.navigate(page, this.store.pageSize());
  }

  protected onPageSizeChange(size: number): void {
    this.navigate(DEFAULT_PAGE, size);
  }

  /** Un filtro nuevo invalida la página actual: el listado vuelve a la 1. */
  protected onFiltersChange(filters: ProductFilters): void {
    this.navigate(DEFAULT_PAGE, this.store.pageSize(), filters);
  }

  protected onClearFilters(): void {
    this.navigate(DEFAULT_PAGE, this.store.pageSize(), NO_PRODUCT_FILTERS);
  }

  protected create(): void {
    void this.router.navigate(['/products', 'new'], { queryParams: this.currentQuery() });
  }

  protected edit(product: Product): void {
    void this.router.navigate(['/products', product.id, 'edit'], {
      queryParams: this.currentQuery(),
    });
  }

  protected async remove(product: Product): Promise<void> {
    const confirmed = await this.confirmDelete.confirmDelete(product.name);
    if (!confirmed) {
      return;
    }

    const pageBefore = this.store.page();

    try {
      await this.store.remove(product.id);
      this.notifier.success(`"${product.name}" se eliminó del catálogo.`);

      // El store retrocede de página si la actual quedó vacía; la URL lo sigue.
      if (this.store.page() !== pageBefore) {
        this.navigate(this.store.page(), this.store.pageSize());
      }
    } catch (error) {
      this.notifier.error(asAppError(error).message);
    }
  }

  private navigate(page: number, size: number, filters: ProductFilters = this.store.filters()): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      // `null` borra la clave: un filtro retirado no debe quedarse en la URL.
      queryParams: { page, size, ...filtersToQueryParams(filters) },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  private currentQuery(): Record<string, string> {
    return {
      page: String(this.store.page()),
      size: String(this.store.pageSize()),
      ...compactParams(filtersToQueryParams(this.store.filters())),
    };
  }
}
