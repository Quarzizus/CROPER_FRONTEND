import { ChangeDetectionStrategy, Component, effect, inject, input, output } from '@angular/core';
import {
  NonNullableFormBuilder,
  ReactiveFormsModule,
  type AbstractControl,
  type ValidationErrors,
} from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideLoaderCircle } from '@ng-icons/lucide';
import type { FieldError } from '../../../core/http/app-error';
import { ButtonDirective } from '../../../shared/ui/button/button.directive';
import { Field } from '../../../shared/ui/field/field';
import { InputDirective } from '../../../shared/ui/input/input.directive';
import type { Product } from '../../domain/product';
import type { ProductDraft } from '../../domain/product-draft';
import {
  normalizeSku,
  validateCategory,
  validateDescription,
  validateName,
  validatePrice,
  validateSku,
  validateStock,
} from '../../domain/product-rules';
import { EMPTY_FORM_VALUE, toDraft, toFormValue } from '../product-form.mapper';

const TEXT_FIELDS = ['sku', 'name', 'description', 'category'] as const;
const NUMBER_FIELDS = ['price', 'stock'] as const;
const ALL_FIELDS = [...TEXT_FIELDS, ...NUMBER_FIELDS] as const;

type FieldName = (typeof ALL_FIELDS)[number];

/** Adapta una regla de dominio (mensaje o nada) a un validador de Angular. */
function textRule(rule: (value: string) => string | null) {
  return (control: AbstractControl): ValidationErrors | null => {
    const message = rule(typeof control.value === 'string' ? control.value : '');
    return message ? { message } : null;
  };
}

function numberRule(rule: (value: number) => string | null) {
  return (control: AbstractControl): ValidationErrors | null => {
    const message = rule(typeof control.value === 'number' ? control.value : Number.NaN);
    return message ? { message } : null;
  };
}

/**
 * Formulario presentacional. Valida con las reglas del dominio y emite un
 * borrador; no guarda nada ni conoce el store.
 */
