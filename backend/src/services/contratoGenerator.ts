import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { sueldoALetras } from './numeroALetras';
import { fechaLarga } from './fechas';

const GOTENBERG_URL = process.env.GOTENBERG_URL || 'http://localhost:3000';

export interface EmpresaData {
  razon_social: string;
  ruc: string;
  direccion_fiscal: string;
  representante_nombre: string;
  representante_dni: string;
}

export interface EmpleadoData {
  nombre_completo: string;
  dni: string;
  direccion: string;
}

export interface ContratoInput {
  cargo: string;
  duracion: string;
  fecha_inicio: string; // ISO yyyy-mm-dd
  fecha_fin: string; // ISO yyyy-mm-dd
  sueldo_numero: number;
}

export function construirDatosPlantilla(
  empresa: EmpresaData,
  empleado: EmpleadoData,
  contrato: ContratoInput,
) {
  return {
    EMPRESA_RAZON_SOCIAL: empresa.razon_social,
    EMPRESA_RUC: empresa.ruc,
    EMPRESA_DIRECCION_FISCAL: empresa.direccion_fiscal,
    EMPRESA_REPRESENTANTE_NOMBRE: empresa.representante_nombre,
    EMPRESA_REPRESENTANTE_DNI: empresa.representante_dni,
    TRABAJADOR_NOMBRE: empleado.nombre_completo,
    TRABAJADOR_DNI: empleado.dni,
    TRABAJADOR_DIRECCION: empleado.direccion,
    CARGO: contrato.cargo,
    DURACION: contrato.duracion,
    FECHA_INICIO: fechaLarga(contrato.fecha_inicio),
    FECHA_FIN: fechaLarga(contrato.fecha_fin),
    SUELDO_NUMERO: contrato.sueldo_numero.toFixed(2),
    SUELDO_LETRAS: sueldoALetras(contrato.sueldo_numero),
  };
}

export function renderDocx(plantillaBuffer: Buffer, datos: Record<string, string>): Buffer {
  const zip = new PizZip(plantillaBuffer);
  const doc = new Docxtemplater(zip, {
    delimiters: { start: '{{', end: '}}' },
    paragraphLoop: true,
    linebreaks: true,
  });

  doc.render(datos);

  return doc.getZip().generate({ type: 'nodebuffer' });
}

export function hashSha256(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

// docxRelPath/pdfRelPath son relativos a storageDir (CONTRATOS_DIR) y son lo
// que se persiste en la BD — nunca la ruta absoluta. La ruta absoluta depende
// de en qué máquina/contenedor corre el proceso, y guardar la absoluta rompe
// el acceso al archivo apenas el backend se muda de servidor (ver contrato
// generado en Windows durante desarrollo, luego movido al VPS Linux).
export function guardarArchivosContrato(
  storageDir: string,
  contratoId: number,
  docxBuffer: Buffer,
): { docxPath: string; pdfPath: string; docxRelPath: string; pdfRelPath: string; dir: string } {
  const relDir = String(contratoId);
  const dir = path.join(storageDir, relDir);
  fs.mkdirSync(dir, { recursive: true });

  const docxRelPath = path.join(relDir, 'contrato.docx');
  const pdfRelPath = path.join(relDir, 'contrato.pdf');
  const docxPath = path.join(storageDir, docxRelPath);
  const pdfPath = path.join(storageDir, pdfRelPath);
  fs.writeFileSync(docxPath, docxBuffer);

  return { docxPath, pdfPath, docxRelPath, pdfRelPath, dir };
}

/**
 * Convierte el .docx a PDF llamando a un contenedor Gotenberg (LibreOffice headless
 * detrás de una API HTTP). Requiere el servicio Gotenberg corriendo y accesible en
 * GOTENBERG_URL (docker-compose en el servidor Debian).
 */
export async function convertirAPdfConGotenberg(docxPath: string, pdfPath: string): Promise<void> {
  const docxBuffer = fs.readFileSync(docxPath);
  const form = new FormData();
  form.append(
    'files',
    new Blob([docxBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    }),
    path.basename(docxPath),
  );

  const response = await fetch(`${GOTENBERG_URL}/forms/libreoffice/convert`, {
    method: 'POST',
    body: form,
    signal: AbortSignal.timeout(60_000),
  });

  if (!response.ok) {
    const detalle = await response.text().catch(() => '');
    throw new Error(`Gotenberg respondió ${response.status}: ${detalle}`);
  }

  const pdfBytes = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(pdfPath, pdfBytes);
}
