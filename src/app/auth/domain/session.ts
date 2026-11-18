/** Sesión y usuario autenticado. Dominio puro: sin Angular, sin HTTP. */

export interface AuthenticatedUser {
  readonly id: string;
  readonly email: string;
  readonly createdAt: string;
}

export interface Session {
  readonly accessToken: string;
  readonly tokenType: 'Bearer';
  /** Instante de expiración en milisegundos (epoch). */
  readonly expiresAt: number;
}

/** Margen de seguridad para no enviar un token que expira en el camino. */
const EXPIRY_SKEW_MS = 5_000;

export function isSessionExpired(session: Session, now: number = Date.now()): boolean {
  return session.expiresAt - EXPIRY_SKEW_MS <= now;
}
