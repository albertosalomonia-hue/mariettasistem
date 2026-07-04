import type { VercelRequest, VercelResponse } from '@vercel/node';
import { pool } from '../_lib/db';
import { getAuthUser } from '../_lib/auth';
import { sendError } from '../_lib/errors';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Método no permitido' });
    return;
  }

  try {
    const user = getAuthUser(req);
    if (!user.empleado_id) {
      res.status(404).json({ error: 'Esta cuenta no está vinculada a ningún empleado' });
      return;
    }

    const [rows]: any = await pool.query(
      `SELECT c.*, e.nombre_completo AS empleado_nombre, p.nombre AS plantilla_nombre
       FROM contratos c
       JOIN empleados e ON e.id = c.empleado_id
       JOIN plantillas p ON p.id = c.plantilla_id
       WHERE c.empleado_id = ?
       ORDER BY c.created_at DESC
       LIMIT 1`,
      [user.empleado_id],
    );
    if (!rows.length) {
      res.status(404).json({ error: 'Todavía no tienes un contrato generado' });
      return;
    }
    res.json(rows[0]);
  } catch (err) {
    sendError(res, err);
  }
}
