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
    getAuthUser(req);
    const [rows] = await pool.query('SELECT * FROM empresas WHERE activa = 1 ORDER BY id');
    res.json(rows);
  } catch (err) {
    sendError(res, err);
  }
}
