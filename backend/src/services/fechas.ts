const MESES = [
  'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
  'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE',
];

/** "2026-04-21" -> "21 de ABRIL del 2026", igual al patrón del formato legal aprobado. */
export function fechaLarga(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  const dia = String(day).padStart(2, '0');
  return `${dia} de ${MESES[month - 1]} del ${year}`;
}

/** Date -> "02/07/2026 14:35", para el sello de firma electrónica. */
export function fechaHoraCorta(fecha: Date): string {
  const dia = String(fecha.getDate()).padStart(2, '0');
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const hora = String(fecha.getHours()).padStart(2, '0');
  const minuto = String(fecha.getMinutes()).padStart(2, '0');
  return `${dia}/${mes}/${fecha.getFullYear()} ${hora}:${minuto}`;
}
