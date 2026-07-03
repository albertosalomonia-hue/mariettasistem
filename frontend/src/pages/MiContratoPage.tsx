import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, apiErrorMessage } from '../api/client';
import { useAuth } from '../api/AuthContext';
import type { Contrato } from '../api/types';

const ESTADO_STYLES: Record<string, string> = {
  generado: 'bg-blue-100 text-blue-700',
  firmado: 'bg-green-100 text-green-700',
  enviado: 'bg-amber-100 text-amber-700',
  rechazado: 'bg-red-100 text-red-700',
  anulado: 'bg-gray-100 text-gray-500',
};

function formatearFecha(iso: string): string {
  const [year, month, day] = iso.slice(0, 10).split('-');
  return `${day}/${month}/${year}`;
}

export function MiContratoPage() {
  const { usuario } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [abriendo, setAbriendo] = useState(false);

  const contratoQuery = useQuery({
    queryKey: ['mi-contrato'],
    queryFn: async () => (await api.get<Contrato>('/contratos/mio')).data,
    retry: false,
  });

  const verContrato = async () => {
    if (!contratoQuery.data) return;
    setAbriendo(true);
    setError(null);
    try {
      const { data } = await api.get(`/contratos/${contratoQuery.data.id}/pdf`, {
        responseType: 'blob',
      });
      const blobUrl = URL.createObjectURL(data as Blob);
      window.open(blobUrl, '_blank');
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setAbriendo(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Hola, {usuario?.nombre_completo}</h1>
        <p className="text-sm text-gray-500">Aquí puedes consultar tu contrato.</p>
      </div>

      {contratoQuery.isLoading && <p className="text-sm text-gray-400">Cargando...</p>}

      {contratoQuery.isError && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 text-center text-gray-500">
          Todavía no tienes un contrato generado.
        </div>
      )}

      {contratoQuery.data && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="font-semibold text-gray-900">{contratoQuery.data.cargo}</h2>
              <p className="text-sm text-gray-500">{contratoQuery.data.plantilla_nombre}</p>
            </div>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                ESTADO_STYLES[contratoQuery.data.estado] ?? 'bg-gray-100 text-gray-500'
              }`}
            >
              {contratoQuery.data.estado}
            </span>
          </div>

          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-gray-400">Vigencia</dt>
              <dd className="text-gray-900">
                {formatearFecha(contratoQuery.data.fecha_inicio)} →{' '}
                {formatearFecha(contratoQuery.data.fecha_fin)}
              </dd>
            </div>
            <div>
              <dt className="text-gray-400">Duración</dt>
              <dd className="text-gray-900">{contratoQuery.data.duracion}</dd>
            </div>
            <div>
              <dt className="text-gray-400">Remuneración</dt>
              <dd className="text-gray-900">S/. {contratoQuery.data.sueldo_numero}</dd>
            </div>
          </dl>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            onClick={verContrato}
            disabled={abriendo || !contratoQuery.data.pdf_path}
            className="w-full px-4 py-2 rounded-md bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
          >
            {abriendo
              ? 'Abriendo...'
              : contratoQuery.data.pdf_path
                ? 'Ver mi contrato'
                : 'PDF aún no disponible'}
          </button>
        </div>
      )}
    </div>
  );
}
