import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { pool } from '../_lib/db';
import { verifyPassword, signToken } from '../_lib/authService';
import { sendError } from '../_lib/errors';

const loginSchema = z.object({
  usuario: z.string().min(1),
  password: z.string().min(1),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método no permitido' });
    return;
  }

  try {
    const { usuario: usuarioLogin, password } = loginSchema.parse(req.body);

    const [rows]: any = await pool.query(
      'SELECT * FROM usuarios WHERE usuario = ? AND activo = 1',
      [usuarioLogin],
    );
    const usuario = rows[0];
    if (!usuario) {
      res.status(401).json({ error: 'Credenciales inválidas' });
      return;
    }

    const valido = await verifyPassword(password, usuario.password_hash);
    if (!valido) {
      res.status(401).json({ error: 'Credenciales inválidas' });
      return;
    }

    const token = signToken({
      sub: usuario.id,
      usuario: usuario.usuario,
      rol: usuario.rol,
      empresa_id: usuario.empresa_id,
      empleado_id: usuario.empleado_id,
    });

    res.json({
      token,
      usuario: {
        id: usuario.id,
        nombre_completo: usuario.nombre_completo,
        usuario: usuario.usuario,
        email: usuario.email,
        rol: usuario.rol,
        empleado_id: usuario.empleado_id,
        must_change_password: !!usuario.must_change_password,
      },
    });
  } catch (err) {
    sendError(res, err);
  }
}
