import type { VercelRequest, VercelResponse } from '@vercel/node';
import { pool } from '../_lib/db';
import { getAuthUser, assertRole } from '../_lib/auth';
import { sendError } from '../_lib/errors';

const puedeVer = ['super_admin', 'rrhh', 'gerente', 'supervisor'] as const;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Método no permitido' });
    return;
  }

  try {
    const user = getAuthUser(req);
    assertRole(user, ...puedeVer);
    const [rows]: any = await pool.query('SELECT * FROM plantillas WHERE id = ?', [req.query.id]);
    if (!rows.length) {
      res.status(404).json({ error: 'Plantilla no encontrada' });
      return;
    }
    res.json(rows[0]);
  } catch (err) {
    sendError(res, err);
  }
}
