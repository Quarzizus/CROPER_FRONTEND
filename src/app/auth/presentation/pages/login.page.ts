import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import {
  NonNullableFormBuilder,
  ReactiveFormsModule,
  type AbstractControl,
  type ValidationErrors,
} from '@angular/forms';
import { Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowRight, lucideBoxes, lucideLoaderCircle } from '@ng-icons/lucide';
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
import { CatalogScene } from '../components/catalog-scene';

type AuthMode = 'login' | 'register';

/** En login un 401 son credenciales, no una sesión expirada. */
const INVALID_CREDENTIALS = 'Email o contraseña incorrectos.';

@Component({
  selector: 'app-login-page',
  imports: [
    ReactiveFormsModule,
    NgIcon,
    ButtonDirective,
    Field,
    InputDirective,
    CatalogScene,
  ],
  viewProviders: [
    provideIcons({ lucideArrowRight, lucideBoxes, lucideLoaderCircle }),
  ],
  template: `
    <div class="flex min-h-dvh flex-col lg:grid lg:grid-cols-[minmax(0,1.08fr)_minmax(0,1fr)]">
      <!-- Hero: el almacén en 3D da contexto al catálogo. -->
      <section
        class="relative flex min-h-[17rem] flex-1 flex-col justify-between overflow-hidden px-6 pt-6 pb-16 text-white sm:px-8 sm:pt-7 sm:pb-20 lg:min-h-dvh lg:px-14 lg:pt-12 lg:pb-12"
      >
        <div
          class="pointer-events-none absolute inset-0 bg-[radial-gradient(115%_90%_at_15%_0%,#16543f_0%,#0a2c23_48%,#061a15_100%)]"
        ></div>
        <app-catalog-scene class="pointer-events-none absolute inset-0 opacity-75 lg:opacity-95" />
        <!-- Scrims: oscurecen donde vive el texto y dejan respirar el almacén. -->
        <div
          class="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgba(4,18,15,0.92)_0%,rgba(4,18,15,0.34)_36%,transparent_64%)]"
        ></div>
        <div
          class="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(4,18,15,0.82)_0%,rgba(4,18,15,0.42)_42%,transparent_72%)]"
        ></div>
        <div
          class="pointer-events-none absolute inset-0 bg-[radial-gradient(140%_110%_at_35%_6%,transparent_58%,rgba(3,15,12,0.38)_100%)]"
        ></div>

        <div class="relative z-10 flex items-center gap-3">
          <span
            class="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15 backdrop-blur-sm"
          >
            <ng-icon name="lucideBoxes" size="1.1rem" />
          </span>
          <span class="text-sm font-semibold tracking-tight">Catálogo de productos</span>
        </div>

        <div class="relative z-10 mt-10 lg:mt-0">
          <p class="text-[11px] font-semibold tracking-[0.2em] text-emerald-200/75 uppercase">
            Inventario
          </p>
          <h1
            class="mt-2 max-w-md text-[1.65rem] leading-[1.15] font-semibold tracking-tight text-balance sm:mt-3 sm:text-3xl lg:text-[2.7rem] lg:leading-[1.08]"
          >
            Cada producto, en su sitio.
          </h1>
          <p class="mt-3 hidden max-w-sm text-sm leading-relaxed text-white/75 sm:block lg:mt-4 lg:text-base">
            Alta, edición y baja con paginación, confirmación antes de borrar y el estado en la
            URL.
          </p>
          <p
            class="mt-8 hidden font-mono text-[11px] tracking-[0.22em] text-white/45 uppercase lg:block"
          >
            SKU · Precio · Stock · Estado
          </p>
        </div>

        <div class="relative z-10 hidden lg:block" aria-hidden="true"></div>
      </section>

      <!-- Formulario: hoja que se superpone al hero en móvil. -->
      <main
        class="relative z-10 -mt-9 flex flex-col justify-start px-4 pb-6 sm:px-6 lg:mt-0 lg:justify-center lg:px-14 lg:py-16"
      >
        <div
          class="bg-background mx-auto w-full max-w-md rounded-2xl p-6 shadow-xl shadow-black/10 ring-1 ring-black/5 sm:p-8 lg:max-w-[25rem] lg:p-0 lg:shadow-none lg:ring-0"
        >
          <h2 class="text-2xl font-semibold tracking-tight">
            {{ mode() === 'login' ? 'Ingresa a tu catálogo' : 'Crea tu cuenta' }}
          </h2>
          <p class="text-muted-foreground mt-2 text-sm leading-relaxed">
            @if (mode() === 'login') {
              Usa las credenciales de tu cuenta para continuar.
            } @else {
              Elige un email y una contraseña de al menos 10 caracteres.
            }
          </p>

          <div class="bg-muted mt-8 grid grid-cols-2 gap-1 rounded-xl p-1" role="group" aria-label="Modo de acceso">
            <button
              type="button"
              class="h-10 rounded-lg text-sm font-medium transition-colors"
              [class.bg-card]="mode() === 'login'"
              [class.shadow-sm]="mode() === 'login'"
              [class.text-foreground]="mode() === 'login'"
              [class.text-muted-foreground]="mode() !== 'login'"
              [attr.aria-pressed]="mode() === 'login'"
              (click)="setMode('login')"
            >
              Ingresar
            </button>
            <button
              type="button"
              class="h-10 rounded-lg text-sm font-medium transition-colors"
              [class.bg-card]="mode() === 'register'"
              [class.shadow-sm]="mode() === 'register'"
              [class.text-foreground]="mode() === 'register'"
              [class.text-muted-foreground]="mode() !== 'register'"
              [attr.aria-pressed]="mode() === 'register'"
              (click)="setMode('register')"
            >
              Crear cuenta
            </button>
          </div>

          <form class="mt-8 space-y-6" [formGroup]="form" (ngSubmit)="submit()" novalidate>
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
              <p
                class="border-destructive/25 bg-destructive/5 text-destructive rounded-lg border px-3.5 py-2.5 text-sm"
                role="alert"
              >
                {{ message }}
              </p>
            }

            <div class="pt-2">
              <button appButton type="submit" class="h-11 w-full text-sm" [disabled]="store.isBusy()">
                @if (store.isBusy()) {
                  <ng-icon name="lucideLoaderCircle" class="animate-spin" />
                  <span>Verificando…</span>
                } @else {
                  <span>{{ submitLabel() }}</span>
                  <ng-icon name="lucideArrowRight" class="opacity-70" />
                }
              </button>
            </div>
          </form>
        </div>
      </main>
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
  protected readonly submitLabel = computed(() =>
    this.mode() === 'login' ? 'Ingresar' : 'Crear cuenta',
  );

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
