import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import {
  NonNullableFormBuilder,
  ReactiveFormsModule,
  type AbstractControl,
  type ValidationErrors,
} from '@angular/forms';
import { Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideBoxes, lucideLoaderCircle } from '@ng-icons/lucide';
import { SessionStore } from '../../application/session.store';
import {
  validateEmail,
  validatePasswordForRegistration,
  validatePasswordPresence,
} from '../../domain/auth-rules';
import { asAppError } from '../../../core/http/app-error';
import { Notifier } from '../../../core/notifications/notifier';
import { ButtonDirective } from '../../../shared/ui/button/button.directive';
import { Field } from '../../../shared/ui/field/field';
import { InputDirective } from '../../../shared/ui/input/input.directive';

type AuthMode = 'login' | 'register';

/** En login un 401 son credenciales, no una sesión expirada. */
const INVALID_CREDENTIALS = 'Email o contraseña incorrectos.';

@Component({
  selector: 'app-login-page',
  imports: [ReactiveFormsModule, NgIcon, ButtonDirective, Field, InputDirective],
  viewProviders: [provideIcons({ lucideBoxes, lucideLoaderCircle })],
  template: `
    <div class="grid items-center gap-10 lg:min-h-[calc(100dvh-8rem)] lg:grid-cols-[1.05fr_minmax(0,26rem)] lg:gap-20">
      <!-- Panel de marca: el catálogo se presenta como un libro de inventario. -->
      <section class="hidden lg:block" aria-hidden="true">
        <p class="text-primary text-xs font-semibold tracking-[0.18em] uppercase">Gestión de catálogo</p>
        <h1 class="mt-4 text-4xl font-semibold tracking-tight text-balance">
          Un catálogo que se lee de un vistazo.
        </h1>
        <p class="text-muted-foreground mt-4 max-w-md text-base">
          Alta, edición y baja de productos con paginación, búsqueda por página y confirmación
          antes de borrar. El estado vive en la URL, así que compartir una vista es copiar el
          enlace.
        </p>

        <div class="border-border/70 mt-10 max-w-md overflow-hidden rounded-xl border bg-card/60">
          <div class="text-muted-foreground grid grid-cols-[7rem_1fr_auto] gap-4 border-b px-4 py-2 font-mono text-[11px] tracking-wider uppercase">
            <span>SKU</span>
            <span>Producto</span>
            <span>Precio</span>
          </div>
          @for (row of ledger; track row.sku) {
            <div class="grid grid-cols-[7rem_1fr_auto] items-baseline gap-4 px-4 py-3 text-sm">
              <span class="text-primary font-mono text-xs font-medium">{{ row.sku }}</span>
              <span class="truncate">{{ row.name }}</span>
              <span class="text-muted-foreground font-mono text-xs tabular-nums">{{ row.price }}</span>
            </div>
          }
        </div>
      </section>

      <section class="mx-auto w-full max-w-md">
        <div class="mb-8 flex items-center gap-3 lg:hidden">
          <span class="bg-primary text-primary-foreground flex size-10 items-center justify-center rounded-xl">
            <ng-icon name="lucideBoxes" size="1.25rem" />
          </span>
          <span class="font-semibold tracking-tight">Catálogo de productos</span>
        </div>

        <div class="bg-card rounded-2xl border p-6 shadow-sm sm:p-8">
          <h2 class="text-xl font-semibold tracking-tight">
            @if (mode() === 'login') {
              Ingresa a tu catálogo
            } @else {
              Crea tu cuenta
            }
          </h2>
          <p class="text-muted-foreground mt-1 text-sm">
            @if (mode() === 'login') {
              Usa las credenciales de tu cuenta para continuar.
            } @else {
              Necesitas al menos 10 caracteres de contraseña.
            }
          </p>

          <div class="bg-muted mt-6 grid grid-cols-2 gap-1 rounded-lg p-1" role="group" aria-label="Modo de acceso">
            <button
              type="button"
              class="rounded-md px-3 py-1.5 text-sm font-medium transition-colors"
              [class.bg-card]="mode() === 'login'"
              [class.shadow-xs]="mode() === 'login'"
              [attr.aria-pressed]="mode() === 'login'"
              (click)="setMode('login')"
            >
              Ingresar
            </button>
            <button
              type="button"
              class="rounded-md px-3 py-1.5 text-sm font-medium transition-colors"
              [class.bg-card]="mode() === 'register'"
              [class.shadow-xs]="mode() === 'register'"
              [attr.aria-pressed]="mode() === 'register'"
              (click)="setMode('register')"
            >
              Crear cuenta
            </button>
          </div>

          <form class="mt-6 space-y-4" [formGroup]="form" (ngSubmit)="submit()" novalidate>
            <app-field label="Email" htmlFor="auth-email" [error]="errorFor(form.controls.email)">
              <input
                appInput
                id="auth-email"
                type="email"
                inputmode="email"
                autocomplete="email"
                placeholder="ana@example.com"
                formControlName="email"
                [attr.aria-invalid]="showError(form.controls.email)"
              />
            </app-field>

            <app-field
              label="Contraseña"
              htmlFor="auth-password"
              [error]="errorFor(form.controls.password)"
              [hint]="mode() === 'register' ? 'Mínimo 10 caracteres.' : null"
            >
              <input
                appInput
                id="auth-password"
                type="password"
                [autocomplete]="mode() === 'register' ? 'new-password' : 'current-password'"
                formControlName="password"
                [attr.aria-invalid]="showError(form.controls.password)"
              />
            </app-field>

            @if (formError(); as message) {
              <p class="border-destructive/30 bg-destructive/5 text-destructive rounded-md border px-3 py-2 text-sm" role="alert">
                {{ message }}
              </p>
            }

            <button appButton type="submit" class="w-full" [disabled]="store.isBusy()">
              @if (store.isBusy()) {
                <ng-icon name="lucideLoaderCircle" class="animate-spin" />
                <span>Verificando…</span>
              } @else {
                {{ mode() === 'login' ? 'Ingresar' : 'Crear cuenta' }}
              }
            </button>
          </form>
        </div>
      </section>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginPage {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly router = inject(Router);
  private readonly notifier = inject(Notifier);

  protected readonly store = inject(SessionStore);
  protected readonly mode = signal<AuthMode>('login');
  protected readonly formError = signal<string | null>(null);

  protected readonly ledger = [
    { sku: 'CAF-001', name: 'Café molido 500 g', price: '12.50' },
    { sku: 'CAF-014', name: 'Café en grano 1 kg', price: '24.90' },
    { sku: 'TEV-007', name: 'Té verde hoja suelta', price: '9.80' },
  ] as const;

  /** Se declara antes de `form`: el formulario lo necesita al construirse. */
  private readonly passwordValidator = (control: AbstractControl): ValidationErrors | null => {
    const value = typeof control.value === 'string' ? control.value : '';
    const message =
      this.mode() === 'register'
        ? validatePasswordForRegistration(value)
        : validatePasswordPresence(value);

    return message ? { message } : null;
  };

  protected readonly form = this.fb.group({
    email: this.fb.control('', { validators: [emailValidator] }),
    password: this.fb.control('', { validators: [this.passwordValidator] }),
  });

  protected setMode(mode: AuthMode): void {
    if (mode === this.mode()) {
      return;
    }

    this.mode.set(mode);
    this.formError.set(null);
    this.form.controls.password.updateValueAndValidity();
  }

  protected errorFor(control: AbstractControl): string | null {
    if (!this.showError(control)) {
      return null;
    }

    const errors: ValidationErrors | null = control.errors;
    const message = errors?.['message'] ?? errors?.['server'];
    return typeof message === 'string' ? message : null;
  }

  protected showError(control: AbstractControl): boolean {
    return control.invalid && (control.touched || control.dirty);
  }

  protected async submit(): Promise<void> {
    this.formError.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { email, password } = this.form.getRawValue();

    try {
      if (this.mode() === 'register') {
        await this.store.register(email, password);
        this.notifier.success('Cuenta creada. Ya puedes gestionar el catálogo.');
      } else {
        await this.store.login(email, password);
        this.notifier.success('Bienvenido de nuevo.');
      }

      await this.router.navigateByUrl('/products');
    } catch (error) {
      this.handleError(error);
    }
  }

  private handleError(error: unknown): void {
    const appError = asAppError(error);
    const applied = this.applyFieldErrors(appError.fieldErrors);

    if (applied === 0) {
      this.formError.set(
        appError.kind === 'unauthorized' ? INVALID_CREDENTIALS : appError.message,
      );
    }
  }

  private applyFieldErrors(fieldErrors: readonly { field: string; message: string }[]): number {
    let applied = 0;

    for (const { field, message } of fieldErrors) {
      if (field === 'email' || field === 'password') {
        const control = this.form.controls[field];
        control.setErrors({ server: message });
        control.markAsTouched();
        applied += 1;
      }
    }

    return applied;
  }
}

function emailValidator(control: AbstractControl): ValidationErrors | null {
  const value = typeof control.value === 'string' ? control.value : '';
  const message = validateEmail(value);
  return message ? { message } : null;
}