@Component({
  selector: 'app-product-form',
  imports: [ReactiveFormsModule, NgIcon, ButtonDirective, Field, InputDirective],
  viewProviders: [provideIcons({ lucideLoaderCircle })],
  template: `
    <form class="space-y-6" [formGroup]="form" (ngSubmit)="submit()" novalidate>
      <div class="grid gap-4 sm:grid-cols-[minmax(0,12rem)_1fr]">
        <app-field
          label="SKU"
          htmlFor="product-sku"
          [error]="errorFor('sku')"
          hint="Letras, números y guiones."
        >
          <input
            appInput
            id="product-sku"
            formControlName="sku"
            autocomplete="off"
            spellcheck="false"
            class="font-mono uppercase"
            [attr.aria-invalid]="showError('sku')"
            (blur)="uppercaseSku()"
          />
        </app-field>

        <app-field label="Categoría" htmlFor="product-category" [error]="errorFor('category')" hint="Opcional.">
          <input appInput id="product-category" formControlName="category" autocomplete="off" />
        </app-field>
      </div>

      <app-field label="Nombre" htmlFor="product-name" [error]="errorFor('name')">
        <input
          appInput
          id="product-name"
          formControlName="name"
          autocomplete="off"
          [attr.aria-invalid]="showError('name')"
        />
      </app-field>

      <app-field
        label="Descripción"
        htmlFor="product-description"
        [error]="errorFor('description')"
        hint="Opcional, hasta 2000 caracteres."
      >
        <textarea
          appInput
          id="product-description"
          formControlName="description"
          rows="3"
          [attr.aria-invalid]="showError('description')"
        ></textarea>
      </app-field>

      <div class="grid gap-4 sm:grid-cols-2">
        <app-field label="Precio" htmlFor="product-price" [error]="errorFor('price')">
          <input
            appInput
            id="product-price"
            type="number"
            min="0"
            step="0.01"
            inputmode="decimal"
            formControlName="price"
            class="font-mono tabular-nums"
            [attr.aria-invalid]="showError('price')"
          />
        </app-field>

        <app-field label="Stock" htmlFor="product-stock" [error]="errorFor('stock')">
          <input
            appInput
            id="product-stock"
            type="number"
            min="0"
            step="1"
            inputmode="numeric"
            formControlName="stock"
            class="font-mono tabular-nums"
            [attr.aria-invalid]="showError('stock')"
          />
        </app-field>
      </div>

      <label class="flex items-start gap-3 rounded-lg border p-3">
        <input
          type="checkbox"
          formControlName="isActive"
          class="accent-primary mt-0.5 size-4"
        />
        <span>
          <span class="text-sm font-medium">Disponible para la venta</span>
          <span class="text-muted-foreground block text-xs">
            Desmárcalo para pausar el producto sin eliminarlo.
          </span>
        </span>
      </label>

      <div class="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-end">
        <button appButton variant="outline" type="button" [disabled]="submitting()" (click)="cancelled.emit()">
          Cancelar
        </button>
        <button appButton type="submit" [disabled]="submitting()">
          @if (submitting()) {
            <ng-icon name="lucideLoaderCircle" class="animate-spin" />
            <span>Guardando…</span>
          } @else {
            {{ product() ? 'Guardar cambios' : 'Crear producto' }}
          }
        </button>
      </div>
    </form>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductFormComponent {
  private readonly fb = inject(NonNullableFormBuilder);

  readonly product = input<Product | null>(null);
  readonly submitting = input(false);
  readonly serverErrors = input<readonly FieldError[]>([]);

  readonly formSubmit = output<ProductDraft>();
  readonly cancelled = output<void>();

  protected readonly form = this.fb.group({
    sku: this.fb.control(EMPTY_FORM_VALUE.sku, { validators: [textRule(validateSku)] }),
    name: this.fb.control(EMPTY_FORM_VALUE.name, { validators: [textRule(validateName)] }),
    description: this.fb.control(EMPTY_FORM_VALUE.description, {
      validators: [textRule(validateDescription)],
    }),
    price: this.fb.control<number | null>(EMPTY_FORM_VALUE.price, {
      validators: [numberRule(validatePrice)],
    }),
    stock: this.fb.control<number | null>(EMPTY_FORM_VALUE.stock, {
      validators: [numberRule(validateStock)],
    }),
    category: this.fb.control(EMPTY_FORM_VALUE.category, {
      validators: [textRule(validateCategory)],
    }),
    isActive: this.fb.control(EMPTY_FORM_VALUE.isActive),
  });

  constructor() {
    // Al entrar a editar, el producto llega después de la carga: se vuelca al form.
    effect(() => {
      const product = this.product();
      if (product) {
        this.form.patchValue(toFormValue(product), { emitEvent: false });
        this.form.markAsPristine();
      }
    });

    // Los 400/422 del backend se muestran en su campo, no como toast genérico.
    effect(() => {
      this.applyServerErrors(this.serverErrors());
    });
  }

  protected errorFor(field: FieldName): string | null {
    if (!this.showError(field)) {
      return null;
    }

    const message: unknown = this.form.controls[field].errors?.['message'];
    return typeof message === 'string' ? message : null;
  }

  protected showError(field: FieldName): boolean {
    const control = this.form.controls[field];
    return control.invalid && (control.touched || control.dirty);
  }

  protected uppercaseSku(): void {
    const control = this.form.controls.sku;
    const normalized = normalizeSku(control.value);
    if (normalized !== control.value) {
      control.setValue(normalized);
    }
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.formSubmit.emit(toDraft(this.form.getRawValue()));
  }

  private applyServerErrors(errors: readonly FieldError[]): void {
    this.clearServerErrors();

    for (const { field, message } of errors) {
      if (!this.isFieldName(field)) {
        continue;
      }

      const control = this.form.controls[field];
      control.setErrors({ ...(control.errors ?? {}), server: message });
      control.markAsTouched();
    }
  }

  private clearServerErrors(): void {
    for (const field of ALL_FIELDS) {
      const control = this.form.controls[field];
      if (!control.hasError('server')) {
        continue;
      }

      const rest = Object.entries(control.errors ?? {}).filter(([key]) => key !== 'server');
      control.setErrors(rest.length > 0 ? Object.fromEntries(rest) : null);
    }
  }

  private isFieldName(value: string): value is FieldName {
    return (ALL_FIELDS as readonly string[]).includes(value);
  }
}
