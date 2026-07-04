import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

/**
 * Posición de la línea de firma "TRABAJADOR" del formato legal, medida directamente
 * sobre el PDF generado por la plantilla (pdfjs, coordenadas en puntos sobre una
 * página de 595.6 x 842pt) y expresada como fracción de la página para que la
 * posición no dependa del tamaño exacto de página en cada render de Word.
 */
const LINEA_X_FRAC = 367 / 595.6;
const LINEA_ANCHO_FRAC = 144 / 595.6;
const LINEA_Y_FRAC = 293 / 842;
const ETIQUETA_TRABAJADOR_Y_FRAC = 280 / 842;

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

  const lineaX = width * LINEA_X_FRAC;
  const lineaAncho = width * LINEA_ANCHO_FRAC;
  const lineaY = height * LINEA_Y_FRAC;
  const etiquetaY = height * ETIQUETA_TRABAJADOR_Y_FRAC;
  const centroX = lineaX + lineaAncho / 2;

  const esJpg = firmaImagenBuffer[0] === 0xff && firmaImagenBuffer[1] === 0xd8;
  const firmaImage = esJpg
    ? await pdfDoc.embedJpg(firmaImagenBuffer)
    : await pdfDoc.embedPng(firmaImagenBuffer);

  const firmaAnchoMax = lineaAncho * 0.9;
  const firmaAltoMax = 32;
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
