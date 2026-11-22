import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { NO_PRODUCT_FILTERS, type ProductFilters } from '../../domain/product-filters';
import { ProductFiltersBar } from './product-filters';

/**
 * La barra tiene lógica propia (borradores, normalización y qué se emite), así
 * que se prueba por el DOM: lo que la persona escribe y lo que el componente
 * publica. No se comprueban clases ni estructura.
 */
describe('ProductFiltersBar', () => {
  let fixture: ComponentFixture<ProductFiltersBar>;
  let emitted: ProductFilters[];

  function setup(filters: ProductFilters = NO_PRODUCT_FILTERS): void {
    TestBed.configureTestingModule({ imports: [ProductFiltersBar] });
    fixture = TestBed.createComponent(ProductFiltersBar);
    fixture.componentRef.setInput('filters', filters);
    fixture.detectChanges();

    emitted = [];
    fixture.componentInstance.filtersChange.subscribe((value) => emitted.push(value));
  }

  function control(selector: string): HTMLInputElement {
    return fixture.nativeElement.querySelector(selector) as HTMLInputElement;
  }

  function type(selector: string, value: string): void {
    const input = control(selector);
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  function submit(): void {
    (fixture.nativeElement.querySelector('form') as HTMLFormElement).dispatchEvent(
      new Event('submit'),
    );
    fixture.detectChanges();
  }

  function sortSelect(): HTMLSelectElement {
    return fixture.nativeElement.querySelector('#filter-sort') as HTMLSelectElement;
  }

  beforeEach(() => {
    TestBed.resetTestingModule();
  });

  it('no emite nada si se envía sin cambios', () => {
    setup();

    submit();

    expect(emitted).toEqual([]);
  });

  it('emite los textos normalizados al enviar el formulario', () => {
    setup();

    type('#filter-search', '  cafe  ');
    type('#filter-category', ' bebidas ');
    type('#filter-min-price', '10');
    type('#filter-max-price', '20.567');
    submit();

    expect(emitted.at(-1)).toEqual({
      search: 'cafe',
      category: 'bebidas',
      minPrice: 10,
      maxPrice: 20.57,
      sort: '-createdAt',
    });
  });

  it('descarta un precio vacío o inválido en lugar de enviar basura', () => {
    setup();

    type('#filter-min-price', '');
    type('#filter-max-price', 'abc');
    submit();

    expect(emitted).toEqual([]);
  });

  it('cambiar el orden emite al instante y conserva los textos pendientes', () => {
    setup();

    type('#filter-search', 'cafe');
    const select = sortSelect();
    select.value = '-price';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(emitted.at(-1)).toMatchObject({ search: 'cafe', sort: '-price' });
  });

  it('limpiar publica los filtros vacíos', () => {
    setup({ ...NO_PRODUCT_FILTERS, search: 'cafe', sort: 'price' });

    (fixture.nativeElement.querySelector('button[type="button"]') as HTMLButtonElement).click();

    expect(emitted).toEqual([NO_PRODUCT_FILTERS]);
  });

  it('avisa del rango invertido que el backend no valida', () => {
    setup();

    type('#filter-min-price', '100');
    type('#filter-max-price', '1');

    const alert = fixture.nativeElement.querySelector('[role="alert"]') as HTMLElement | null;
    expect(alert?.textContent).toContain('El precio mínimo no puede ser mayor que el máximo.');
  });

  it('resincroniza los borradores cuando los filtros cambian desde fuera', () => {
    setup();

    type('#filter-search', 'sin enviar');
    fixture.componentRef.setInput('filters', { ...NO_PRODUCT_FILTERS, search: 'cafe' });
    fixture.detectChanges();

    expect(control('#filter-search').value).toBe('cafe');
  });
});
