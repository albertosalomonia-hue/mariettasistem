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
    const [rows]: any = await pool.query('SELECT * FROM contratos WHERE id = ?', [req.query.id]);
    if (!rows.length) {
      res.status(404).json({ error: 'Contrato no encontrado' });
      return;
    }
    res.json(rows[0]);
  } catch (err) {
    sendError(res, err);
  }
}
