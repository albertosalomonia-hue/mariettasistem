import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { pool } from '../_lib/db';
import { getAuthUser, assertRole } from '../_lib/auth';
import { sendError } from '../_lib/errors';
import { hashPassword } from '../_lib/authService';

const COLUMNAS_PUBLICAS =
  'id, empresa_id, empleado_id, nombre_completo, usuario, email, rol, must_change_password, activo, created_at';

const actualizarSchema = z.object({
  nombre_completo: z.string().min(3).max(255).optional(),
  empleado_id: z.number().int().positive().nullable().optional(),
  rol: z.enum(['super_admin', 'rrhh', 'gerente', 'supervisor', 'trabajador']).optional(),
  activo: z.boolean().optional(),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres').optional(),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const user = getAuthUser(req);
    assertRole(user, 'super_admin');
    const id = req.query.id as string;

    if (req.method === 'PUT') {
      const data = actualizarSchema.parse(req.body);

      if (String(user.sub) === id && (data.rol || data.activo === false)) {
        res.status(400).json({ error: 'No puedes cambiar tu propio rol ni desactivar tu propia cuenta' });
        return;
      }

      if (data.rol || data.empleado_id !== undefined) {
        const [actualRows]: any = await pool.query('SELECT rol, empleado_id FROM usuarios WHERE id = ?', [id]);
        if (!actualRows.length) {
          res.status(404).json({ error: 'Usuario no encontrado' });
          return;
        }
        const rolFinal = data.rol ?? actualRows[0].rol;
        const empleadoIdFinal = data.empleado_id !== undefined ? data.empleado_id : actualRows[0].empleado_id;
        if (rolFinal !== 'super_admin' && !empleadoIdFinal) {
          res.status(400).json({
            error: 'Este usuario debe estar vinculado a un empleado (excepto el super administrador)',
          });
          return;
        }
      }

      const { password, ...resto } = data;
      const cambios: Record<string, unknown> = { ...resto };
      if (password) {
        cambios.password_hash = await hashPassword(password);
        cambios.must_change_password = 1;
      }

      if (Object.keys(cambios).length > 0) {
        await pool.query('UPDATE usuarios SET ? WHERE id = ?', [cambios, id]);
      }

      const [rows]: any = await pool.query(`SELECT ${COLUMNAS_PUBLICAS} FROM usuarios WHERE id = ?`, [id]);
      if (!rows.length) {
        res.status(404).json({ error: 'Usuario no encontrado' });
        return;
      }
      res.json(rows[0]);
      return;
    }

    if (req.method === 'DELETE') {
      if (String(user.sub) === id) {
        res.status(400).json({ error: 'No puedes desactivar tu propia cuenta' });
        return;
      }
      await pool.query('UPDATE usuarios SET activo = 0 WHERE id = ?', [id]);
      res.status(204).send(null);
      return;
    }

    res.status(405).json({ error: 'Método no permitido' });
  } catch (err) {
    sendError(res, err);
  }
}
