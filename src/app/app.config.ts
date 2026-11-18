import { ApplicationConfig, inject, provideAppInitializer, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  provideRouter,
  withComponentInputBinding,
  withInMemoryScrolling,
} from '@angular/router';
import { provideApiBaseUrl } from './core/http/api-base-url.token';
import { errorInterceptor } from './core/http/error.interceptor';
import { environment } from './core/config/environment';
import { provideAuth } from './auth/auth.providers';
import { authTokenInterceptor } from './auth/infrastructure/auth-token.interceptor';
import { sessionExpiryInterceptor } from './auth/infrastructure/session-expiry.interceptor';
import { SessionStore } from './auth/application/session.store';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      withComponentInputBinding(),
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled' }),
    ),
    // El orden importa: el error se normaliza primero y luego la sesión decide
    // si un 401 significa reautenticación.
    provideHttpClient(
      withInterceptors([authTokenInterceptor, sessionExpiryInterceptor, errorInterceptor]),
    ),
    provideApiBaseUrl(environment.apiBaseUrl),
    provideAuth(),
    provideAppInitializer(() => inject(SessionStore).restore()),
  ],
};
