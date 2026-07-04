import type { Contrato } from './types';

export type EstadoVigencia = 'sin_contrato' | 'vigente' | 'por_vencer' | 'critico' | 'vencido';

export interface VigenciaInfo {
  contrato: Contrato | null;
  diasRestantes: number | null;
  porcentaje: number;
  estado: EstadoVigencia;
}

const DIA_MS = 24 * 60 * 60 * 1000;
/** A partir de cuántos días restantes (inclusive) la tarjeta pasa a rojo ("crítico"). */
const UMBRAL_CRITICO_DIAS = 2;

/** Toma el contrato con fecha de término más lejana (el "vigente" actual del empleado). */
export function calcularVigencia(contratos: Contrato[], empleadoId: number): VigenciaInfo {
  const delEmpleado = contratos.filter(
    (c) => c.empleado_id === empleadoId && c.estado !== 'anulado' && c.estado !== 'rechazado',
  );
  if (delEmpleado.length === 0) {
    return { contrato: null, diasRestantes: null, porcentaje: 0, estado: 'sin_contrato' };
  }

  const ultimo = [...delEmpleado].sort((a, b) => b.fecha_fin.localeCompare(a.fecha_fin))[0];

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const inicio = new Date(ultimo.fecha_inicio);
  const fin = new Date(ultimo.fecha_fin);

  const diasRestantes = Math.ceil((fin.getTime() - hoy.getTime()) / DIA_MS);
  const totalDias = Math.max(1, Math.ceil((fin.getTime() - inicio.getTime()) / DIA_MS));
  const transcurridos = Math.ceil((hoy.getTime() - inicio.getTime()) / DIA_MS);
  const porcentaje = Math.min(100, Math.max(0, (transcurridos / totalDias) * 100));

  let estado: EstadoVigencia = 'vigente';
  if (diasRestantes < 0) estado = 'vencido';
  else if (diasRestantes <= UMBRAL_CRITICO_DIAS) estado = 'critico';
  else if (diasRestantes <= 7) estado = 'por_vencer';

  return { contrato: ultimo, diasRestantes, porcentaje, estado };
}

export const VIGENCIA_ESTILO: Record<
  EstadoVigencia,
  { badge: string; barra: string; label: string; tarjeta: string }
> = {
  sin_contrato: {
    badge: 'bg-gray-100 text-gray-500',
    barra: 'bg-gray-300',
    label: 'Sin contrato',
    tarjeta: 'bg-white border-gray-200',
  },
  vigente: {
    badge: 'bg-green-100 text-green-700',
    barra: 'bg-green-500',
    label: 'Vigente',
    tarjeta: 'bg-white border-gray-200',
  },
  por_vencer: {
    badge: 'bg-amber-100 text-amber-700',
    barra: 'bg-amber-500',
    label: 'Por vencer',
    tarjeta: 'bg-white border-gray-200',
  },
  // Últimos 2 días antes del vencimiento: la tarjeta completa se resalta en rojo.
  critico: {
    badge: 'bg-red-100 text-red-700',
    barra: 'bg-red-500',
    label: 'Por vencer',
    tarjeta: 'border-red-300 bg-red-50',
  },
  vencido: {
    badge: 'bg-red-100 text-red-700',
    barra: 'bg-red-500',
    label: 'Vencido',
    tarjeta: 'border-red-300 bg-red-50',
  },
};
