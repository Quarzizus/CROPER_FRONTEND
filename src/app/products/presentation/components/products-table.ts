import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { CdkMenu, CdkMenuItem, CdkMenuTrigger } from '@angular/cdk/menu';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideCircleAlert,
  lucideEllipsisVertical,
  lucideLoaderCircle,
  lucidePackagePlus,
  lucidePencil,
  lucideRotateCcw,
  lucideSearchX,
  lucideTrash2,
  lucideX,
} from '@ng-icons/lucide';
import type { AppError } from '../../../core/http/app-error';
import { Badge } from '../../../shared/ui/badge/badge';
import { ButtonDirective } from '../../../shared/ui/button/button.directive';
import { Pagination } from '../../../shared/ui/pagination/pagination';
import { SkeletonDirective } from '../../../shared/ui/skeleton/skeleton.directive';
import type { ProductsStatus } from '../../application/products.store';
import type { Product } from '../../domain/product';

const priceFormatter = new Intl.NumberFormat('es-ES', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Tabla presentacional: recibe el estado y emite intenciones. No decide qué
 * cargar ni cómo paginar; solo traduce clics en eventos.
 */
@Component({
  selector: 'app-products-table',
  imports: [NgIcon, ButtonDirective, Badge, Pagination, SkeletonDirective, CdkMenu, CdkMenuItem, CdkMenuTrigger],
  viewProviders: [
    provideIcons({
      lucideCircleAlert,
      lucideEllipsisVertical,
      lucideLoaderCircle,
      lucidePackagePlus,
      lucidePencil,
      lucideRotateCcw,
      lucideSearchX,
      lucideTrash2,
      lucideX,
    }),
  ],
  template: `
    @if (isLoading() && items().length === 0) {
      <!-- Solo en la primera carga: no hay contenido previo que conservar. -->
      <div class="space-y-3" aria-busy="true" aria-live="polite">
        <span class="sr-only">Cargando productos…</span>
        @for (row of skeletonRows; track row) {
          <div appSkeleton class="h-[4.75rem] w-full rounded-xl"></div>
        }
      </div>
    } @else if (hasError()) {
      <div
        class="border-destructive/30 bg-destructive/5 flex flex-col items-start gap-4 rounded-xl border p-6 sm:flex-row sm:items-center sm:justify-between"
        role="alert"
      >
        <div class="flex items-start gap-3">
          <ng-icon name="lucideCircleAlert" class="text-destructive mt-0.5 shrink-0" />
          <div>
            <p class="font-medium">No pudimos cargar el catálogo</p>
            <p class="text-muted-foreground mt-1 text-sm">{{ error()?.message }}</p>
          </div>
        </div>
        <button appButton variant="outline" type="button" (click)="retry.emit()">
          <ng-icon name="lucideRotateCcw" />
          Reintentar
        </button>
      </div>
    } @else if (isEmpty()) {
      <div class="flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-16 text-center">
        <span class="bg-muted text-muted-foreground flex size-12 items-center justify-center rounded-full">
          <ng-icon [name]="hasFilters() ? 'lucideSearchX' : 'lucidePackagePlus'" size="1.4rem" />
        </span>
        @if (hasFilters()) {
          <p class="font-medium">Ningún producto coincide con los filtros</p>
          <p class="text-muted-foreground max-w-sm text-sm">
            Prueba con otro nombre, otra categoría o un rango de precio más amplio.
          </p>
          <button appButton variant="outline" type="button" class="mt-2" (click)="clearFilters.emit()">
            <ng-icon name="lucideX" />
            Limpiar filtros
          </button>
        } @else {
          <p class="font-medium">El catálogo está vacío</p>
          <p class="text-muted-foreground max-w-sm text-sm">
            Crea el primer producto para verlo aquí, con su SKU, precio y stock.
          </p>
          <button appButton type="button" class="mt-2" (click)="createRequested.emit()">
            <ng-icon name="lucidePackagePlus" />
            Crear producto
          </button>
        }
      </div>
    } @else {
      <!-- Desktop: tabla completa con cabecera sticky dentro de su area de scroll. -->
      <div
        class="hidden h-[clamp(20rem,62vh,40rem)] overflow-auto rounded-xl border md:block"
        [class.opacity-60]="isLoading()"
        [class.pointer-events-none]="isLoading()"
        [attr.aria-busy]="isLoading()"
      >
        <table class="w-full border-collapse text-sm">
          <caption class="sr-only">
            Productos del catálogo, página {{ page() }} de {{ totalPages() }}
          </caption>
          <thead class="text-muted-foreground text-left text-xs tracking-wide uppercase">
            <tr>
              <th scope="col" class="bg-muted sticky top-0 z-10 px-4 py-3 font-medium">SKU</th>
              <th scope="col" class="bg-muted sticky top-0 z-10 px-4 py-3 font-medium">Producto</th>
              <th scope="col" class="bg-muted sticky top-0 z-10 px-4 py-3 text-right font-medium">
                Precio
              </th>
              <th scope="col" class="bg-muted sticky top-0 z-10 px-4 py-3 text-center font-medium">
                Stock
              </th>
              <th scope="col" class="bg-muted sticky top-0 z-10 px-4 py-3 font-medium">Estado</th>
              <th scope="col" class="bg-muted sticky top-0 z-10 px-4 py-3 text-center font-medium">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody class="divide-border divide-y">
            @for (product of items(); track product.id) {
              <tr class="hover:bg-muted/40 h-[4.5rem] transition-colors">
                <td class="text-primary px-4 py-3 font-mono text-xs font-medium whitespace-nowrap">
                  {{ product.sku }}
                </td>
                <td class="px-4 py-3">
                  <p class="max-w-[22rem] truncate font-medium">{{ product.name }}</p>
                  @if (product.category) {
                    <p class="text-muted-foreground mt-0.5 text-xs">{{ product.category }}</p>
                  }
                </td>
                <td class="px-4 py-3 text-right font-mono tabular-nums">
                  {{ formatPrice(product.price) }}
                </td>
                <td class="px-4 py-3 text-center font-mono tabular-nums">{{ product.stock }}</td>
                <td class="px-4 py-3">
                  @if (product.isActive) {
                    <app-badge variant="success">Disponible</app-badge>
                  } @else {
                    <app-badge variant="outline">Pausado</app-badge>
                  }
                </td>
                <td class="px-4 py-3">
                  <div class="flex justify-center">
                    <button
                      type="button"
                      class="text-muted-foreground hover:bg-accent hover:text-accent-foreground inline-flex size-9 items-center justify-center rounded-md transition-colors disabled:pointer-events-none disabled:opacity-50"
                      [attr.aria-label]="'Acciones de ' + product.name"
                      [cdkMenuTriggerFor]="rowActions"
                      [disabled]="isSaving()"
                    >
                      <ng-icon name="lucideEllipsisVertical" />
                    </button>
                  </div>

                  <ng-template #rowActions>
                    <div
                      cdkMenu
                      class="bg-popover text-popover-foreground min-w-[11rem] rounded-lg border p-1 shadow-lg shadow-black/10"
                    >
                      <button
                        cdkMenuItem
                        type="button"
                        class="hover:bg-accent focus-visible:bg-accent flex w-full cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm outline-none"
                        (cdkMenuItemTriggered)="edit.emit(product)"
                      >
                        <ng-icon name="lucidePencil" class="text-muted-foreground" size="0.95rem" />
                        Editar
                      </button>
                      <button
                        cdkMenuItem
                        type="button"
                        class="text-destructive hover:bg-destructive/10 focus-visible:bg-destructive/10 flex w-full cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm outline-none"
                        (cdkMenuItemTriggered)="remove.emit(product)"
                      >
                        <ng-icon name="lucideTrash2" size="0.95rem" />
                        Eliminar
                      </button>
                    </div>
                  </ng-template>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      <!-- Móvil: cada fila es una tarjeta. -->
      <ul
        class="space-y-3 md:hidden"
        [class.opacity-60]="isLoading()"
        [class.pointer-events-none]="isLoading()"
        [attr.aria-busy]="isLoading()"
      >
        @for (product of items(); track product.id) {
          <li class="bg-card rounded-xl border p-4">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="text-primary font-mono text-xs font-medium">{{ product.sku }}</p>
                <p class="mt-1 truncate font-medium">{{ product.name }}</p>
                @if (product.category) {
                  <p class="text-muted-foreground mt-0.5 text-xs">{{ product.category }}</p>
                }
              </div>
              @if (product.isActive) {
                <app-badge variant="success">Disponible</app-badge>
              } @else {
                <app-badge variant="outline">Pausado</app-badge>
              }
            </div>

            <div class="mt-3 flex items-end justify-between gap-3">
              <dl class="flex items-baseline gap-5">
                <div>
                  <dt class="text-muted-foreground text-[11px] tracking-wide uppercase">Precio</dt>
                  <dd class="font-mono text-sm tabular-nums">{{ formatPrice(product.price) }}</dd>
                </div>
                <div>
                  <dt class="text-muted-foreground text-[11px] tracking-wide uppercase">Stock</dt>
                  <dd class="font-mono text-sm tabular-nums">{{ product.stock }}</dd>
                </div>
              </dl>

              <button
                type="button"
                class="text-muted-foreground hover:bg-accent hover:text-accent-foreground inline-flex size-9 shrink-0 items-center justify-center rounded-md border transition-colors disabled:pointer-events-none disabled:opacity-50"
                [attr.aria-label]="'Acciones de ' + product.name"
                [cdkMenuTriggerFor]="cardActions"
                [disabled]="isSaving()"
              >
                <ng-icon name="lucideEllipsisVertical" />
              </button>

              <ng-template #cardActions>
                <div
                  cdkMenu
                  class="bg-popover text-popover-foreground min-w-[11rem] rounded-lg border p-1 shadow-lg shadow-black/10"
                >
                  <button
                    cdkMenuItem
                    type="button"
                    class="hover:bg-accent focus-visible:bg-accent flex w-full cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm outline-none"
                    (cdkMenuItemTriggered)="edit.emit(product)"
                  >
                    <ng-icon name="lucidePencil" class="text-muted-foreground" size="0.95rem" />
                    Editar
                  </button>
                  <button
                    cdkMenuItem
                    type="button"
                    class="text-destructive hover:bg-destructive/10 focus-visible:bg-destructive/10 flex w-full cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm outline-none"
                    (cdkMenuItemTriggered)="remove.emit(product)"
                  >
                    <ng-icon name="lucideTrash2" size="0.95rem" />
                    Eliminar
                  </button>
                </div>
              </ng-template>
            </div>
          </li>
        }
      </ul>

      <div class="mt-4">
        <app-pagination
          [page]="page()"
          [pageSize]="pageSize()"
          [total]="total()"
          [totalPages]="totalPages()"
          [busy]="isLoading() || isSaving()"
          (pageChange)="pageChange.emit($event)"
          (pageSizeChange)="pageSizeChange.emit($event)"
        />
      </div>
    }
  `,
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductsTable {
  readonly items = input.required<readonly Product[]>();
  readonly page = input.required<number>();
  readonly pageSize = input.required<number>();
  readonly total = input.required<number>();
  readonly totalPages = input.required<number>();
  readonly status = input.required<ProductsStatus>();
  readonly error = input<AppError | null>(null);
  readonly hasFilters = input(false);

  readonly pageChange = output<number>();
  readonly pageSizeChange = output<number>();
  readonly edit = output<Product>();
  readonly remove = output<Product>();
  readonly retry = output<void>();
  readonly createRequested = output<void>();
  readonly clearFilters = output<void>();

  protected readonly skeletonRows = [0, 1, 2, 3, 4] as const;

  protected readonly isLoading = computed(() => this.status() === 'loading');
  protected readonly isSaving = computed(() => this.status() === 'saving');
  protected readonly hasError = computed(() => this.status() === 'error');
  protected readonly isEmpty = computed(
    () => this.status() === 'idle' && this.items().length === 0,
  );

  protected formatPrice(price: number): string {
    return priceFormatter.format(price);
  }
}
