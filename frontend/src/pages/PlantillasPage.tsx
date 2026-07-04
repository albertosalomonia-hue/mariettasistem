import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiErrorMessage } from '../api/client';
import { apiArchivos } from '../api/archivosClient';
import { ApiErrorBanner } from '../components/ApiErrorBanner';
import type { Plantilla } from '../api/types';

export function PlantillasPage() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [error, setError] = useState<string | null>(null);

  const plantillasQuery = useQuery({
    queryKey: ['plantillas'],
    queryFn: async () => (await api.get<Plantilla[]>('/plantillas')).data,
  });

  const subirMutation = useMutation({
    mutationFn: async () => {
      const file = fileInputRef.current?.files?.[0];
      if (!file) throw new Error('Selecciona un archivo .docx');
      const formData = new FormData();
      formData.append('archivo', file);
      formData.append('nombre', nombre);
      formData.append('descripcion', descripcion);
      return (await apiArchivos.post('/plantillas', formData)).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plantillas'] });
      setNombre('');
      setDescripcion('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      setError(null);
    },
    onError: (err) => setError(apiErrorMessage(err)),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Plantillas</h1>
        <p className="text-sm text-gray-500">
          Sube el .docx del formato legal aprobado. El sistema detecta automáticamente las variables{' '}
          <code className="bg-gray-100 px-1 rounded">{'{{VARIABLE}}'}</code> que contiene.
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          subirMutation.mutate();
        }}
        className="bg-white border border-gray-200 rounded-lg p-5 space-y-4"
      >
        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <span className="block text-xs font-medium text-gray-500 mb-1">Nombre de la plantilla</span>
            <input
              required
              className="input"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Contrato modalidad - inicio de actividad"
            />
          </label>
          <label className="block">
            <span className="block text-xs font-medium text-gray-500 mb-1">Descripción (opcional)</span>
            <input
              className="input"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
            />
          </label>
        </div>
        <label className="block">
          <span className="block text-xs font-medium text-gray-500 mb-1">Archivo .docx</span>
          <input ref={fileInputRef} type="file" accept=".docx" required className="input" />
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={subirMutation.isPending}
            className="px-4 py-2 rounded-md bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
          >
            {subirMutation.isPending ? 'Subiendo...' : 'Subir plantilla'}
          </button>
        </div>
      </form>

      {plantillasQuery.isError && <ApiErrorBanner error={plantillasQuery.error} />}

      <div className="grid gap-4">
        {(plantillasQuery.data ?? []).map((p) => (
          <div key={p.id} className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-medium text-gray-900">{p.nombre}</h3>
                {p.descripcion && <p className="text-sm text-gray-500">{p.descripcion}</p>}
              </div>
              <span className="text-xs text-gray-400">v{p.version}</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {(Array.isArray(p.variables_json) ? p.variables_json : []).map((v) => (
                <code key={v} className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                  {`{{${v}}}`}
                </code>
              ))}
            </div>
          </div>
        ))}
        {plantillasQuery.isSuccess && plantillasQuery.data.length === 0 && (
          <p className="text-center text-gray-400 py-8">Aún no hay plantillas cargadas.</p>
        )}
      </div>
    </div>
  );
}
