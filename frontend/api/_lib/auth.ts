import type { VercelRequest } from '@vercel/node';
import { verifyToken, type AppJwtPayload, type Rol } from './authService';

export class AuthError extends Error {
  constructor(message = 'No autenticado') {
    super(message);
    this.name = 'AuthError';
  }
}

export class ForbiddenError extends Error {
  constructor(message = 'No tienes permiso para esta acción') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export function getAuthUser(req: VercelRequest): AppJwtPayload {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) throw new AuthError();

  try {
    return verifyToken(token);
  } catch {
    throw new AuthError('Sesión inválida o expirada');
  }
}

export function assertRole(user: AppJwtPayload, ...roles: Rol[]): void {
  if (!roles.includes(user.rol)) throw new ForbiddenError();
}
