import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCircleAlert } from '@ng-icons/lucide';
import { asAppError, type FieldError } from '../../../core/http/app-error';
import { Notifier } from '../../../core/notifications/notifier';
import { SkeletonDirective } from '../../../shared/ui/skeleton/skeleton.directive';
import { ProductsStore } from '../../application/products.store';
import type { ProductDraft } from '../../domain/product-draft';
import { ProductFormComponent } from '../components/product-form';

/**
 * Página smart de alta y edición. El `:id` de la ruta habilita el modo edición;
 * sin `:id` el formulario arranca vacío.
 */
@Component({
  selector: 'app-product-form-page',
  imports: [RouterLink, NgIcon, SkeletonDirective, ProductFormComponent],
  viewProviders: [provideIcons({ lucideCircleAlert })],
  template: `
    <div class="mx-auto max-w-2xl space-y-6">
      <div>
        <a
          routerLink="/products"
          [queryParams]="returnParams()"
          class="text-muted-foreground hover:text-foreground text-sm underline-offset-4 hover:underline"
        >
          ← Volver al catálogo
        </a>
        <h1 class="mt-2 text-2xl font-semibold tracking-tight">
          {{ isEdit() ? 'Editar producto' : 'Nuevo producto' }}
        </h1>
        <p class="text-muted-foreground mt-1 text-sm">
          @if (isEdit()) {
            Los cambios se guardan sobre el producto existente.
          } @else {
            El SKU debe ser único entre los productos activos.
          }
        </p>
      </div>

      @if (isEdit() && store.selectedLoading()) {
        <div class="space-y-4 rounded-xl border p-6">
          <span appSkeleton class="h-9 w-full"></span>
          <span appSkeleton class="h-9 w-full"></span>
          <span appSkeleton class="h-24 w-full"></span>
          <span appSkeleton class="h-9 w-40"></span>
        </div>
      } @else if (isEdit() && store.selectedFailed()) {
        <div class="border-destructive/30 bg-destructive/5 flex items-start gap-3 rounded-xl border p-6" role="alert">
          <ng-icon name="lucideCircleAlert" class="text-destructive mt-0.5 shrink-0" />
          <div>
            <p class="font-medium">No pudimos abrir el producto</p>
            <p class="text-muted-foreground mt-1 text-sm">{{ store.selectedError()?.message }}</p>
          </div>
        </div>
      } @else {
        <div class="bg-card rounded-xl border p-6">
          <app-product-form
            [product]="store.selectedProduct()"
            [submitting]="store.isSaving()"
            [serverErrors]="serverErrors()"
            (formSubmit)="save($event)"
            (cancelled)="back()"
          />
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductFormPage {
  protected readonly store = inject(ProductsStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly notifier = inject(Notifier);

  /** Bindings de ruta habilitados en `app.config` (`withComponentInputBinding`). */
  readonly id = input<string>();

  protected readonly serverErrors = signal<readonly FieldError[]>([]);
  protected readonly isEdit = computed(() => {
    const id = this.id();
    return id !== undefined && id.length > 0;
  });

  constructor() {
    effect(() => {
      const id = this.id();
      if (id) {
        this.store.loadOne(id);
      } else {
        this.store.clearSelected();
      }
    });
  }

  protected returnParams(): Record<string, string> {
    const params = this.route.snapshot.queryParamMap;
    const result: Record<string, string> = {};
    const page = params.get('page');
    const size = params.get('size');

    if (page) {
      result['page'] = page;
    }
    if (size) {
      result['size'] = size;
    }

    return result;
  }

  protected back(): void {
    void this.router.navigate(['/products'], { queryParams: this.returnParams() });
  }

  protected async save(draft: ProductDraft): Promise<void> {
    this.serverErrors.set([]);
    const id = this.id();

    try {
      if (id) {
        await this.store.update(id, draft);
        this.notifier.success('Producto actualizado.');
      } else {
        await this.store.create(draft);
        this.notifier.success('Producto creado.');
      }

      this.back();
    } catch (error) {
      const appError = asAppError(error);
      this.serverErrors.set(appError.fieldErrors);

      // Con errores de campo, el formulario los muestra junto a cada control.
      if (appError.fieldErrors.length === 0) {
        this.notifier.error(appError.message);
      }
    }
  }
}
