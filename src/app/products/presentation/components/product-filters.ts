import { ChangeDetectionStrategy, Component, computed, input, linkedSignal, output } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideSearch, lucideX } from '@ng-icons/lucide';
import { ButtonDirective } from '../../../shared/ui/button/button.directive';
import { InputDirective } from '../../../shared/ui/input/input.directive';
import {
  CATEGORY_MAX_LENGTH,
  NO_PRODUCT_FILTERS,
  PRODUCT_SORTS,
  SEARCH_MAX_LENGTH,
  activeFilterCount,
  filtersEqual,
  isPriceRangeInvalid,
  normalizePriceFilter,
  normalizeSort,
  normalizeTextFilter,
  type ProductFilters,
  type ProductSort,
} from '../../domain/product-filters';

/** Etiquetas de orden, alineadas con el enum del backend y cortas para el select. */
const SORT_LABELS: Readonly<Record<ProductSort, string>> = {
  '-createdAt': 'Más recientes',
  createdAt: 'Más antiguos',
  name: 'Nombre (A–Z)',
  '-name': 'Nombre (Z–A)',
  price: 'Menor precio',
  '-price': 'Mayor precio',
};

/**
 * Barra de filtros: recibe los filtros aplicados y emite los nuevos. No navega
 * ni pide datos; la página decide cómo llevar eso a la URL.
 *
 * Los campos de texto se aplican al enviar el formulario (Enter o «Buscar»), no
 * en cada tecla: así una búsqueda no dispara una petición por carácter y el
 * valor del control nunca compite con el eco de la URL. Los borradores se
 * resincronizan cuando los filtros cambian por fuera (limpiar, atrás/adelante).
 */
