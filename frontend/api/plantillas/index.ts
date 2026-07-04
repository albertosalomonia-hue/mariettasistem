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
    const [rows] = await pool.query(
      'SELECT id, nombre, descripcion, variables_json, version, activa, created_at FROM plantillas WHERE activa = 1 ORDER BY id DESC',
    );
    res.json(rows);
  } catch (err) {
    sendError(res, err);
  }
}
