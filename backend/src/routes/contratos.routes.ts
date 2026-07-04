import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { z } from 'zod';
import { pool } from '../config/db';
import {
  construirDatosPlantilla,
  renderDocx,
  hashSha256,
  guardarArchivosContrato,
  convertirAPdfConWord,
} from '../services/contratoGenerator';
import { estamparFirmaEnPdf } from '../services/firmaService';
import { fechaHoraCorta } from '../services/fechas';
import { requireRole } from '../middleware/auth';

export const contratosRouter = Router();
const puedeGenerar = requireRole('super_admin', 'rrhh', 'gerente');
const esStaffAdministrativo = requireRole('super_admin', 'rrhh', 'gerente', 'supervisor');

const CONTRATOS_DIR = path.join(__dirname, '..', '..', 'storage', 'contracts');
fs.mkdirSync(CONTRATOS_DIR, { recursive: true });

const uploadFirma = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = file.mimetype === 'image/png' || file.mimetype === 'image/jpeg';
    if (ok) cb(null, true);
    else cb(new Error('La firma debe ser una imagen PNG o JPG'));
  },
});

const generarSchema = z.object({
  plantilla_id: z.number().int().positive(),
  empleado_id: z.number().int().positive(),
  cargo: z.string().min(2).max(150).optional(),
  duracion: z.string().min(1).max(100),
  fecha_inicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  fecha_fin: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  sueldo_numero: z.number().positive(),
});

