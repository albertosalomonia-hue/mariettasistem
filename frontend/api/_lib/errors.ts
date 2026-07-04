import type { VercelResponse } from '@vercel/node';
import { ZodError } from 'zod';
import { AuthError, ForbiddenError } from './auth';

const MENSAJE_POR_CLAVE_UNICA: Record<string, string> = {
  uq_empleados_dni: 'Ya existe un empleado registrado con ese DNI.',
  uq_usuarios_usuario: 'Ese nombre de usuario ya está en uso.',
  uq_usuarios_email: 'Ese email ya está en uso.',
  uq_usuarios_empleado: 'Ese empleado ya tiene una cuenta de usuario vinculada.',
};

export function sendError(res: VercelResponse, err: unknown): void {
  if (err instanceof AuthError) {
    res.status(401).json({ error: err.message });
    return;
  }

  if (err instanceof ForbiddenError) {
    res.status(403).json({ error: err.message });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({ error: 'Datos inválidos', detalle: err.issues });
    return;
  }

  const mysqlErr = err as { code?: string; sqlMessage?: string; message?: string };
  if (mysqlErr?.code === 'ER_DUP_ENTRY') {
    const claveMatch = /for key '(?:[\w]+\.)?([\w]+)'/.exec(mysqlErr.sqlMessage || '');
    const clave = claveMatch?.[1];
    const mensaje = (clave && MENSAJE_POR_CLAVE_UNICA[clave]) || 'Ese registro ya existe.';
    res.status(409).json({ error: mensaje });
    return;
  }

  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor', detalle: mysqlErr?.message });
}
