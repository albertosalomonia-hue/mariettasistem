import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

/**
 * Fallback si por algún motivo no se puede ubicar el texto "TRABAJADOR" en el PDF
 * (p.ej. si algún día cambia la plantilla). Son las coordenadas medidas sobre el
 * formato legal actual, expresadas como fracción de una página de 595.6 x 842pt.
 */
const LINEA_X_FRAC = 367 / 595.6;
const LINEA_ANCHO_FRAC = 144 / 595.6;
const LINEA_Y_FRAC = 293 / 842;
const ETIQUETA_TRABAJADOR_Y_FRAC = 280 / 842;

interface PosicionFirma {
  lineaX: number;
  lineaAncho: number;
  lineaY: number;
  etiquetaY: number;
}

/**
 * Ubica dinámicamente, en la última página del PDF, la línea de firma y la
 * etiqueta "TRABAJADOR". No se puede asumir una coordenada fija porque el
 * largo de los datos variables del contrato (nombres, sueldo en letras, etc.)
 * puede correr el texto una línea hacia arriba o abajo entre un contrato y otro.
 */
async function ubicarLineaFirmaTrabajador(pdfBuffer: Buffer, width: number, height: number): Promise<PosicionFirma> {
  try {
    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const doc = await pdfjsLib.getDocument({ data: new Uint8Array(pdfBuffer) }).promise;
    const pagina = await doc.getPage(doc.numPages);
    const contenido = await pagina.getTextContent();

    const items = contenido.items as Array<{ str: string; transform: number[]; width: number }>;

    const etiqueta = items.find((it) => it.str.trim() === 'TRABAJADOR');
    if (!etiqueta) throw new Error('No se encontró la etiqueta "TRABAJADOR" en la última página');

    const etiquetaY = etiqueta.transform[5];
    const esLineaRayas = (s: string) => s.trim().length > 5 && /^_+$/.test(s.trim());

    // La línea de firma está inmediatamente encima de la etiqueta, en la misma columna.
    let mejorLinea: { transform: number[]; width: number } | null = null;
    for (const it of items) {
      if (!esLineaRayas(it.str)) continue;
      const y = it.transform[5];
      if (y <= etiquetaY || y > etiquetaY + 30) continue;
      const mismaColumna = Math.abs(it.transform[4] - etiqueta.transform[4]) < 150;
      if (!mismaColumna) continue;
      if (!mejorLinea || y < mejorLinea.transform[5]) mejorLinea = it;
    }
    if (!mejorLinea) throw new Error('No se encontró la línea de firma sobre "TRABAJADOR"');

    return {
      lineaX: mejorLinea.transform[4],
      lineaAncho: mejorLinea.width,
      lineaY: mejorLinea.transform[5],
      etiquetaY,
    };
  } catch {
    return {
      lineaX: width * LINEA_X_FRAC,
      lineaAncho: width * LINEA_ANCHO_FRAC,
      lineaY: height * LINEA_Y_FRAC,
      etiquetaY: height * ETIQUETA_TRABAJADOR_Y_FRAC,
    };
  }
}

/**
 * Estampa la imagen de firma encima de la línea de "TRABAJADOR" en la última
 * página del PDF, y debajo agrega el sello "FIRMA ELECTRÓNICA" + fecha/hora.
 */
export async function estamparFirmaEnPdf(
  pdfBuffer: Buffer,
  firmaImagenBuffer: Buffer,
  fechaHoraTexto: string,
): Promise<Buffer> {
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  const paginas = pdfDoc.getPages();
  const ultimaPagina = paginas[paginas.length - 1];
  const { width, height } = ultimaPagina.getSize();

  const { lineaX, lineaAncho, lineaY, etiquetaY } = await ubicarLineaFirmaTrabajador(pdfBuffer, width, height);
  const centroX = lineaX + lineaAncho / 2;

  const esJpg = firmaImagenBuffer[0] === 0xff && firmaImagenBuffer[1] === 0xd8;
  const firmaImage = esJpg
    ? await pdfDoc.embedJpg(firmaImagenBuffer)
    : await pdfDoc.embedPng(firmaImagenBuffer);

  const firmaAnchoMax = lineaAncho * 1.15;
  const firmaAltoMax = 48;
  const escala = Math.min(firmaAnchoMax / firmaImage.width, firmaAltoMax / firmaImage.height);
  const firmaAncho = firmaImage.width * escala;
  const firmaAlto = firmaImage.height * escala;

  ultimaPagina.drawImage(firmaImage, {
    x: centroX - firmaAncho / 2,
    y: lineaY + 3,
    width: firmaAncho,
    height: firmaAlto,
  });

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const dibujarTextoCentrado = (texto: string, y: number, size: number) => {
    const anchoTexto = font.widthOfTextAtSize(texto, size);
    ultimaPagina.drawText(texto, {
      x: centroX - anchoTexto / 2,
      y,
      size,
      font,
      color: rgb(0.3, 0.3, 0.3),
    });
  };

  dibujarTextoCentrado('FIRMA ELECTRÓNICA', etiquetaY - 14, 7);
  dibujarTextoCentrado(fechaHoraTexto, etiquetaY - 25, 7);

  const bytes = await pdfDoc.save();
  return Buffer.from(bytes);
}

/** "data:image/png;base64,AAAA..." -> Buffer */
export function decodificarFirmaBase64(dataUrl: string): Buffer {
  const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, '');
  return Buffer.from(base64, 'base64');
}
