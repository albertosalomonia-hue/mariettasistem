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
    const [rows]: any = await pool.query(
      'SELECT id, nombre_completo, usuario, email, rol, empleado_id, must_change_password FROM usuarios WHERE id = ?',
      [user.sub],
    );
    if (!rows.length) {
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }
    res.json(rows[0]);
  } catch (err) {
    sendError(res, err);
  }
}
