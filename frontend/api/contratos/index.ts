import type { VercelRequest, VercelResponse } from '@vercel/node';
import { pool } from '../_lib/db';
import { getAuthUser, assertRole } from '../_lib/auth';
import { sendError } from '../_lib/errors';

const esStaffAdministrativo = ['super_admin', 'rrhh', 'gerente', 'supervisor'] as const;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Método no permitido' });
    return;
  }

  try {
    const user = getAuthUser(req);
    assertRole(user, ...esStaffAdministrativo);
    const [rows] = await pool.query(
      `SELECT c.*, e.nombre_completo AS empleado_nombre, p.nombre AS plantilla_nombre
       FROM contratos c
       JOIN empleados e ON e.id = c.empleado_id
       JOIN plantillas p ON p.id = c.plantilla_id
       ORDER BY c.id DESC`,
    );
    res.json(rows);
  } catch (err) {
    sendError(res, err);
  }
}
