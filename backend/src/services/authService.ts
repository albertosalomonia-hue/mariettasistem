import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'cambia-este-valor-en-produccion';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';

export type Rol = 'super_admin' | 'rrhh' | 'gerente' | 'supervisor' | 'trabajador';

export interface AppJwtPayload {
  sub: number;
  usuario: string;
  rol: Rol;
  empresa_id: number;
  empleado_id: number | null;
}

export async function hashPassword(plain: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plain, salt);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export function signToken(payload: AppJwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as SignOptions);
}

export function verifyToken(token: string): AppJwtPayload {
  return jwt.verify(token, JWT_SECRET) as unknown as AppJwtPayload;
}
