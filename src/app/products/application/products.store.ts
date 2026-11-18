import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { from, switchMap, catchError, EMPTY } from 'rxjs';
import { asAppError, type AppError } from '../../core/http/app-error';
import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  normalizePage,
  normalizePageSize,
  totalPagesFor,
  type PageRequest,
} from '../domain/page';
import type { Product } from '../domain/product';
import type { ProductDraft } from '../domain/product-draft';
import { ProductRepository } from '../domain/product.repository';

export type ProductsStatus = 'idle' | 'loading' | 'saving' | 'error';

interface ProductsState {
  items: Product[];
  page: number;
  pageSize: number;
  total: number;
  status: ProductsStatus;
  error: AppError | null;
  /** Al menos un intento de carga completado o en curso. */
  loaded: boolean;
  selected: Product | null;
  selectedStatus: 'idle' | 'loading' | 'error';
  selectedError: AppError | null;
}

const initialState: ProductsState = {
  items: [],
  page: DEFAULT_PAGE,
  pageSize: DEFAULT_PAGE_SIZE,
  total: 0,
  status: 'idle',
  error: null,
  loaded: false,
  selected: null,
  selectedStatus: 'idle',
  selectedError: null,
};

/**
 * Estado de la feature `products`. No conoce el router: la página traduce la URL
 * a `applyQuery`. Tampoco conoce HTTP: habla con el puerto `ProductRepository`.
 */
export const ProductsStore = signalStore(
  withState(initialState),
  withComputed(({ items, pageSize, total, status, error, selected, selectedStatus }) => ({
    totalPages: computed(() => totalPagesFor(total(), pageSize())),
    isLoading: computed(() => status() === 'loading'),
    isSaving: computed(() => status() === 'saving'),
    hasError: computed(() => status() === 'error' && error() !== null),
    isEmpty: computed(() => status() === 'idle' && items().length === 0),
    selectedLoading: computed(() => selectedStatus() === 'loading'),
    selectedFailed: computed(() => selectedStatus() === 'error'),
    selectedProduct: computed(() => selected()),
  })),
  withMethods((store, repository = inject(ProductRepository)) => {
    /**
     * Recarga la página pedida. Si la página ya no existe (último producto
     * borrado, URL obsoleta), salta a la última página real.
     */
    async function fetchPage(request: PageRequest, allowBacktrack = true): Promise<void> {
      patchState(store, { status: 'loading', error: null, loaded: true });

      try {
        const page = await repository.list(request);
        patchState(store, {
          items: [...page.items],
          page: page.page,
          pageSize: page.size,
          total: page.total,
          status: 'idle',
          error: null,
        });

        const lastPage = totalPagesFor(page.total, page.size);
        if (allowBacktrack && page.page > lastPage) {
          patchState(store, { page: lastPage });
          await fetchPage({ page: lastPage, size: page.size }, false);
        }
      } catch (error) {
        patchState(store, {
          items: [],
          total: 0,
          status: 'error',
          error: asAppError(error),
        });
        throw asAppError(error);
      }
    }

    /** Igual que `fetchPage` pero sin propagar: el estado ya refleja el fallo. */
    async function refresh(): Promise<void> {
      try {
        await fetchPage({ page: store.page(), size: store.pageSize() });
      } catch {
        // El error vive en `state.error` y la tabla ofrece Reintentar.
      }
    }

    function currentRequest(): PageRequest {
      return { page: store.page(), size: store.pageSize() };
    }

    const loadPage = rxMethod<PageRequest>((requests) =>
      requests.pipe(
        // El fallo ya quedó en el estado: no debe romper el flujo del rxMethod.
        switchMap((request) => from(fetchPage(request)).pipe(catchError(() => EMPTY))),
      ),
    );

    const loadProduct = rxMethod<string>((ids) =>
      ids.pipe(
        switchMap((id) =>
          from(
            (async (): Promise<void> => {
              patchState(store, { selectedStatus: 'loading', selectedError: null });
              try {
                patchState(store, {
                  selected: await repository.getById(id),
                  selectedStatus: 'idle',
                });
              } catch (error) {
                patchState(store, {
                  selected: null,
                  selectedStatus: 'error',
                  selectedError: asAppError(error),
                });
              }
            })(),
          ),
        ),
      ),
    );

    return {
      /** Carga la página y el tamaño que ya están en el estado. */
      load(): void {
        loadPage(currentRequest());
      },

      /**
       * La URL manda: si cambió, se aplica. Si coincide con el estado pero
       * todavía no hubo carga (por ejemplo al abrir un enlace `?page=1&size=10`),
       * también se carga: si no, un enlace compartido se quedaría en blanco.
       */
      applyQuery(page: number, size: number): void {
        const nextPage = normalizePage(page);
        const nextSize = normalizePageSize(size);
        const unchanged = nextPage === store.page() && nextSize === store.pageSize();

        if (unchanged && store.loaded()) {
          return;
        }

        patchState(store, { page: nextPage, pageSize: nextSize });
        loadPage(currentRequest());
      },

      goToPage(page: number): void {
        const next = normalizePage(page, store.totalPages());
        if (next === store.page()) {
          return;
        }

        patchState(store, { page: next });
        loadPage(currentRequest());
      },

      /** Cambiar el tamaño de página invalida la página actual: se vuelve a la 1. */
      setPageSize(size: number): void {
        const next = normalizePageSize(size);
        if (next === store.pageSize()) {
          return;
        }

        patchState(store, { page: DEFAULT_PAGE, pageSize: next });
        loadPage(currentRequest());
      },

      async create(draft: ProductDraft): Promise<void> {
        patchState(store, { status: 'saving', error: null });
        try {
          await repository.create(draft);
        } catch (error) {
          patchState(store, { status: 'idle', error: asAppError(error) });
          throw asAppError(error);
        }
        await refresh();
      },

      async update(id: string, draft: ProductDraft): Promise<void> {
        patchState(store, { status: 'saving', error: null });
        try {
          await repository.update(id, draft);
        } catch (error) {
          patchState(store, { status: 'idle', error: asAppError(error) });
          throw asAppError(error);
        }
        await refresh();
      },

      async remove(id: string): Promise<void> {
        patchState(store, { status: 'saving', error: null });
        try {
          await repository.remove(id);
        } catch (error) {
          patchState(store, { status: 'idle', error: asAppError(error) });
          throw asAppError(error);
        }
        await refresh();
      },

      loadOne(id: string): void {
        loadProduct(id);
      },

      clearSelected(): void {
        patchState(store, {
          selected: null,
          selectedStatus: 'idle',
          selectedError: null,
        });
      },

      retry(): void {
        loadPage(currentRequest());
      },
    };
  }),
);
