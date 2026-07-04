import { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';

const MENSAJE_POR_CLAVE_UNICA: Record<string, string> = {
  uq_empleados_dni: 'Ya existe un empleado registrado con ese DNI.',
  uq_usuarios_usuario: 'Ese nombre de usuario ya está en uso.',
  uq_usuarios_email: 'Ese email ya está en uso.',
  uq_usuarios_empleado: 'Ese empleado ya tiene una cuenta de usuario vinculada.',
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    res.status(400).json({ error: 'Datos inválidos', detalle: err.issues });
    return;
  }

  if (err?.code === 'ER_DUP_ENTRY') {
    const claveMatch = /for key '(?:[\w]+\.)?([\w]+)'/.exec(err.sqlMessage || '');
    const clave = claveMatch?.[1];
    const mensaje = (clave && MENSAJE_POR_CLAVE_UNICA[clave]) || 'Ese registro ya existe.';
    res.status(409).json({ error: mensaje });
    return;
  }

  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor', detalle: err?.message });
};
