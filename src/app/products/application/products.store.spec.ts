import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { toAppError } from '../../core/http/app-error';
import type { Page, PageRequest } from '../domain/page';
import type { Product } from '../domain/product';
import type { ProductDraft } from '../domain/product-draft';
import { ProductRepository } from '../domain/product.repository';
import { ProductsStore } from './products.store';

const draft: ProductDraft = {
  sku: 'CAF-001',
  name: 'Café molido 500 g',
  description: null,
  price: 12.5,
  stock: 40,
  category: null,
  isActive: true,
};

function product(id: string): Product {
  return {
    id,
    sku: `SKU-${id}`,
    name: `Producto ${id}`,
    description: null,
    price: 10,
    stock: 1,
    category: null,
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

function pageOf(items: Product[], meta: { page: number; size: number; total: number }): Page<Product> {
  return { items, ...meta, totalPages: Math.max(1, Math.ceil(meta.total / meta.size)) };
}

class FakeProductRepository implements ProductRepository {
  readonly listCalls: PageRequest[] = [];
  readonly createCalls: ProductDraft[] = [];
  readonly updateCalls: { id: string; draft: ProductDraft }[] = [];
  readonly removeCalls: string[] = [];
  readonly getByIdCalls: string[] = [];

  // La API echoa `page` y `limit` de la petición; el fake hace lo mismo.
  listHandler: (request: PageRequest) => Promise<Page<Product>> = async (request) =>
    pageOf([], { page: request.page, size: request.size, total: 0 });
  createHandler: (value: ProductDraft) => Promise<Product> = async () => product('created');
  updateHandler: (id: string, value: ProductDraft) => Promise<Product> = async () => product('updated');
  removeHandler: (id: string) => Promise<void> = async () => undefined;
  getByIdHandler: (id: string) => Promise<Product> = async () => product('one');

  list(request: PageRequest): Promise<Page<Product>> {
    this.listCalls.push(request);
    return this.listHandler(request);
  }

  create(value: ProductDraft): Promise<Product> {
    this.createCalls.push(value);
    return this.createHandler(value);
  }

  update(id: string, value: ProductDraft): Promise<Product> {
    this.updateCalls.push({ id, draft: value });
    return this.updateHandler(id, value);
  }

  remove(id: string): Promise<void> {
    this.removeCalls.push(id);
    return this.removeHandler(id);
  }

  getById(id: string): Promise<Product> {
    this.getByIdCalls.push(id);
    return this.getByIdHandler(id);
  }
}

function setup(): { store: InstanceType<typeof ProductsStore>; repository: FakeProductRepository } {
  const repository = new FakeProductRepository();

  TestBed.configureTestingModule({
    providers: [ProductsStore, { provide: ProductRepository, useValue: repository }],
  });

  return { store: TestBed.inject(ProductsStore), repository };
}

describe('ProductsStore', () => {
  let store: InstanceType<typeof ProductsStore>;
  let repository: FakeProductRepository;

  beforeEach(() => {
    ({ store, repository } = setup());
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('carga la página actual y publica items, total y totalPages', async () => {
    repository.listHandler = async (request) =>
      pageOf([product('a'), product('b')], { page: request.page, size: request.size, total: 2 });

    store.load();

    await vi.waitFor(() => expect(store.items()).toHaveLength(2));
    expect(repository.listCalls).toEqual([{ page: 1, size: 10 }]);
    expect(store.total()).toBe(2);
    expect(store.totalPages()).toBe(1);
    expect(store.isLoading()).toBe(false);
    expect(store.hasError()).toBe(false);
  });

  it('carga al abrir un enlace cuyos params coinciden con los valores por defecto', async () => {
    repository.listHandler = async (request) =>
      pageOf([product('a')], { page: request.page, size: request.size, total: 1 });

    // Regresión: `?page=1&size=10` es justo el estado inicial del store.
    store.applyQuery(1, 10);

    await vi.waitFor(() => expect(repository.listCalls).toHaveLength(1));
    expect(repository.listCalls[0]).toEqual({ page: 1, size: 10 });
    expect(store.items()).toHaveLength(1);
  });

  it('reacciona a los query params sin duplicar la carga si no cambiaron', async () => {
    repository.listHandler = async (request) =>
      pageOf([product('a')], { page: request.page, size: request.size, total: 21 });

    store.applyQuery(2, 10);

    await vi.waitFor(() => expect(repository.listCalls).toHaveLength(1));
    expect(repository.listCalls[0]).toEqual({ page: 2, size: 10 });

    store.applyQuery(2, 10);
    expect(repository.listCalls).toHaveLength(1);
  });

  it('normaliza query params inválidos en lugar de pedir basura a la API', async () => {
    store.applyQuery(1, 20);
    await vi.waitFor(() => expect(store.pageSize()).toBe(20));

    store.applyQuery(0, 999);

    await vi.waitFor(() => expect(repository.listCalls.at(-1)).toEqual({ page: 1, size: 10 }));
  });

  it('ignora un tamaño que el selector no ofrece y vuelve a 10', async () => {
    // Regresión: `?size=37` era aceptado por la API pero el select no tenía esa
    // opción, así que mostraba 10 mientras se pedían 37 filas.
    store.applyQuery(1, 37);

    await vi.waitFor(() => expect(repository.listCalls).toHaveLength(1));
    expect(repository.listCalls[0]).toEqual({ page: 1, size: 10 });
    expect(store.pageSize()).toBe(10);
  });

  it('limita goToPage a la última página disponible', async () => {
    repository.listHandler = async (request) =>
      pageOf([product('a')], { page: request.page, size: request.size, total: 15 });

    store.load();
    await vi.waitFor(() => expect(store.totalPages()).toBe(2));

    store.goToPage(9);

    await vi.waitFor(() => expect(repository.listCalls.at(-1)).toEqual({ page: 2, size: 10 }));
  });

  it('cambiar el tamaño de página vuelve a la primera', async () => {
    store.applyQuery(3, 10);
    await vi.waitFor(() => expect(repository.listCalls).toHaveLength(1));

    store.setPageSize(20);

    await vi.waitFor(() => expect(repository.listCalls.at(-1)).toEqual({ page: 1, size: 20 }));
    expect(store.page()).toBe(1);
    expect(store.pageSize()).toBe(20);
  });

  it('tras crear recarga la página actual, no la primera', async () => {
    repository.listHandler = async (request) =>
      pageOf([product('a')], { page: request.page, size: request.size, total: 21 });

    store.applyQuery(2, 10);
    await vi.waitFor(() => expect(repository.listCalls).toHaveLength(1));

    await store.create(draft);

    expect(repository.createCalls).toEqual([draft]);
    expect(repository.listCalls.at(-1)).toEqual({ page: 2, size: 10 });
    expect(repository.listCalls).toHaveLength(2);
  });

  it('tras editar recarga la página actual', async () => {
    repository.listHandler = async (request) =>
      pageOf([product('a')], { page: request.page, size: request.size, total: 21 });

    store.applyQuery(2, 10);
    await vi.waitFor(() => expect(repository.listCalls).toHaveLength(1));

    await store.update('abc', draft);

    expect(repository.updateCalls).toEqual([{ id: 'abc', draft }]);
    expect(repository.listCalls.at(-1)).toEqual({ page: 2, size: 10 });
  });

  it('al borrar el último producto de la página retrocede una página', async () => {
    let deleted = false;
    repository.listHandler = async (request) => {
      if (request.page === 3) {
        return deleted
          ? pageOf([], { page: 3, size: 10, total: 20 })
          : pageOf([product('last')], { page: 3, size: 10, total: 21 });
      }
      return pageOf([product('prev')], { page: 2, size: 10, total: 20 });
    };

    store.applyQuery(3, 10);
    await vi.waitFor(() => expect(store.items()).toHaveLength(1));

    deleted = true;
    await store.remove('last');

    expect(repository.removeCalls).toEqual(['last']);
    expect(store.page()).toBe(2);
    expect(repository.listCalls.at(-1)).toEqual({ page: 2, size: 10 });
    expect(store.items()).toHaveLength(1);
  });

  it('al borrar en una página intermedia se queda en la misma página', async () => {
    repository.listHandler = async (request) =>
      pageOf([product('a'), product('b')], { page: request.page, size: request.size, total: 15 });

    store.applyQuery(2, 10);
    await vi.waitFor(() => expect(repository.listCalls).toHaveLength(1));

    await store.remove('a');

    expect(store.page()).toBe(2);
    expect(repository.listCalls.at(-1)).toEqual({ page: 2, size: 10 });
  });

  it('un error de carga deja estado de error y mensaje amigable, sin items', async () => {
    repository.listHandler = async () => {
      throw toAppError(0);
    };

    store.load();

    await vi.waitFor(() => expect(store.hasError()).toBe(true));
    expect(store.error()?.message).toBe(
      'No hay conexión. Revisa tu internet e intenta de nuevo.',
    );
    expect(store.items()).toEqual([]);
    expect(store.isLoading()).toBe(false);
  });

  it('un error al guardar rechaza con AppError y devuelve el estado a idle', async () => {
    repository.createHandler = async () => {
      throw toAppError(409, { code: 'PRODUCT_SKU_ALREADY_EXISTS' });
    };

    await expect(store.create(draft)).rejects.toMatchObject({ kind: 'conflict' });
    expect(store.status()).toBe('idle');
    expect(store.error()?.message).toBe('Ya existe un producto con esos datos.');
    expect(repository.listCalls).toEqual([]);
  });

  it('carga un producto para editar y limpia la selección', async () => {
    store.loadOne('abc');

    await vi.waitFor(() => expect(store.selected()?.id).toBe('one'));
    expect(repository.getByIdCalls).toEqual(['abc']);

    store.clearSelected();
    expect(store.selected()).toBeNull();
  });

  it('separa el fallo de carga de un producto del listado', async () => {
    repository.getByIdHandler = async () => {
      throw toAppError(404);
    };

    store.loadOne('missing');

    await vi.waitFor(() => expect(store.selectedFailed()).toBe(true));
    expect(store.selectedError()?.message).toBe('El producto ya no existe.');
    expect(store.status()).toBe('idle');
  });

  it('expone isEmpty solo cuando terminó de cargar sin resultados', async () => {
    expect(store.isEmpty()).toBe(true);

    repository.listHandler = async (request) =>
      pageOf([product('a')], { page: request.page, size: request.size, total: 1 });
    store.load();
    await vi.waitFor(() => expect(store.items()).toHaveLength(1));

    expect(store.isEmpty()).toBe(false);
  });
});
