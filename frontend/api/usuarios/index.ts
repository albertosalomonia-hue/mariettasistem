import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { pool } from '../_lib/db';
import { getAuthUser, assertRole } from '../_lib/auth';
import { sendError } from '../_lib/errors';
import { hashPassword } from '../_lib/authService';

const COLUMNAS_PUBLICAS =
  'id, empresa_id, empleado_id, nombre_completo, usuario, email, rol, must_change_password, activo, created_at';

const crearSchema = z
  .object({
    empresa_id: z.number().int().positive(),
    empleado_id: z.number().int().positive().optional().nullable(),
    nombre_completo: z.string().min(3).max(255),
    usuario: z.string().min(3).max(100).regex(/^[a-zA-Z0-9._-]+$/, 'Solo letras, números, punto, guion y guion bajo'),
    email: z.string().email().optional().or(z.literal('')),
    password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
    rol: z.enum(['super_admin', 'rrhh', 'gerente', 'supervisor', 'trabajador']),
  })
  .refine((data) => data.rol === 'super_admin' || !!data.empleado_id, {
    message: 'Selecciona el empleado al que pertenece esta cuenta (todo usuario, salvo el super administrador, debe estar vinculado a un empleado)',
    path: ['empleado_id'],
  });

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const user = getAuthUser(req);
    assertRole(user, 'super_admin');

    if (req.method === 'GET') {
      const [rows] = await pool.query(`SELECT ${COLUMNAS_PUBLICAS} FROM usuarios ORDER BY nombre_completo`);
      res.json(rows);
      return;
    }

    if (req.method === 'POST') {
      const data = crearSchema.parse(req.body);
      const email = data.email || null;

      const [existentes]: any = await pool.query(
        'SELECT id FROM usuarios WHERE usuario = ? OR (email IS NOT NULL AND email = ?)',
        [data.usuario, email],
      );
      if (existentes.length) {
        res.status(409).json({ error: 'Ya existe un usuario con ese nombre de usuario o email' });
        return;
      }

      const password_hash = await hashPassword(data.password);
      const [result]: any = await pool.query('INSERT INTO usuarios SET ?', [
        {
          empresa_id: data.empresa_id,
          empleado_id: data.rol === 'super_admin' ? null : data.empleado_id,
          nombre_completo: data.nombre_completo,
          usuario: data.usuario,
          email,
          password_hash,
          rol: data.rol,
          must_change_password: 1,
        },
      ]);

      const [rows]: any = await pool.query(`SELECT ${COLUMNAS_PUBLICAS} FROM usuarios WHERE id = ?`, [
        result.insertId,
      ]);
      res.status(201).json(rows[0]);
      return;
    }

    res.status(405).json({ error: 'Método no permitido' });
  } catch (err) {
    sendError(res, err);
  }
}
