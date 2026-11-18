import { makeEnvironmentProviders } from '@angular/core';
import { AuthRepository, SessionStorage } from './domain/auth.repository';
import { HttpAuthRepository } from './infrastructure/auth.http-repository';
import { LocalSessionStorage } from './infrastructure/session.storage';

/** Adaptadores concretos de la feature. El composition root los ignora. */
export function provideAuth() {
  return makeEnvironmentProviders([
    { provide: AuthRepository, useClass: HttpAuthRepository },
    { provide: SessionStorage, useClass: LocalSessionStorage },
  ]);
}
