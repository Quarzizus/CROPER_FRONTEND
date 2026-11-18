import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideChevronLeft,
  lucideChevronRight,
  lucideChevronsLeft,
  lucideChevronsRight,
} from '@ng-icons/lucide';
import { ButtonDirective } from '../button/button.directive';

/** Ventana de páginas visibles: máximo `size` botones centrados en la actual. */
export function pageWindow(page: number, totalPages: number, size = 5): readonly number[] {
  if (totalPages < 1) {
    return [];
  }

  const end = Math.min(totalPages, Math.max(page + Math.floor(size / 2), size));
  const start = Math.max(1, end - size + 1);

  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

/**
 * Paginación compartida. Desktop: primera/anterior, páginas, siguiente/última.
 * Móvil: anterior/siguiente con indicador compacto.
 */
@Component({
  selector: 'app-pagination',
  imports: [NgIcon, ButtonDirective],
  viewProviders: [
    provideIcons({ lucideChevronLeft, lucideChevronRight, lucideChevronsLeft, lucideChevronsRight }),
  ],
  template: `
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p class="text-muted-foreground text-sm" data-testid="pagination-summary">
        @if (total() === 0) {
          Sin resultados
        } @else {
          {{ rangeStart() }}–{{ rangeEnd() }} de {{ total() }}
          @if (totalPages() > 1) {
            <span class="hidden sm:inline">· página {{ page() }} de {{ totalPages() }}</span>
          }
        }
      </p>

      <div class="flex items-center justify-between gap-2 sm:justify-end">
        <label class="text-muted-foreground hidden items-center gap-2 text-sm sm:flex">
          Filas
          <select
            class="border-input bg-card focus-visible:ring-ring h-8 rounded-md border px-2 text-sm outline-none focus-visible:ring-2"
            [value]="pageSize()"
            [disabled]="busy()"
            (change)="onPageSize($event)"
          >
            @for (option of pageSizeOptions(); track option) {
              <option [value]="option">{{ option }}</option>
            }
          </select>
        </label>

        <div class="flex items-center gap-1">
          <button
            appButton
            variant="outline"
            size="icon"
            class="hidden sm:inline-flex"
            type="button"
            aria-label="Primera página"
            [disabled]="busy() || page() <= 1"
            (click)="goTo(1)"
          >
            <ng-icon name="lucideChevronsLeft" />
          </button>
          <button
            appButton
            variant="outline"
            size="icon"
            type="button"
            aria-label="Página anterior"
            [disabled]="busy() || page() <= 1"
            (click)="goTo(page() - 1)"
          >
            <ng-icon name="lucideChevronLeft" />
          </button>

          <div class="hidden items-center gap-1 sm:flex">
            @for (item of pages(); track item) {
              <button
                appButton
                [variant]="item === page() ? 'default' : 'ghost'"
                size="icon"
                type="button"
                [attr.aria-label]="'Página ' + item"
                [attr.aria-current]="item === page() ? 'page' : null"
                [disabled]="busy()"
                (click)="goTo(item)"
              >
                {{ item }}
              </button>
            }
          </div>

          <span class="text-sm font-medium tabular-nums sm:hidden">
            {{ page() }} / {{ totalPages() || 1 }}
          </span>

          <button
            appButton
            variant="outline"
            size="icon"
            type="button"
            aria-label="Página siguiente"
            [disabled]="busy() || page() >= totalPages()"
            (click)="goTo(page() + 1)"
          >
            <ng-icon name="lucideChevronRight" />
          </button>
          <button
            appButton
            variant="outline"
            size="icon"
            class="hidden sm:inline-flex"
            type="button"
            aria-label="Última página"
            [disabled]="busy() || page() >= totalPages()"
            (click)="goTo(totalPages())"
          >
            <ng-icon name="lucideChevronsRight" />
          </button>
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Pagination {
  readonly page = input.required<number>();
  readonly pageSize = input.required<number>();
  readonly total = input.required<number>();
  readonly totalPages = input.required<number>();
  readonly busy = input(false);
  readonly pageSizeOptions = input<readonly number[]>([10, 20, 50]);

  readonly pageChange = output<number>();
  readonly pageSizeChange = output<number>();

  protected readonly pages = computed(() => pageWindow(this.page(), this.totalPages()));
  protected readonly rangeStart = computed(() =>
    this.total() === 0 ? 0 : (this.page() - 1) * this.pageSize() + 1,
  );
  protected readonly rangeEnd = computed(() =>
    Math.min(this.page() * this.pageSize(), this.total()),
  );

  protected goTo(page: number): void {
    const target = Math.min(Math.max(page, 1), Math.max(this.totalPages(), 1));
    if (target !== this.page() && !this.busy()) {
      this.pageChange.emit(target);
    }
  }

  protected onPageSize(event: Event): void {
    const value = Number((event.target as HTMLSelectElement).value);
    if (Number.isInteger(value) && value > 0 && value !== this.pageSize() && !this.busy()) {
      this.pageSizeChange.emit(value);
    }
  }
}
