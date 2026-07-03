const UNIDADES = [
  '', 'UNO', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE',
  'DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISÉIS', 'DIECISIETE',
  'DIECIOCHO', 'DIECINUEVE', 'VEINTE',
];
const DECENAS = [
  '', '', '', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA',
];
const CENTENAS = [
  '', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS',
  'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS',
];

function convertirGrupo(numero: number): string {
  if (numero === 0) return '';
  if (numero === 100) return 'CIEN';
  if (numero <= 20) return UNIDADES[numero];

  if (numero < 100) {
    const d = Math.floor(numero / 10);
    const u = numero % 10;
    if (numero < 30) return u === 0 ? DECENAS[d] : `VEINTI${UNIDADES[u]}`;
    return u === 0 ? DECENAS[d] : `${DECENAS[d]} Y ${UNIDADES[u]}`;
  }

  const c = Math.floor(numero / 100);
  const resto = numero % 100;
  const letrasCentena = CENTENAS[c];
  return resto === 0 ? letrasCentena : `${letrasCentena} ${convertirGrupo(resto)}`;
}

function enteroALetras(numero: number): string {
  if (numero === 0) return 'CERO';

  const millones = Math.floor(numero / 1000000);
  numero %= 1000000;
  const miles = Math.floor(numero / 1000);
  const resto = numero % 1000;

  let letras = '';
  if (millones > 0) {
    letras += millones === 1 ? 'UN MILLÓN' : `${convertirGrupo(millones)} MILLONES`;
  }
  if (miles > 0) {
    letras += (letras ? ' ' : '') + (miles === 1 ? 'MIL' : `${convertirGrupo(miles)} MIL`);
  }
  if (resto > 0) {
    letras += (letras ? ' ' : '') + convertirGrupo(resto);
  }

  return letras.trim().replace(/\s+/g, ' ');
}

/**
 * Reproduce el patrón textual usado en el formato legal aprobado
 * ("MIL QUINIENTOS NUEVOS 00/100 Soles"), decisión confirmada por el cliente
 * pese a que "NUEVOS" es un resabio de la antigua denominación de la moneda.
 */
export function sueldoALetras(monto: number): string {
  const entero = Math.floor(monto);
  const centavos = Math.round((monto - entero) * 100);
  const centavosStr = String(centavos).padStart(2, '0');
  return `${enteroALetras(entero)} NUEVOS ${centavosStr}/100 Soles`;
}
