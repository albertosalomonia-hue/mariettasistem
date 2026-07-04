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
    const id = req.query.id as string;

    if (req.method === 'GET') {
      assertRole(user, ...puedeVer);
      const [rows]: any = await pool.query('SELECT * FROM empleados WHERE id = ?', [id]);
      if (!rows.length) {
        res.status(404).json({ error: 'Empleado no encontrado' });
        return;
      }
      res.json(rows[0]);
      return;
    }

    if (req.method === 'PUT') {
      assertRole(user, ...puedeEditar);
      const data = empleadoSchema.partial().parse(req.body);
      await pool.query('UPDATE empleados SET ? WHERE id = ?', [data, id]);
      const [rows]: any = await pool.query('SELECT * FROM empleados WHERE id = ?', [id]);
      if (!rows.length) {
        res.status(404).json({ error: 'Empleado no encontrado' });
        return;
      }
      res.json(rows[0]);
      return;
    }

    if (req.method === 'DELETE') {
      assertRole(user, ...puedeEditar);
      await pool.query('UPDATE empleados SET estado = "cesado" WHERE id = ?', [id]);
      res.status(204).send(null);
      return;
    }

    res.status(405).json({ error: 'Método no permitido' });
  } catch (err) {
    sendError(res, err);
  }
}
