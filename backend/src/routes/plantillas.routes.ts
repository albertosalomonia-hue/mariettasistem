import { Router } from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { pool } from '../config/db';
import { detectarVariables } from '../services/plantillaVariables';
import { requireRole } from '../middleware/auth';

export const plantillasRouter = Router();
const puedeEditar = requireRole('super_admin', 'rrhh');
const puedeVer = requireRole('super_admin', 'rrhh', 'gerente', 'supervisor');

const TEMPLATES_DIR = path.join(__dirname, '..', '..', 'storage', 'plantillas');
fs.mkdirSync(TEMPLATES_DIR, { recursive: true });

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const isDocx =
      file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    if (isDocx) cb(null, true);
    else cb(new Error('Solo se admiten archivos .docx'));
  },
});

plantillasRouter.get('/', puedeVer, async (_req, res, next) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, nombre, descripcion, variables_json, version, activa, created_at FROM plantillas WHERE activa = 1 ORDER BY id DESC',
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

plantillasRouter.post('/', puedeEditar, upload.single('archivo'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Falta el archivo .docx (campo "archivo")' });
    if (!req.body.nombre) return res.status(400).json({ error: 'Falta el campo "nombre"' });

    let variables: string[];
    try {
      variables = detectarVariables(req.file.buffer);
    } catch (parseErr: any) {
      return res.status(400).json({ error: parseErr.message });
    }
    if (variables.length === 0) {
      return res.status(400).json({
        error: 'No se detectaron variables {{TAG}} en el documento. Verifica que el .docx use ese formato.',
      });
    }

    const filename = `${Date.now()}-${req.file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_')}`;
    const filePath = path.join(TEMPLATES_DIR, filename);
    fs.writeFileSync(filePath, req.file.buffer);

    const [result]: any = await pool.query('INSERT INTO plantillas SET ?', [
      {
        nombre: req.body.nombre,
        descripcion: req.body.descripcion || null,
        archivo_path: filePath,
        variables_json: JSON.stringify(variables),
      },
    ]);

    const [rows]: any = await pool.query('SELECT * FROM plantillas WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

plantillasRouter.get('/:id', puedeVer, async (req, res, next) => {
  try {
    const [rows]: any = await pool.query('SELECT * FROM plantillas WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Plantilla no encontrada' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});
