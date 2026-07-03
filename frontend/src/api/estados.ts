import type { EstadoContrato } from './types';

export const ESTADO_BADGE: Record<string, string> = {
  generado: 'bg-blue-100 text-blue-700',
  firmado: 'bg-green-100 text-green-700',
  enviado: 'bg-amber-100 text-amber-700',
  rechazado: 'bg-red-100 text-red-700',
  anulado: 'bg-gray-100 text-gray-500',
};

// Barras sólidas para el gráfico del dashboard — mismo significado que ESTADO_BADGE.
export const ESTADO_BAR: Record<string, string> = {
  generado: 'bg-blue-500',
  firmado: 'bg-green-500',
  enviado: 'bg-amber-500',
  rechazado: 'bg-red-500',
  anulado: 'bg-gray-400',
};

export const ESTADO_LABEL: Record<EstadoContrato, string> = {
  borrador: 'Borrador',
  generado: 'Generado',
  enviado: 'Enviado',
  abierto: 'Abierto',
  en_revision: 'En revisión',
  firmado: 'Firmado',
  rechazado: 'Rechazado',
  anulado: 'Anulado',
  vencido: 'Vencido',
  archivado: 'Archivado',
};
