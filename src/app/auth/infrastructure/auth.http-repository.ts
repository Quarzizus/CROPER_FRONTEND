import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from '../../core/http/api-base-url.token';
import type { AuthRepository } from '../domain/auth.repository';
import type { AuthenticatedUser, Session } from '../domain/session';
import type { LoginRequestDto, RegisterRequestDto, TokenResponseDto, UserResponseDto } from './auth.dto';
import { toSession, toUser } from './auth.mapper';

/** Adaptador HTTP del puerto `AuthRepository`. */
@Injectable()
export class HttpAuthRepository implements AuthRepository {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  async login(email: string, password: string): Promise<Session> {
    const dto = await firstValueFrom(
      this.http.post<TokenResponseDto>(`${this.baseUrl}/auth/login`, {
        email,
        password,
      } satisfies LoginRequestDto),
    );

    return toSession(dto);
  }

  async register(email: string, password: string): Promise<AuthenticatedUser> {
    const dto = await firstValueFrom(
      this.http.post<UserResponseDto>(`${this.baseUrl}/auth/register`, {
        email,
        password,
      } satisfies RegisterRequestDto),
    );

    return toUser(dto);
  }

  async me(): Promise<AuthenticatedUser> {
    const dto = await firstValueFrom(this.http.get<UserResponseDto>(`${this.baseUrl}/auth/me`));
    return toUser(dto);
  }
}
