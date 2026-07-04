import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { pool } from '../_lib/db';
import { getAuthUser, assertRole } from '../_lib/auth';
import { sendError } from '../_lib/errors';

const puedeVer = ['super_admin', 'rrhh', 'gerente', 'supervisor'] as const;
const puedeEditar = ['super_admin', 'rrhh', 'gerente'] as const;

const empleadoSchema = z.object({
  empresa_id: z.number().int().positive(),
  nombre_completo: z.string().min(3).max(255),
  dni: z.string().min(6).max(20),
  direccion: z.string().min(3).max(255),
  cargo_default: z.string().min(2).max(150),
  email: z.string().email().optional().nullable(),
  telefono: z.string().max(30).optional().nullable(),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const user = getAuthUser(req);

    if (req.method === 'GET') {
      assertRole(user, ...puedeVer);
      const q = typeof req.query.q === 'string' ? req.query.q : null;
      const [rows] = q
        ? await pool.query(
            'SELECT * FROM empleados WHERE nombre_completo LIKE ? OR dni LIKE ? ORDER BY nombre_completo',
            [`%${q}%`, `%${q}%`],
          )
        : await pool.query('SELECT * FROM empleados ORDER BY nombre_completo');
      res.json(rows);
      return;
    }

    if (req.method === 'POST') {
      assertRole(user, ...puedeEditar);
      const data = empleadoSchema.parse(req.body);
      const [result]: any = await pool.query('INSERT INTO empleados SET ?', [data]);
      const [rows]: any = await pool.query('SELECT * FROM empleados WHERE id = ?', [result.insertId]);
      res.status(201).json(rows[0]);
      return;
    }

    res.status(405).json({ error: 'Método no permitido' });
  } catch (err) {
    sendError(res, err);
  }
}
