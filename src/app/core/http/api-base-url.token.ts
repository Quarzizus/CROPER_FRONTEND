import { InjectionToken, type Provider } from '@angular/core';

/**
 * Base de la API del Ejercicio 1 (por ejemplo `/api/v1`). Se inyecta en lugar de
 * leer el entorno desde `infrastructure`, para que el adaptador HTTP sea testeable
 * con cualquier base.
 */
export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL');

export function provideApiBaseUrl(baseUrl: string): Provider {
  return { provide: API_BASE_URL, useValue: baseUrl.replace(/\/+$/, '') };
}
