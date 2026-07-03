import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../config/db';
import { verifyPassword, signToken } from '../services/authService';
import { requireAuth } from '../middleware/auth';

export const authRouter = Router();

const loginSchema = z.object({
  usuario: z.string().min(1),
  password: z.string().min(1),
});

authRouter.post('/login', async (req, res, next) => {
  try {
    const { usuario: usuarioLogin, password } = loginSchema.parse(req.body);

    const [rows]: any = await pool.query(
      'SELECT * FROM usuarios WHERE usuario = ? AND activo = 1',
      [usuarioLogin],
    );
    const usuario = rows[0];
    if (!usuario) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const valido = await verifyPassword(password, usuario.password_hash);
    if (!valido) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
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
    next(err);
  }
});

authRouter.get('/me', requireAuth, async (req, res, next) => {
  try {
    const [rows]: any = await pool.query(
      'SELECT id, nombre_completo, usuario, email, rol, empleado_id, must_change_password FROM usuarios WHERE id = ?',
      [req.user!.sub],
    );
    if (!rows.length) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});