@Component({
  selector: 'app-product-filters',
  imports: [NgIcon, ButtonDirective, InputDirective],
  viewProviders: [provideIcons({ lucideSearch, lucideX })],
  template: `
    <form
      class="bg-card rounded-xl border p-4"
      role="search"
      aria-label="Filtros del catálogo"
      (submit)="onSubmit($event)"
    >
      <div
        class="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1.1fr)_minmax(0,0.65fr)_minmax(0,0.65fr)_minmax(0,1.3fr)_auto] lg:items-end"
      >
        <div class="space-y-1.5 sm:col-span-2 lg:col-span-1">
          <label for="filter-search" class="text-muted-foreground text-xs font-medium">
            Buscar por nombre
          </label>
          <div class="relative">
            <ng-icon
              name="lucideSearch"
              class="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2"
              size="1rem"
            />
            <input
              id="filter-search"
              appInput
              type="search"
              class="pl-9"
              autocomplete="off"
              [attr.maxlength]="SEARCH_MAX_LENGTH"
              [placeholder]="'Café, semillas…'"
              [value]="searchDraft()"
              (input)="onSearchInput($event)"
            />
          </div>
        </div>

        <div class="space-y-1.5">
          <label for="filter-category" class="text-muted-foreground text-xs font-medium">
            Categoría
          </label>
          <input
            id="filter-category"
            appInput
            type="text"
            autocomplete="off"
            [attr.maxlength]="CATEGORY_MAX_LENGTH"
            placeholder="Ej. semillas"
            title="Se compara el valor completo, sin distinguir mayúsculas ni acentos"
            [value]="categoryDraft()"
            (input)="onCategoryInput($event)"
          />
        </div>

        <div class="space-y-1.5">
          <label for="filter-min-price" class="text-muted-foreground text-xs font-medium">
            Precio mín.
          </label>
          <input
            id="filter-min-price"
            appInput
            type="number"
            min="0"
            step="0.01"
            inputmode="decimal"
            placeholder="0"
            [attr.aria-invalid]="priceRangeInvalid() ? 'true' : null"
            [value]="minPriceDraft()"
            (input)="onMinPriceInput($event)"
          />
        </div>

        <div class="space-y-1.5">
          <label for="filter-max-price" class="text-muted-foreground text-xs font-medium">
            Precio máx.
          </label>
          <input
            id="filter-max-price"
            appInput
            type="number"
            min="0"
            step="0.01"
            inputmode="decimal"
            placeholder="100"
            [attr.aria-invalid]="priceRangeInvalid() ? 'true' : null"
            [value]="maxPriceDraft()"
            (input)="onMaxPriceInput($event)"
          />
        </div>

        <div class="space-y-1.5">
          <label for="filter-sort" class="text-muted-foreground text-xs font-medium">Orden</label>
          <select
            id="filter-sort"
            class="border-input bg-card focus-visible:ring-ring h-[2.6rem] w-full rounded-md border px-3 text-sm outline-none focus-visible:ring-2"
            (change)="onSortChange($event)"
          >
            @for (option of sortOptions; track option.value) {
              <!-- Se marca la opción, no el select: el binding del select se
                   aplica antes de que existan las opciones. -->
              <option [value]="option.value" [selected]="option.value === filters().sort">
                {{ option.label }}
              </option>
            }
          </select>
        </div>

        <div class="flex items-center gap-2 sm:col-span-2 sm:justify-end lg:col-span-1">
          <button appButton type="submit" class="flex-1 sm:flex-none">
            <ng-icon name="lucideSearch" />
            Buscar
          </button>
          @if (activeCount() > 0) {
            <button appButton variant="ghost" type="button" (click)="clear()">
              <ng-icon name="lucideX" />
              Limpiar
              <span class="text-muted-foreground">({{ activeCount() }})</span>
            </button>
          }
        </div>
      </div>

      @if (priceRangeInvalid()) {
        <p class="text-destructive mt-3 text-sm" role="alert">
          El precio mínimo no puede ser mayor que el máximo.
        </p>
      }
    </form>
  `,
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductFiltersBar {
  readonly filters = input.required<ProductFilters>();

  readonly filtersChange = output<ProductFilters>();

  protected readonly SEARCH_MAX_LENGTH = SEARCH_MAX_LENGTH;
  protected readonly CATEGORY_MAX_LENGTH = CATEGORY_MAX_LENGTH;

  protected readonly sortOptions = PRODUCT_SORTS.map((value) => ({
    value,
    label: SORT_LABELS[value],
  }));

  // `linkedSignal`: el borrador manda mientras se escribe y se resincroniza
  // cuando los filtros cambian desde fuera (limpiar, navegación del historial).
  protected readonly searchDraft = linkedSignal(() => this.filters().search ?? '');
  protected readonly categoryDraft = linkedSignal(() => this.filters().category ?? '');
  protected readonly minPriceDraft = linkedSignal(() => this.textOf(this.filters().minPrice));
  protected readonly maxPriceDraft = linkedSignal(() => this.textOf(this.filters().maxPrice));

  protected readonly activeCount = computed(() => activeFilterCount(this.filters()));

  protected readonly priceRangeInvalid = computed(() =>
    isPriceRangeInvalid(this.draftFilters()),
  );

  protected onSearchInput(event: Event): void {
    this.searchDraft.set(readValue(event));
  }

  protected onCategoryInput(event: Event): void {
    this.categoryDraft.set(readValue(event));
  }

  protected onMinPriceInput(event: Event): void {
    this.minPriceDraft.set(readValue(event));
  }

  protected onMaxPriceInput(event: Event): void {
    this.maxPriceDraft.set(readValue(event));
  }

  protected onSubmit(event: Event): void {
    event.preventDefault();
    this.emit();
  }

  protected onSortChange(event: Event): void {
    this.emit(normalizeSort(readValue(event)));
  }

  protected clear(): void {
    if (filtersEqual(this.filters(), NO_PRODUCT_FILTERS)) {
      return;
    }
    this.filtersChange.emit(NO_PRODUCT_FILTERS);
  }

  private emit(sort: ProductSort = this.filters().sort): void {
    const next = this.draftFilters(sort);
    if (filtersEqual(next, this.filters())) {
      return;
    }
    this.filtersChange.emit(next);
  }

  private draftFilters(sort: ProductSort = this.filters().sort): ProductFilters {
    return {
      search: normalizeTextFilter(this.searchDraft(), SEARCH_MAX_LENGTH),
      category: normalizeTextFilter(this.categoryDraft(), CATEGORY_MAX_LENGTH),
      minPrice: normalizePriceFilter(this.minPriceDraft()),
      maxPrice: normalizePriceFilter(this.maxPriceDraft()),
      sort,
    };
  }

  private textOf(value: number | null): string {
    return value === null ? '' : String(value);
  }
}

function readValue(event: Event): string {
  return (event.target as HTMLInputElement | HTMLSelectElement).value;
}
