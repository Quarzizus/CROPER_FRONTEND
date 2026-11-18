import { Injectable } from '@angular/core';
import type { SessionStorage } from '../domain/auth.repository';
import type { Session } from '../domain/session';

const STORAGE_KEY = 'croper.session';

/** Persistencia de la sesión. El token sobrevive al refresh de la página. */
@Injectable()
export class LocalSessionStorage implements SessionStorage {
  read(): Session | null {
    const raw = this.storage?.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }

    try {
      return this.parse(raw);
    } catch {
      // Un valor corrupto no debe romper el arranque: se descarta.
      this.storage?.removeItem(STORAGE_KEY);
      return null;
    }
  }

  write(session: Session): void {
    this.storage?.setItem(STORAGE_KEY, JSON.stringify(session));
  }

  clear(): void {
    this.storage?.removeItem(STORAGE_KEY);
  }

  private get storage(): Storage | null {
    return typeof localStorage === 'undefined' ? null : localStorage;
  }

  private parse(raw: string): Session | null {
    const value: unknown = JSON.parse(raw);
    if (typeof value !== 'object' || value === null) {
      return null;
    }

    const candidate = value as Record<string, unknown>;
    const accessToken = candidate['accessToken'];
    const tokenType = candidate['tokenType'];
    const expiresAt = candidate['expiresAt'];

    if (
      typeof accessToken !== 'string' ||
      accessToken.length === 0 ||
      tokenType !== 'Bearer' ||
      typeof expiresAt !== 'number'
    ) {
      return null;
    }

    return { accessToken, tokenType: 'Bearer', expiresAt };
  }
}
