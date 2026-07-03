import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiErrorMessage } from '../api/client';
import { descargarArchivo } from '../api/download';
import { ApiErrorBanner } from '../components/ApiErrorBanner';
import { ESTADO_BADGE } from '../api/estados';
import type { Contrato, Empleado, Plantilla } from '../api/types';

const emptyForm = {
  plantilla_id: 0,
  empleado_id: 0,
  cargo: '',
  duracion: '',
  fecha_inicio: '',
  fecha_fin: '',
  sueldo_numero: '',
};

function formatearFecha(iso: string): string {
  const [year, month, day] = iso.slice(0, 10).split('-');
  return `${day}/${month}/${year}`;
}

export function ContratosPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [descargandoId, setDescargandoId] = useState<string | null>(null);
  const [contratoAEliminar, setContratoAEliminar] = useState<Contrato | null>(null);

  const descargar = async (contratoId: number, tipo: 'pdf' | 'docx') => {
    const key = `${contratoId}-${tipo}`;
    setDescargandoId(key);
    try {
      await descargarArchivo(`/contratos/${contratoId}/${tipo}`, `contrato-${contratoId}.${tipo}`);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setDescargandoId(null);
    }
  };

  const plantillasQuery = useQuery({
    queryKey: ['plantillas'],
    queryFn: async () => (await api.get<Plantilla[]>('/plantillas')).data,
  });
  const empleadosQuery = useQuery({
    queryKey: ['empleados', ''],
    queryFn: async () => (await api.get<Empleado[]>('/empleados')).data,
  });
  const contratosQuery = useQuery({
    queryKey: ['contratos'],
    queryFn: async () => (await api.get<Contrato[]>('/contratos')).data,
  });

  const empleadoSeleccionado = empleadosQuery.data?.find((e) => e.id === form.empleado_id);

  const generarMutation = useMutation({
    mutationFn: async () =>
      (
        await api.post('/contratos', {
          ...form,
          plantilla_id: Number(form.plantilla_id),
          empleado_id: Number(form.empleado_id),
          sueldo_numero: Number(form.sueldo_numero),
        })
      ).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contratos'] });
      setForm(emptyForm);
      setShowForm(false);
      setError(null);
    },
    onError: (err) => setError(apiErrorMessage(err)),
  });

  const eliminarMutation = useMutation({
    mutationFn: async (id: number) => api.delete(`/contratos/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contratos'] });
      setContratoAEliminar(null);
    },
    onError: (err) => setError(apiErrorMessage(err)),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Contratos</h1>
          <p className="text-sm text-gray-500">Genera el contrato a partir de una plantilla y un empleado.</p>
        </div>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="px-4 py-2 rounded-md bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
        >
          {showForm ? 'Cancelar' : '+ Generar contrato'}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            generarMutation.mutate();
          }}
          className="bg-white border border-gray-200 rounded-lg p-5 grid grid-cols-2 gap-4"
        >
          <label className="block">
            <span className="block text-xs font-medium text-gray-500 mb-1">Plantilla</span>
            <select
              required
              className="input"
              value={form.plantilla_id}
              onChange={(e) => setForm({ ...form, plantilla_id: Number(e.target.value) })}
            >
              <option value={0} disabled>
                Selecciona una plantilla
              </option>
              {(plantillasQuery.data ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="block text-xs font-medium text-gray-500 mb-1">Empleado</span>
            <select
              required
              className="input"
              value={form.empleado_id}
              onChange={(e) => {
                const id = Number(e.target.value);
                const emp = empleadosQuery.data?.find((x) => x.id === id);
                setForm({ ...form, empleado_id: id, cargo: emp?.cargo_default ?? form.cargo });
              }}
            >
              <option value={0} disabled>
                Selecciona un empleado
              </option>
              {(empleadosQuery.data ?? []).map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.nombre_completo} — {emp.dni}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="block text-xs font-medium text-gray-500 mb-1">Cargo</span>
            <input
              required
              className="input"
              value={form.cargo}
              onChange={(e) => setForm({ ...form, cargo: e.target.value.toUpperCase() })}
              placeholder={empleadoSeleccionado?.cargo_default}
            />
          </label>

          <label className="block">
            <span className="block text-xs font-medium text-gray-500 mb-1">Duración</span>
            <input
              required
              className="input"
              value={form.duracion}
              onChange={(e) => setForm({ ...form, duracion: e.target.value })}
              placeholder="01 mes"
            />
          </label>

          <label className="block">
            <span className="block text-xs font-medium text-gray-500 mb-1">Fecha de inicio</span>
            <input
              required
              type="date"
              className="input"
              value={form.fecha_inicio}
              onChange={(e) => setForm({ ...form, fecha_inicio: e.target.value })}
            />
          </label>

          <label className="block">
            <span className="block text-xs font-medium text-gray-500 mb-1">Fecha de término</span>
            <input
              required
              type="date"
              className="input"
              value={form.fecha_fin}
              onChange={(e) => setForm({ ...form, fecha_fin: e.target.value })}
            />
          </label>

          <label className="block">
            <span className="block text-xs font-medium text-gray-500 mb-1">Sueldo (S/.)</span>
            <input
              required
              type="number"
              step="0.01"
              min="0"
              className="input"
              value={form.sueldo_numero}
              onChange={(e) => setForm({ ...form, sueldo_numero: e.target.value })}
              placeholder="1500.00"
            />
          </label>

          {error && <p className="col-span-2 text-sm text-red-600">{error}</p>}

          <div className="col-span-2 flex justify-end">
            <button
              type="submit"
              disabled={generarMutation.isPending}
              className="px-4 py-2 rounded-md bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              {generarMutation.isPending ? 'Generando...' : 'Generar contrato'}
            </button>
          </div>
        </form>
      )}

      {contratosQuery.isError && <ApiErrorBanner error={contratosQuery.error} />}

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-left">
            <tr>
              <th className="px-4 py-2 font-medium">Empleado</th>
              <th className="px-4 py-2 font-medium">Cargo</th>
              <th className="px-4 py-2 font-medium">Vigencia</th>
              <th className="px-4 py-2 font-medium">Estado</th>
              <th className="px-4 py-2 font-medium">Documentos</th>
              <th className="px-4 py-2 font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {(contratosQuery.data ?? []).map((c) => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="px-4 py-2 text-gray-900">{c.empleado_nombre}</td>
                <td className="px-4 py-2 text-gray-600">{c.cargo}</td>
                <td className="px-4 py-2 text-gray-600">
                  {formatearFecha(c.fecha_inicio)} → {formatearFecha(c.fecha_fin)}
                </td>
                <td className="px-4 py-2">
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      ESTADO_BADGE[c.estado] ?? 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {c.estado}
                  </span>
                </td>
                <td className="px-4 py-2 space-x-3">
                  {c.pdf_path && (
                    <button
                      className="text-blue-600 hover:underline disabled:opacity-50"
                      disabled={descargandoId === `${c.id}-pdf`}
                      onClick={() => descargar(c.id, 'pdf')}
                    >
                      {descargandoId === `${c.id}-pdf` ? 'Descargando...' : 'PDF'}
                    </button>
                  )}
                  {c.docx_path && (
                    <button
                      className="text-blue-600 hover:underline disabled:opacity-50"
                      disabled={descargandoId === `${c.id}-docx`}
                      onClick={() => descargar(c.id, 'docx')}
                    >
                      {descargandoId === `${c.id}-docx` ? 'Descargando...' : 'DOCX'}
                    </button>
                  )}
                </td>
                <td className="px-4 py-2">
                  <button
                    className="text-red-600 hover:underline"
                    onClick={() => setContratoAEliminar(c)}
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
            {contratosQuery.isSuccess && contratosQuery.data.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  Aún no se generó ningún contrato.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {contratoAEliminar && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center px-4">
          <div className="bg-white rounded-lg p-5 w-full max-w-sm space-y-4">
            <h3 className="font-medium text-gray-900">Eliminar contrato</h3>
            <p className="text-sm text-gray-600">
              Se eliminará el contrato de <strong>{contratoAEliminar.empleado_nombre}</strong> y sus
              archivos (PDF/DOCX). Esta acción no se puede deshacer.
            </p>
            <div className="flex justify-end gap-2">
              <button
                className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900"
                onClick={() => setContratoAEliminar(null)}
              >
                Cancelar
              </button>
              <button
                disabled={eliminarMutation.isPending}
                className="px-3 py-1.5 text-sm rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                onClick={() => eliminarMutation.mutate(contratoAEliminar.id)}
              >
                {eliminarMutation.isPending ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
