/**
 * Reglas de credenciales, espejo del contrato del backend (`auth.dto.ts`).
 * En login la contraseña solo exige presencia: el backend responde 401, no 400,
 * para no revelar la política de contraseñas.
 */

export const PASSWORD_MIN_LENGTH = 10;
export const PASSWORD_MAX_LENGTH = 128;
export const EMAIL_MAX_LENGTH = 254;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(email: string): string | null {
  const value = email.trim();
  if (value.length === 0) {
    return 'El email es obligatorio';
  }
  if (value.length > EMAIL_MAX_LENGTH) {
    return `El email no puede superar los ${EMAIL_MAX_LENGTH} caracteres`;
  }
  return EMAIL_PATTERN.test(value) ? null : 'El email no es válido';
}

export function validatePasswordForRegistration(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres`;
  }
  if (password.length > PASSWORD_MAX_LENGTH) {
    return `La contraseña no puede superar los ${PASSWORD_MAX_LENGTH} caracteres`;
  }
  return null;
}

export function validatePasswordPresence(password: string): string | null {
  return password.length > 0 ? null : 'La contraseña es obligatoria';
}
