import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiErrorMessage } from '../api/client';
import { useAuth } from '../api/AuthContext';
import { SignaturePad } from '../components/SignaturePad';
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
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [abriendo, setAbriendo] = useState(false);
  const [mostrarFirma, setMostrarFirma] = useState(false);

  const contratoQuery = useQuery({
    queryKey: ['mi-contrato'],
    queryFn: async () => (await api.get<Contrato>('/contratos/mio')).data,
    retry: false,
  });

  const firmarMutation = useMutation({
    mutationFn: async (archivo: Blob) => {
      const formData = new FormData();
      formData.append('firma', archivo, 'firma.png');
      return (await api.post(`/contratos/${contratoQuery.data!.id}/firmar`, formData)).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mi-contrato'] });
      setMostrarFirma(false);
      setError(null);
    },
    onError: (err) => setError(apiErrorMessage(err)),
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

  const contrato = contratoQuery.data;
  const yaFirmado = contrato?.estado === 'firmado';

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Hola, {usuario?.nombre_completo}</h1>
        <p className="text-sm text-gray-500">Aquí puedes consultar y firmar tu contrato.</p>
      </div>

      {contratoQuery.isLoading && <p className="text-sm text-gray-400">Cargando...</p>}

      {contratoQuery.isError && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 text-center text-gray-500">
          Todavía no tienes un contrato generado.
        </div>
      )}

      {contrato && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="font-semibold text-gray-900">{contrato.cargo}</h2>
              <p className="text-sm text-gray-500">{contrato.plantilla_nombre}</p>
            </div>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                ESTADO_STYLES[contrato.estado] ?? 'bg-gray-100 text-gray-500'
              }`}
            >
              {contrato.estado}
            </span>
          </div>

          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-gray-400">Vigencia</dt>
              <dd className="text-gray-900">
                {formatearFecha(contrato.fecha_inicio)} → {formatearFecha(contrato.fecha_fin)}
              </dd>
            </div>
            <div>
              <dt className="text-gray-400">Duración</dt>
              <dd className="text-gray-900">{contrato.duracion}</dd>
            </div>
            <div>
              <dt className="text-gray-400">Remuneración</dt>
              <dd className="text-gray-900">S/. {contrato.sueldo_numero}</dd>
            </div>
          </dl>

          {yaFirmado && (
            <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2">
              Firmaste este contrato correctamente. Ya puedes descargar el PDF con tu firma.
            </p>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-2">
            <button
              onClick={verContrato}
              disabled={abriendo || !contrato.pdf_path}
              className="flex-1 px-4 py-2 rounded-md bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              {abriendo ? 'Abriendo...' : contrato.pdf_path ? 'Ver mi contrato' : 'PDF aún no disponible'}
            </button>
            {!yaFirmado && (
              <button
                onClick={() => setMostrarFirma(true)}
                disabled={!contrato.pdf_path}
                className="flex-1 px-4 py-2 rounded-md bg-white border border-indigo-600 text-indigo-600 text-sm font-medium hover:bg-indigo-50 disabled:opacity-50"
              >
                Firmar contrato
              </button>
            )}
          </div>
        </div>
      )}

      {mostrarFirma && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center px-4 z-10">
          <div className="bg-white rounded-xl p-6 w-full max-w-md space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-medium text-gray-900">Firma tu contrato</h3>
                <p className="text-xs text-gray-500">Dibuja tu firma con el dedo o el mouse.</p>
              </div>
              <button onClick={() => setMostrarFirma(false)} className="text-gray-400 hover:text-gray-600">
                ✕
              </button>
            </div>

            <SignaturePad
              saving={firmarMutation.isPending}
              onSave={(blob) => firmarMutation.mutate(blob)}
            />

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400">o</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) firmarMutation.mutate(file);
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={firmarMutation.isPending}
              className="w-full px-4 py-2 rounded-md border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
            >
              Subir una imagen de mi firma
            </button>

            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
