/**
 * Configuración por entorno. `apiBaseUrl` es relativa a propósito: el dev server
 * la resuelve con `proxy.conf.json` (mismo origen, sin CORS) y en producción se
 * sirve detrás del mismo host que la API.
 */
export interface AppEnvironment {
  readonly production: boolean;
  readonly apiBaseUrl: string;
}

export const environment: AppEnvironment = {
  production: false,
  apiBaseUrl: '/api/v1',
};
