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
