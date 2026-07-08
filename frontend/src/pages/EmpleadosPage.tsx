import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiErrorMessage } from '../api/client';
import { apiArchivos } from '../api/archivosClient';
import { ApiErrorBanner } from '../components/ApiErrorBanner';
import { AuthImage } from '../components/AuthImage';
import type { Empleado, Empresa } from '../api/types';

const emptyForm = {
  empresa_id: 0,
  nombre_completo: '',
  dni: '',
  direccion: '',
  cargo_default: '',
  email: '',
  telefono: '',
};

function iniciales(nombre: string): string {
  return nombre
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();
}

function Avatar({ empleado, size = 'w-10 h-10 text-sm' }: { empleado: Empleado; size?: string }) {
  return (
    <AuthImage
      src={empleado.foto_path ? `/empleados/${empleado.id}/foto` : null}
      alt={empleado.nombre_completo}
      className={`${size} rounded-lg object-cover shrink-0`}
      fallback={
        <div
          className={`${size} rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-semibold shrink-0`}
        >
          {iniciales(empleado.nombre_completo)}
        </div>
      }
    />
  );
}

export function EmpleadosPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [perfilId, setPerfilId] = useState<number | null>(null);
  const [abrirEditando, setAbrirEditando] = useState(false);
  const [eliminarPendiente, setEliminarPendiente] = useState<{ id: number; nombre: string } | null>(null);

  const empresasQuery = useQuery({
    queryKey: ['empresas'],
    queryFn: async () => (await api.get<Empresa[]>('/empresas')).data,
  });

  const empleadosQuery = useQuery({
    queryKey: ['empleados', search],
    queryFn: async () =>
      (await api.get<Empleado[]>('/empleados', { params: search ? { q: search } : {} })).data,
  });

  const crearMutation = useMutation({
    mutationFn: async () => (await api.post('/empleados', form)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['empleados'] });
      setForm(emptyForm);
      setShowForm(false);
      setError(null);
    },
    onError: (err) => setError(apiErrorMessage(err)),
  });

  const eliminarMutation = useMutation({
    mutationFn: async (id: number) => api.delete(`/empleados/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['empleados'] });
      setEliminarPendiente(null);
    },
    onError: (err) => setError(apiErrorMessage(err)),
  });

  const empresas = empresasQuery.data ?? [];
  const defaultEmpresaId = empresas[0]?.id ?? 0;
  const empleadoPerfil = empleadosQuery.data?.find((e) => e.id === perfilId) ?? null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Empleados</h1>
          <p className="text-sm text-gray-500">Registro de trabajadores para la generación de contratos.</p>
        </div>
        <button
          onClick={() => {
            setForm((f) => ({ ...f, empresa_id: f.empresa_id || defaultEmpresaId }));
            setShowForm((s) => !s);
          }}
          className="px-4 py-2 rounded-md bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
        >
          {showForm ? 'Cancelar' : '+ Nuevo empleado'}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            crearMutation.mutate();
          }}
          className="bg-white border border-gray-200 rounded-lg p-5 grid grid-cols-2 gap-4"
        >
          <Field label="Nombre completo">
            <input
              required
              className="input"
              value={form.nombre_completo}
              onChange={(e) => setForm({ ...form, nombre_completo: e.target.value.toUpperCase() })}
            />
          </Field>
          <Field label="DNI">
            <input
              required
              className="input"
              value={form.dni}
              onChange={(e) => setForm({ ...form, dni: e.target.value })}
            />
          </Field>
          <Field label="Dirección">
            <input
              required
              className="input"
              value={form.direccion}
              onChange={(e) => setForm({ ...form, direccion: e.target.value })}
            />
          </Field>
          <Field label="Cargo">
            <input
              required
              className="input"
              value={form.cargo_default}
              onChange={(e) => setForm({ ...form, cargo_default: e.target.value.toUpperCase() })}
            />
          </Field>
          <Field label="Empresa">
            <select
              className="input"
              value={form.empresa_id}
              onChange={(e) => setForm({ ...form, empresa_id: Number(e.target.value) })}
            >
              {empresas.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.razon_social}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Email (opcional)">
            <input
              type="email"
              className="input"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </Field>

          {error && <p className="col-span-2 text-sm text-red-600">{error}</p>}

          <div className="col-span-2 flex justify-end">
            <button
              type="submit"
              disabled={crearMutation.isPending}
              className="px-4 py-2 rounded-md bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              {crearMutation.isPending ? 'Guardando...' : 'Guardar empleado'}
            </button>
          </div>
        </form>
      )}

      <input
        placeholder="Buscar por nombre o DNI..."
        className="input max-w-sm"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {empleadosQuery.isError && <ApiErrorBanner error={empleadosQuery.error} />}

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-left">
            <tr>
              <th className="px-4 py-2 font-medium">Nombre</th>
              <th className="px-4 py-2 font-medium">DNI</th>
              <th className="px-4 py-2 font-medium">Cargo</th>
              <th className="px-4 py-2 font-medium">Estado</th>
              <th className="px-4 py-2 font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {(empleadosQuery.data ?? []).map((emp) => (
              <tr
                key={emp.id}
                className="hover:bg-gray-50 cursor-pointer"
                onClick={() => {
                  setAbrirEditando(false);
                  setPerfilId(emp.id);
                }}
              >
                <td className="px-4 py-2 text-gray-900">
                  <div className="flex items-center gap-3">
                    <Avatar empleado={emp} />
                    {emp.nombre_completo}
                  </div>
                </td>
                <td className="px-4 py-2 text-gray-600">{emp.dni}</td>
                <td className="px-4 py-2 text-gray-600">{emp.cargo_default}</td>
                <td className="px-4 py-2">
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      emp.estado === 'activo' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {emp.estado}
                  </span>
                </td>
                <td className="px-4 py-2 space-x-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setAbrirEditando(true);
                      setPerfilId(emp.id);
                    }}
                    className="text-indigo-600 hover:underline font-medium"
                  >
                    Editar
                  </button>
                  <button
                    disabled={emp.estado === 'cesado'}
                    title={emp.estado === 'cesado' ? 'Este empleado ya está inactivo' : undefined}
                    onClick={(e) => {
                      e.stopPropagation();
                      setEliminarPendiente({ id: emp.id, nombre: emp.nombre_completo });
                    }}
                    className="text-red-600 hover:underline font-medium disabled:text-gray-300 disabled:no-underline disabled:cursor-not-allowed"
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
            {empleadosQuery.isSuccess && empleadosQuery.data.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                  Sin empleados registrados todavía.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {empleadoPerfil && (
        <PerfilEmpleadoModal
          empleado={empleadoPerfil}
          initialEditando={abrirEditando}
          onClose={() => setPerfilId(null)}
        />
      )}

      {eliminarPendiente && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center px-4 z-20">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm space-y-4 shadow-xl">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.72-1.36 3.486 0l6.28 11.164c.75 1.333-.213 2.987-1.743 2.987H3.72c-1.53 0-2.493-1.654-1.743-2.987L8.257 3.1zM10 13a1 1 0 100-2 1 1 0 000 2zm-.75-6.5a.75.75 0 011.5 0v3.5a.75.75 0 01-1.5 0v-3.5z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Eliminar empleado</h3>
                <p className="text-sm text-gray-600 mt-1">
                  ¿Estás seguro de eliminar a <strong>{eliminarPendiente.nombre}</strong>? Quedará marcado como{' '}
                  <strong>cesado</strong> y ya no podrá usarse para generar nuevos contratos. Esta acción no se
                  puede deshacer desde aquí.
                </p>
              </div>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex justify-end gap-2 pt-1">
              <button
                className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900"
                onClick={() => {
                  setEliminarPendiente(null);
                  setError(null);
                }}
              >
                Cancelar
              </button>
              <button
                disabled={eliminarMutation.isPending}
                className="px-4 py-1.5 rounded-md bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50"
                onClick={() => eliminarMutation.mutate(eliminarPendiente.id)}
              >
                {eliminarMutation.isPending ? 'Eliminando...' : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PerfilEmpleadoModal({
  empleado,
  initialEditando = false,
  onClose,
}: {
  empleado: Empleado;
  initialEditando?: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [photoVersion, setPhotoVersion] = useState(0);
  const [editando, setEditando] = useState(initialEditando);
  const [editForm, setEditForm] = useState({
    nombre_completo: empleado.nombre_completo,
    dni: empleado.dni,
    direccion: empleado.direccion,
    cargo_default: empleado.cargo_default,
    email: empleado.email ?? '',
    telefono: empleado.telefono ?? '',
  });

  const empresasQuery = useQuery({
    queryKey: ['empresas'],
    queryFn: async () => (await api.get<Empresa[]>('/empresas')).data,
  });

  const subirFotoMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('foto', file);
      return apiArchivos.post(`/empleados/${empleado.id}/foto`, formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['empleados'] });
      setPhotoVersion((v) => v + 1);
      setError(null);
    },
    onError: (err) => setError(apiErrorMessage(err)),
  });

  const guardarMutation = useMutation({
    mutationFn: async () =>
      (
        await api.put(`/empleados/${empleado.id}`, {
          ...editForm,
          email: editForm.email || null,
          telefono: editForm.telefono || null,
        })
      ).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['empleados'] });
      setEditando(false);
      setError(null);
    },
    onError: (err) => setError(apiErrorMessage(err)),
  });

  const empresaActual = empresasQuery.data?.find((e) => e.id === empleado.empresa_id);

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center px-4 z-10">
      <div className="bg-white rounded-xl p-6 w-full max-w-md space-y-5">
        <div className="flex items-start justify-between">
          <h3 className="font-medium text-gray-900">Perfil del empleado</h3>
          <div className="flex items-center gap-3">
            {!editando && (
              <button
                onClick={() => {
                  setEditForm({
                    nombre_completo: empleado.nombre_completo,
                    dni: empleado.dni,
                    direccion: empleado.direccion,
                    cargo_default: empleado.cargo_default,
                    email: empleado.email ?? '',
                    telefono: empleado.telefono ?? '',
                  });
                  setError(null);
                  setEditando(true);
                }}
                className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
              >
                Editar
              </button>
            )}
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              ✕
            </button>
          </div>
        </div>

        <div className="flex flex-col items-center gap-3">
          <AuthImage
            key={photoVersion}
            src={empleado.foto_path ? `/empleados/${empleado.id}/foto?v=${photoVersion}` : null}
            alt={empleado.nombre_completo}
            className="w-28 h-36 rounded-lg object-cover"
            fallback={
              <div className="w-28 h-36 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center text-2xl font-semibold">
                {iniciales(empleado.nombre_completo)}
              </div>
            }
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) subirFotoMutation.mutate(file);
            }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={subirFotoMutation.isPending}
            className="text-sm font-medium text-indigo-600 hover:text-indigo-700 disabled:opacity-50"
          >
            {subirFotoMutation.isPending ? 'Subiendo...' : 'Cambiar foto'}
          </button>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        {editando ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              guardarMutation.mutate();
            }}
            className="grid grid-cols-2 gap-3 border-t border-gray-100 pt-4"
          >
            <div className="col-span-2">
              <Field label="Nombre completo">
                <input
                  required
                  className="input"
                  value={editForm.nombre_completo}
                  onChange={(e) =>
                    setEditForm({ ...editForm, nombre_completo: e.target.value.toUpperCase() })
                  }
                />
              </Field>
            </div>
            <Field label="DNI">
              <input
                required
                className="input"
                value={editForm.dni}
                onChange={(e) => setEditForm({ ...editForm, dni: e.target.value })}
              />
            </Field>
            <Field label="Empresa">
              <input className="input bg-gray-50 text-gray-500" value={empresaActual?.razon_social ?? '—'} disabled />
            </Field>
            <div className="col-span-2">
              <Field label="Cargo">
                <input
                  required
                  className="input"
                  value={editForm.cargo_default}
                  onChange={(e) => setEditForm({ ...editForm, cargo_default: e.target.value.toUpperCase() })}
                />
              </Field>
            </div>
            <div className="col-span-2">
              <Field label="Dirección">
                <input
                  required
                  className="input"
                  value={editForm.direccion}
                  onChange={(e) => setEditForm({ ...editForm, direccion: e.target.value })}
                />
              </Field>
            </div>
            <Field label="Email (opcional)">
              <input
                type="email"
                className="input"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
              />
            </Field>
            <Field label="Teléfono (opcional)">
              <input
                className="input"
                value={editForm.telefono}
                onChange={(e) => setEditForm({ ...editForm, telefono: e.target.value })}
              />
            </Field>

            {error && <p className="col-span-2 text-sm text-red-600">{error}</p>}

            <div className="col-span-2 flex justify-end gap-2 pt-1">
              <button
                type="button"
                className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900"
                onClick={() => {
                  setEditando(false);
                  setError(null);
                }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={guardarMutation.isPending}
                className="px-4 py-1.5 rounded-md bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
              >
                {guardarMutation.isPending ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </form>
        ) : (
          <dl className="grid grid-cols-2 gap-3 text-sm border-t border-gray-100 pt-4">
            <div className="col-span-2">
              <dt className="text-gray-400">Nombre completo</dt>
              <dd className="text-gray-900 font-medium">{empleado.nombre_completo}</dd>
            </div>
            <div>
              <dt className="text-gray-400">DNI</dt>
              <dd className="text-gray-900">{empleado.dni}</dd>
            </div>
            <div>
              <dt className="text-gray-400">Estado</dt>
              <dd className="text-gray-900 capitalize">{empleado.estado}</dd>
            </div>
            <div className="col-span-2">
              <dt className="text-gray-400">Empresa</dt>
              <dd className="text-gray-900">{empresaActual?.razon_social ?? '—'}</dd>
            </div>
            <div className="col-span-2">
              <dt className="text-gray-400">Cargo</dt>
              <dd className="text-gray-900">{empleado.cargo_default}</dd>
            </div>
            <div className="col-span-2">
              <dt className="text-gray-400">Dirección</dt>
              <dd className="text-gray-900">{empleado.direccion}</dd>
            </div>
            {empleado.email && (
              <div className="col-span-2">
                <dt className="text-gray-400">Email</dt>
                <dd className="text-gray-900">{empleado.email}</dd>
              </div>
            )}
            {empleado.telefono && (
              <div className="col-span-2">
                <dt className="text-gray-400">Teléfono</dt>
                <dd className="text-gray-900">{empleado.telefono}</dd>
              </div>
            )}
          </dl>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-gray-500 mb-1">{label}</span>
      {children}
    </label>
  );
}
