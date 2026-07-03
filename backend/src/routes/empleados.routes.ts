import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import sharp from 'sharp';
import { z } from 'zod';
import { pool } from '../config/db';
import { requireRole } from '../middleware/auth';

export const empleadosRouter = Router();
const puedeEditar = requireRole('super_admin', 'rrhh', 'gerente');
const puedeVer = requireRole('super_admin', 'rrhh', 'gerente', 'supervisor');

const FOTOS_DIR = path.join(__dirname, '..', '..', 'storage', 'empleados');
fs.mkdirSync(FOTOS_DIR, { recursive: true });

const EXT_POR_MIME: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

const uploadFoto = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (EXT_POR_MIME[file.mimetype]) cb(null, true);
    else cb(new Error('Solo se admiten imágenes JPG, PNG o WEBP'));
  },
});

const empleadoSchema = z.object({
  empresa_id: z.number().int().positive(),
  nombre_completo: z.string().min(3).max(255),
  dni: z.string().min(6).max(20),
  direccion: z.string().min(3).max(255),
  cargo_default: z.string().min(2).max(150),
  email: z.string().email().optional().nullable(),
  telefono: z.string().max(30).optional().nullable(),
});

empleadosRouter.get('/', puedeVer, async (req, res, next) => {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q : null;
    const [rows] = q
      ? await pool.query(
          'SELECT * FROM empleados WHERE nombre_completo LIKE ? OR dni LIKE ? ORDER BY nombre_completo',
          [`%${q}%`, `%${q}%`],
        )
      : await pool.query('SELECT * FROM empleados ORDER BY nombre_completo');
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

empleadosRouter.get('/:id', puedeVer, async (req, res, next) => {
  try {
    const [rows]: any = await pool.query('SELECT * FROM empleados WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Empleado no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

empleadosRouter.post('/', puedeEditar, async (req, res, next) => {
  try {
    const data = empleadoSchema.parse(req.body);
    const [result]: any = await pool.query('INSERT INTO empleados SET ?', [data]);
    const [rows]: any = await pool.query('SELECT * FROM empleados WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

empleadosRouter.put('/:id', puedeEditar, async (req, res, next) => {
  try {
    const data = empleadoSchema.partial().parse(req.body);
    await pool.query('UPDATE empleados SET ? WHERE id = ?', [data, req.params.id]);
    const [rows]: any = await pool.query('SELECT * FROM empleados WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Empleado no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

empleadosRouter.delete('/:id', puedeEditar, async (req, res, next) => {
  try {
    await pool.query('UPDATE empleados SET estado = "cesado" WHERE id = ?', [req.params.id]);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

empleadosRouter.post('/:id/foto', puedeEditar, uploadFoto.single('foto'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Falta el archivo de imagen (campo "foto")' });

    const [rows]: any = await pool.query('SELECT id FROM empleados WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Empleado no encontrado' });

    const dir = path.join(FOTOS_DIR, String(req.params.id));
    fs.mkdirSync(dir, { recursive: true });
    const fotoPath = path.join(dir, 'foto.webp');
    const webpBuffer = await sharp(req.file.buffer)
      .resize(500, 500, { fit: 'cover' })
      .webp({ quality: 85 })
      .toBuffer();
    fs.writeFileSync(fotoPath, webpBuffer);

    await pool.query('UPDATE empleados SET foto_path = ? WHERE id = ?', [fotoPath, req.params.id]);
    res.status(200).json({ ok: true });
  } catch (err) {
    next(err);
  }
});

empleadosRouter.get('/:id/foto', puedeVer, async (req, res, next) => {
  try {
    const [rows]: any = await pool.query('SELECT foto_path FROM empleados WHERE id = ?', [req.params.id]);
    if (!rows.length || !rows[0].foto_path || !fs.existsSync(rows[0].foto_path)) {
      return res.status(404).json({ error: 'Foto no encontrada' });
    }
    res.sendFile(rows[0].foto_path);
  } catch (err) {
    next(err);
  }
});
