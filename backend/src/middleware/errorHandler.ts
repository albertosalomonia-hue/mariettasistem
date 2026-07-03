import { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    res.status(400).json({ error: 'Datos inválidos', detalle: err.issues });
    return;
  }

  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor', detalle: err?.message });
};
