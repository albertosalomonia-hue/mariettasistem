import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../config/db';
import { requireRole } from '../middleware/auth';
import { hashPassword } from '../services/authService';

export const usuariosRouter = Router();

const soloSuperAdmin = requireRole('super_admin');

const COLUMNAS_PUBLICAS =
  'id, empresa_id, empleado_id, nombre_completo, usuario, email, rol, must_change_password, activo, created_at';

const crearSchema = z
  .object({
    empresa_id: z.number().int().positive(),
    empleado_id: z.number().int().positive().optional().nullable(),
    nombre_completo: z.string().min(3).max(255),
    usuario: z.string().min(3).max(100).regex(/^[a-zA-Z0-9._-]+$/, 'Solo letras, números, punto, guion y guion bajo'),
    email: z.string().email().optional().or(z.literal('')),
    password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
    rol: z.enum(['super_admin', 'rrhh', 'gerente', 'supervisor', 'trabajador']),
  })
  .refine((data) => data.rol !== 'trabajador' || !!data.empleado_id, {
    message: 'Selecciona el empleado al que pertenece esta cuenta de trabajador',
    path: ['empleado_id'],
  });

const actualizarSchema = z.object({
  nombre_completo: z.string().min(3).max(255).optional(),
  empleado_id: z.number().int().positive().nullable().optional(),
  rol: z.enum(['super_admin', 'rrhh', 'gerente', 'supervisor', 'trabajador']).optional(),
  activo: z.boolean().optional(),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres').optional(),
});

usuariosRouter.get('/', soloSuperAdmin, async (_req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT ${COLUMNAS_PUBLICAS} FROM usuarios ORDER BY nombre_completo`,
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

usuariosRouter.post('/', soloSuperAdmin, async (req, res, next) => {
  try {
    const data = crearSchema.parse(req.body);
    const email = data.email || null;

    const [existentes]: any = await pool.query(
      'SELECT id FROM usuarios WHERE usuario = ? OR (email IS NOT NULL AND email = ?)',
      [data.usuario, email],
    );
    if (existentes.length) {
      return res.status(409).json({ error: 'Ya existe un usuario con ese nombre de usuario o email' });
    }

    const password_hash = await hashPassword(data.password);
    const [result]: any = await pool.query('INSERT INTO usuarios SET ?', [
      {
        empresa_id: data.empresa_id,
        empleado_id: data.rol === 'trabajador' ? data.empleado_id : null,
        nombre_completo: data.nombre_completo,
        usuario: data.usuario,
        email,
        password_hash,
        rol: data.rol,
        must_change_password: 1,
      },
    ]);

    const [rows]: any = await pool.query(
      `SELECT ${COLUMNAS_PUBLICAS} FROM usuarios WHERE id = ?`,
      [result.insertId],
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

usuariosRouter.put('/:id', soloSuperAdmin, async (req, res, next) => {
  try {
    const data = actualizarSchema.parse(req.body);
    const { password, ...resto } = data;

    const cambios: Record<string, unknown> = { ...resto };
    if (password) {
      cambios.password_hash = await hashPassword(password);
      cambios.must_change_password = 1;
    }

    if (Object.keys(cambios).length > 0) {
      await pool.query('UPDATE usuarios SET ? WHERE id = ?', [cambios, req.params.id]);
    }

    const [rows]: any = await pool.query(
      `SELECT ${COLUMNAS_PUBLICAS} FROM usuarios WHERE id = ?`,
      [req.params.id],
    );
    if (!rows.length) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

usuariosRouter.delete('/:id', soloSuperAdmin, async (req, res, next) => {
  try {
    if (String(req.user!.sub) === req.params.id) {
      return res.status(400).json({ error: 'No puedes desactivar tu propia cuenta' });
    }
    await pool.query('UPDATE usuarios SET activo = 0 WHERE id = ?', [req.params.id]);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
