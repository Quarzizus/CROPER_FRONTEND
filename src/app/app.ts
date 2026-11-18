import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideBoxes, lucideLogOut } from '@ng-icons/lucide';
import { SessionStore } from './auth/application/session.store';
import { ButtonDirective } from './shared/ui/button/button.directive';
import { Toaster } from './shared/ui/toast/toaster';

/** Shell de la aplicación: cabecera con sesión, contenido y toaster global. */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, NgIcon, ButtonDirective, Toaster],
  viewProviders: [provideIcons({ lucideBoxes, lucideLogOut })],
  template: `
    <div class="flex min-h-dvh flex-col">
      @if (sessions.isAuthenticated()) {
        <header class="border-border/70 bg-background/85 sticky top-0 z-30 border-b backdrop-blur">
          <div class="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
            <a
              routerLink="/products"
              class="flex items-center gap-2.5 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span class="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-lg">
                <ng-icon name="lucideBoxes" size="1.05rem" />
              </span>
              <span class="text-sm font-semibold tracking-tight">Catálogo de productos</span>
            </a>

            <div class="flex items-center gap-2 sm:gap-3">
              @if (sessions.userEmail(); as email) {
                <span class="text-muted-foreground hidden max-w-[18rem] truncate text-sm sm:inline">
                  {{ email }}
                </span>
              }
              <button appButton variant="ghost" size="sm" type="button" (click)="logout()">
                <ng-icon name="lucideLogOut" />
                <span class="hidden sm:inline">Salir</span>
                <span class="sr-only sm:hidden">Cerrar sesión</span>
              </button>
            </div>
          </div>
        </header>
      }

      <!-- Las features autenticadas viven en una columna centrada; el login es
           full-bleed y decide su propio layout. -->
      <main
        [class]="
          sessions.isAuthenticated()
            ? 'mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 lg:px-8'
            : 'flex-1'
        "
      >
        <router-outlet />
      </main>
    </div>

    <app-toaster />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  protected readonly sessions = inject(SessionStore);
  private readonly router = inject(Router);

  protected async logout(): Promise<void> {
    this.sessions.logout();
    await this.router.navigate(['/login']);
  }
}
