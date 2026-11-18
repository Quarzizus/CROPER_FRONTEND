/** Contrato crudo de `/auth`. No se usa fuera de `infrastructure`. */

export interface LoginRequestDto {
  readonly email: string;
  readonly password: string;
}

export interface RegisterRequestDto {
  readonly email: string;
  readonly password: string;
}

export interface TokenResponseDto {
  readonly accessToken: string;
  readonly tokenType: 'Bearer';
  readonly expiresIn: number;
}

export interface UserResponseDto {
  readonly id: string;
  readonly email: string;
  readonly createdAt: string;
}
