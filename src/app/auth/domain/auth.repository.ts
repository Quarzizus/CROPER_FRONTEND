import type { AuthenticatedUser, Session } from './session';

/**
 * Puertos de la feature `auth`. La capa de aplicación depende de estas clases
 * abstractas; `infrastructure` decide si por debajo hay HTTP o `localStorage`.
 */
export abstract class AuthRepository {
  abstract login(email: string, password: string): Promise<Session>;
  abstract register(email: string, password: string): Promise<AuthenticatedUser>;
  abstract me(): Promise<AuthenticatedUser>;
}

export abstract class SessionStorage {
  abstract read(): Session | null;
  abstract write(session: Session): void;
  abstract clear(): void;
}
