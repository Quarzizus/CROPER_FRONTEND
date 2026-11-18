import type { AuthenticatedUser, Session } from '../domain/session';
import type { TokenResponseDto, UserResponseDto } from './auth.dto';

/** `expiresIn` llega en segundos; la sesión guarda el instante absoluto. */
export function toSession(dto: TokenResponseDto, now: number = Date.now()): Session {
  return {
    accessToken: dto.accessToken,
    tokenType: 'Bearer',
    expiresAt: now + dto.expiresIn * 1000,
  };
}

export function toUser(dto: UserResponseDto): AuthenticatedUser {
  return { id: dto.id, email: dto.email, createdAt: dto.createdAt };
}
