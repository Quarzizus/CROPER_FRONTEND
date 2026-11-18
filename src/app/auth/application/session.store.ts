import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { asAppError, type AppError } from '../../core/http/app-error';
import { AuthRepository, SessionStorage } from '../domain/auth.repository';
import { isSessionExpired, type AuthenticatedUser, type Session } from '../domain/session';

interface SessionState {
  session: Session | null;
  user: AuthenticatedUser | null;
  status: 'idle' | 'authenticating';
  error: AppError | null;
}

const initialState: SessionState = {
  session: null,
  user: null,
  status: 'idle',
  error: null,
};

/**
 * Estado de sesión de la feature `auth`. No conoce HTTP ni el router: habla con
 * los puertos `AuthRepository` y `SessionStorage`.
 */
export const SessionStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed(({ session, user, status }) => ({
    isAuthenticated: computed(() => {
      const current = session();
      return current !== null && !isSessionExpired(current);
    }),
    isBusy: computed(() => status() === 'authenticating'),
    accessToken: computed(() => session()?.accessToken ?? null),
    userEmail: computed(() => user()?.email ?? null),
  })),
  withMethods((store, repository = inject(AuthRepository), storage = inject(SessionStorage)) => {
    function persist(session: Session): void {
      storage.write(session);
      patchState(store, { session, status: 'idle', error: null });
    }

    function fail(error: unknown): AppError {
      const appError = asAppError(error);
      patchState(store, { status: 'idle', error: appError });
      return appError;
    }

    async function loadProfile(): Promise<void> {
      try {
        patchState(store, { user: await repository.me() });
      } catch {
        // Sin perfil la app sigue funcionando; el email es solo informativo.
      }
    }

    return {
      /** Restaura la sesión guardada. Silencioso: un token inválido es normal. */
      async restore(): Promise<void> {
        const stored = storage.read();
        if (!stored || isSessionExpired(stored)) {
          storage.clear();
          return;
        }

        patchState(store, { session: stored });
        await loadProfile();
      },

      async login(email: string, password: string): Promise<void> {
        patchState(store, { status: 'authenticating', error: null });
        try {
          persist(await repository.login(email, password));
          await loadProfile();
        } catch (error) {
          throw fail(error);
        }
      },

      /**
       * El registro del backend devuelve el usuario pero no un token, así que se
       * inicia sesión inmediatamente después para dejar la app usable.
       */
      async register(email: string, password: string): Promise<void> {
        patchState(store, { status: 'authenticating', error: null });
        try {
          patchState(store, { user: await repository.register(email, password) });
          persist(await repository.login(email, password));
        } catch (error) {
          throw fail(error);
        }
      },

      loadProfile,

      logout(): void {
        storage.clear();
        patchState(store, initialState);
      },
    };
  }),
);
