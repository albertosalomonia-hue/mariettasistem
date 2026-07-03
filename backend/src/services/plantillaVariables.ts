import PizZip from 'pizzip';

// Cualquier cosa entre {{ }} — se usa para detectar tags mal formados (p.ej. alguien
// envolvió el VALOR real en llaves en vez del NOMBRE de la variable).
const ANY_TAG_RE = /\{\{\s*(.*?)\s*\}\}/g;
// Formato válido de nombre de variable: MAYÚSCULAS, dígitos y guion bajo.
const VALID_TAG_NAME_RE = /^[A-Z0-9_]+$/;

/**
 * Extrae las variables {{TAG}} de un .docx leyendo directamente los <w:t> de
 * word/document.xml. No usa el parser de docxtemplater aquí porque solo
 * necesitamos la lista de nombres, no renderizar.
 *
 * Valida que cada {{...}} tenga formato de nombre de variable (MAYUSCULAS_CON_GUION_BAJO).
 * Si alguien envolvió el valor real entre llaves (p.ej. {{TORIBIO TARICUARIMA MALAFAYA}}
 * en vez de {{TRABAJADOR_NOMBRE}}), el error lo señala explícitamente en vez de aceptar
 * la plantilla a medias y fallar silenciosamente al generar el contrato.
 */
export function detectarVariables(buffer: Buffer): string[] {
  const zip = new PizZip(buffer);
  const documentXml = zip.file('word/document.xml')?.asText();
  if (!documentXml) {
    throw new Error('El archivo no es un .docx válido (no contiene word/document.xml).');
  }

  const plain = [...documentXml.matchAll(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g)]
    .map((m) => m[1])
    .join('');

  const variables = new Set<string>();
  const invalidas = new Set<string>();
  let match: RegExpExecArray | null;
  ANY_TAG_RE.lastIndex = 0;
  while ((match = ANY_TAG_RE.exec(plain))) {
    const contenido = match[1];
    if (VALID_TAG_NAME_RE.test(contenido)) {
      variables.add(contenido);
    } else {
      invalidas.add(contenido);
    }
  }

  if (invalidas.size > 0) {
    const ejemplos = Array.from(invalidas).slice(0, 3).map((v) => `{{${v}}}`).join(', ');
    throw new Error(
      `La plantilla tiene ${invalidas.size} etiqueta(s) con formato inválido, por ejemplo: ${ejemplos}. ` +
        'Las llaves deben envolver el NOMBRE de la variable en MAYÚSCULAS_CON_GUION_BAJO ' +
        '(ej. {{TRABAJADOR_NOMBRE}}), no el valor real del contrato de referencia.',
    );
  }

  return Array.from(variables).sort();
}