contratosRouter.get('/', esStaffAdministrativo, async (_req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT c.*, e.nombre_completo AS empleado_nombre, p.nombre AS plantilla_nombre
       FROM contratos c
       JOIN empleados e ON e.id = c.empleado_id
       JOIN plantillas p ON p.id = c.plantilla_id
       ORDER BY c.id DESC`,
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// Contrato(s) del trabajador logueado (portal del trabajador). Debe ir antes de "/:id".
contratosRouter.get('/mio', async (req, res, next) => {
  try {
    if (!req.user!.empleado_id) {
      return res.status(404).json({ error: 'Esta cuenta no está vinculada a ningún empleado' });
    }

    const [rows]: any = await pool.query(
      `SELECT c.*, e.nombre_completo AS empleado_nombre, p.nombre AS plantilla_nombre
       FROM contratos c
       JOIN empleados e ON e.id = c.empleado_id
       JOIN plantillas p ON p.id = c.plantilla_id
       WHERE c.empleado_id = ?
       ORDER BY c.created_at DESC
       LIMIT 1`,
      [req.user!.empleado_id],
    );
    if (!rows.length) return res.status(404).json({ error: 'Todavía no tienes un contrato generado' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

contratosRouter.get('/:id', esStaffAdministrativo, async (req, res, next) => {
  try {
    const [rows]: any = await pool.query('SELECT * FROM contratos WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Contrato no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

contratosRouter.post('/', puedeGenerar, async (req, res, next) => {
  try {
    const body = generarSchema.parse(req.body);

    const [empleadoRows]: any = await pool.query('SELECT * FROM empleados WHERE id = ?', [
      body.empleado_id,
    ]);
    if (!empleadoRows.length) return res.status(404).json({ error: 'Empleado no encontrado' });
    const empleado = empleadoRows[0];

    const [empresaRows]: any = await pool.query('SELECT * FROM empresas WHERE id = ?', [
      empleado.empresa_id,
    ]);
    if (!empresaRows.length) return res.status(404).json({ error: 'Empresa del empleado no encontrada' });
    const empresa = empresaRows[0];

    const [plantillaRows]: any = await pool.query('SELECT * FROM plantillas WHERE id = ?', [
      body.plantilla_id,
    ]);
    if (!plantillaRows.length) return res.status(404).json({ error: 'Plantilla no encontrada' });
    const plantilla = plantillaRows[0];

    const plantillaBuffer = fs.readFileSync(plantilla.archivo_path);

    const datos = construirDatosPlantilla(empresa, empleado, {
      cargo: body.cargo || empleado.cargo_default,
      duracion: body.duracion,
      fecha_inicio: body.fecha_inicio,
      fecha_fin: body.fecha_fin,
      sueldo_numero: body.sueldo_numero,
    });

    const docxBuffer = renderDocx(plantillaBuffer, datos);

    const [insertResult]: any = await pool.query('INSERT INTO contratos SET ?', [
      {
        plantilla_id: plantilla.id,
        empleado_id: empleado.id,
        empresa_id: empresa.id,
        cargo: datos.CARGO,
        duracion: body.duracion,
        fecha_inicio: body.fecha_inicio,
        fecha_fin: body.fecha_fin,
        sueldo_numero: body.sueldo_numero,
        sueldo_letras: datos.SUELDO_LETRAS,
        estado: 'generado',
      },
    ]);
    const contratoId = insertResult.insertId;

    const { docxPath, pdfPath } = guardarArchivosContrato(CONTRATOS_DIR, contratoId, docxBuffer);

    try {
      await convertirAPdfConWord(docxPath, pdfPath);
    } catch (convErr: any) {
      await pool.query('DELETE FROM contratos WHERE id = ?', [contratoId]);
      return res.status(502).json({
        error: 'No se pudo generar el PDF del contrato (conversión vía Word falló).',
        detalle: convErr?.message,
      });
    }

    const pdfHash = hashSha256(fs.readFileSync(pdfPath));

    await pool.query('UPDATE contratos SET docx_path = ?, pdf_path = ?, pdf_hash_sha256 = ? WHERE id = ?', [
      docxPath,
      pdfPath,
      pdfHash,
      contratoId,
    ]);

    const [rows]: any = await pool.query('SELECT * FROM contratos WHERE id = ?', [contratoId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

const ROLES_ADMIN = ['super_admin', 'rrhh', 'gerente', 'supervisor'];

async function puedeVerContrato(req: any, contrato: any): Promise<boolean> {
  if (ROLES_ADMIN.includes(req.user.rol)) return true;
  return req.user.empleado_id != null && req.user.empleado_id === contrato.empleado_id;
}

contratosRouter.get('/:id/pdf', async (req, res, next) => {
  try {
    const [rows]: any = await pool.query('SELECT * FROM contratos WHERE id = ?', [req.params.id]);
    if (!rows.length || !rows[0].pdf_path) return res.status(404).json({ error: 'PDF no encontrado' });
    if (!(await puedeVerContrato(req, rows[0]))) {
      return res.status(403).json({ error: 'No tienes permiso para ver este contrato' });
    }
    res.download(rows[0].pdf_path, `contrato-${req.params.id}.pdf`);
  } catch (err) {
    next(err);
  }
});

contratosRouter.get('/:id/docx', async (req, res, next) => {
  try {
    const [rows]: any = await pool.query('SELECT * FROM contratos WHERE id = ?', [req.params.id]);
    if (!rows.length || !rows[0].docx_path) return res.status(404).json({ error: 'DOCX no encontrado' });
    if (!(await puedeVerContrato(req, rows[0]))) {
      return res.status(403).json({ error: 'No tienes permiso para ver este contrato' });
    }
    res.download(rows[0].docx_path, `contrato-${req.params.id}.docx`);
  } catch (err) {
    next(err);
  }
});

contratosRouter.post('/:id/firmar', uploadFirma.single('firma'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Falta la imagen de la firma (campo "firma")' });

    const [rows]: any = await pool.query('SELECT * FROM contratos WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Contrato no encontrado' });
    const contrato = rows[0];

    const esDueño = req.user!.empleado_id != null && req.user!.empleado_id === contrato.empleado_id;
    if (!esDueño) {
      return res.status(403).json({ error: 'Solo el trabajador dueño del contrato puede firmarlo' });
    }
    if (contrato.estado === 'firmado') {
      return res.status(400).json({ error: 'Este contrato ya fue firmado' });
    }
    if (!contrato.pdf_path || !fs.existsSync(contrato.pdf_path)) {
      return res.status(400).json({ error: 'El contrato todavía no tiene un PDF generado' });
    }

    const dir = path.join(CONTRATOS_DIR, String(contrato.id));
    fs.mkdirSync(dir, { recursive: true });
    const esJpg = req.file.mimetype === 'image/jpeg';
    const firmaPath = path.join(dir, esJpg ? 'firma.jpg' : 'firma.png');
    fs.writeFileSync(firmaPath, req.file.buffer);

    const fechaFirma = new Date();
    const pdfOriginal = fs.readFileSync(contrato.pdf_path);
    const pdfFirmado = await estamparFirmaEnPdf(pdfOriginal, req.file.buffer, fechaHoraCorta(fechaFirma));
    fs.writeFileSync(contrato.pdf_path, pdfFirmado);

    const nuevoHash = hashSha256(pdfFirmado);
    const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '';

    await pool.query(
      `UPDATE contratos SET
        estado = 'firmado',
        firma_path = ?,
        firmado_en = ?,
        firma_ip = ?,
        firma_user_agent = ?,
        pdf_hash_sha256 = ?
       WHERE id = ?`,
      [firmaPath, fechaFirma, ip, req.get('user-agent') || '', nuevoHash, contrato.id],
    );

    const [actualizado]: any = await pool.query('SELECT * FROM contratos WHERE id = ?', [contrato.id]);
    res.json(actualizado[0]);
  } catch (err) {
    next(err);
  }
});

contratosRouter.delete('/:id', puedeGenerar, async (req, res, next) => {
  try {
    const [rows]: any = await pool.query('SELECT * FROM contratos WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Contrato no encontrado' });
    const contrato = rows[0];

    await pool.query('DELETE FROM contratos WHERE id = ?', [req.params.id]);

    const dir = path.join(CONTRATOS_DIR, String(contrato.id));
    fs.rmSync(dir, { recursive: true, force: true });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
