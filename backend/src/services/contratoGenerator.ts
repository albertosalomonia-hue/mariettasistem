import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execFile } from 'child_process';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { sueldoALetras } from './numeroALetras';
import { fechaLarga } from './fechas';

const DOCX_TO_PDF_SCRIPT = path.join(__dirname, '..', '..', 'scripts', 'docx-to-pdf.ps1');

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

export function guardarArchivosContrato(
  storageDir: string,
  contratoId: number,
  docxBuffer: Buffer,
): { docxPath: string; pdfPath: string; dir: string } {
  const dir = path.join(storageDir, String(contratoId));
  fs.mkdirSync(dir, { recursive: true });

  const docxPath = path.join(dir, 'contrato.docx');
  const pdfPath = path.join(dir, 'contrato.pdf');
  fs.writeFileSync(docxPath, docxBuffer);

  return { docxPath, pdfPath, dir };
}

/**
 * Convierte el .docx a PDF usando Word instalado localmente vía automatización COM
 * (no requiere LibreOffice). Solo funciona en Windows con Microsoft Word instalado.
 */
export function convertirAPdfConWord(docxPath: string, pdfPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    execFile(
      'powershell.exe',
      [
        '-NoProfile',
        '-ExecutionPolicy',
        'Bypass',
        '-File',
        DOCX_TO_PDF_SCRIPT,
        '-InputPath',
        docxPath,
        '-OutputPath',
        pdfPath,
      ],
      { timeout: 60_000 },
      (error, _stdout, stderr) => {
        if (error) {
          reject(new Error(stderr || error.message));
          return;
        }
        resolve();
      },
    );
  });
}
