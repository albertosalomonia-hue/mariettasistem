import fs from 'fs';
import path from 'path';
import { pool } from '../config/db';
import {
  construirDatosPlantilla,
  renderDocx,
  hashSha256,
  guardarArchivosContrato,
  convertirAPdfConGotenberg,
} from '../services/contratoGenerator';
import { TEMPLATES_DIR } from '../routes/plantillas.routes';

const CONTRATOS_DIR = path.join(__dirname, '..', '..', 'storage', 'contracts');

// Reconstruye el .docx/.pdf de un contrato a partir de la plantilla y los
// datos guardados en la BD, para casos donde el archivo original se perdió
// (p. ej. contratos generados en una máquina de desarrollo cuyo storage
// nunca llegó al servidor). NO recupera la firma: si el contrato ya estaba
// firmado, el estado se resetea a 'generado' porque el PDF firmado original
// no se puede reconstruir sin la imagen de la firma perdida.
function toIsoDate(value: Date | string): string {
  if (typeof value === 'string') return value.slice(0, 10);
  const y = value.getUTCFullYear();
  const m = String(value.getUTCMonth() + 1).padStart(2, '0');
  const d = String(value.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

async function main() {
  const contratoId = Number(process.argv[2]);
  if (!contratoId) {
    throw new Error('Uso: node dist/scripts/regenerarContrato.js <contrato_id>');
  }

  const [contratoRows]: any = await pool.query('SELECT * FROM contratos WHERE id = ?', [contratoId]);
  if (!contratoRows.length) throw new Error(`No existe el contrato ${contratoId}`);
  const contrato = contratoRows[0];

  const [empleadoRows]: any = await pool.query('SELECT * FROM empleados WHERE id = ?', [
    contrato.empleado_id,
  ]);
  const [empresaRows]: any = await pool.query('SELECT * FROM empresas WHERE id = ?', [
    contrato.empresa_id,
  ]);
  const [plantillaRows]: any = await pool.query('SELECT * FROM plantillas WHERE id = ?', [
    contrato.plantilla_id,
  ]);
  if (!empleadoRows.length || !empresaRows.length || !plantillaRows.length) {
    throw new Error('Faltan datos relacionados (empleado/empresa/plantilla) para regenerar el contrato');
  }
  const empleado = empleadoRows[0];
  const empresa = empresaRows[0];
  const plantilla = plantillaRows[0];

  const plantillaBuffer = fs.readFileSync(path.join(TEMPLATES_DIR, plantilla.archivo_path));

  const datos = construirDatosPlantilla(empresa, empleado, {
    cargo: contrato.cargo,
    duracion: contrato.duracion,
    fecha_inicio: toIsoDate(contrato.fecha_inicio),
    fecha_fin: toIsoDate(contrato.fecha_fin),
    sueldo_numero: Number(contrato.sueldo_numero),
  });

  const docxBuffer = renderDocx(plantillaBuffer, datos);
  const { docxPath, pdfPath, docxRelPath, pdfRelPath } = guardarArchivosContrato(
    CONTRATOS_DIR,
    contratoId,
    docxBuffer,
  );

  await convertirAPdfConGotenberg(docxPath, pdfPath);
  const pdfHash = hashSha256(fs.readFileSync(pdfPath));

  await pool.query(
    `UPDATE contratos SET
      docx_path = ?, pdf_path = ?, pdf_hash_sha256 = ?,
      estado = 'generado',
      firma_path = NULL, firmado_en = NULL, firma_ip = NULL, firma_user_agent = NULL
     WHERE id = ?`,
    [docxRelPath, pdfRelPath, pdfHash, contratoId],
  );

  console.log(`Contrato ${contratoId} regenerado SIN firma (el original firmado no se pudo recuperar).`);
  console.log(`docx: ${docxPath}`);
  console.log(`pdf:  ${pdfPath}`);
  console.log('El trabajador va a tener que volver a firmarlo.');
}

main()
  .then(() => pool.end())
  .catch(async (err) => {
    console.error(err);
    await pool.end();
    process.exit(1);
  });
