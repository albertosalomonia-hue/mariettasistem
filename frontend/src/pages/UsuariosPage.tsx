import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiErrorMessage } from '../api/client';
import { ApiErrorBanner } from '../components/ApiErrorBanner';
import { PasswordInput } from '../components/PasswordInput';
import type { Empleado, Empresa, Rol, UsuarioCuenta } from '../api/types';

const ROLES: { value: Rol; label: string }[] = [
  { value: 'super_admin', label: 'Super Administrador' },
  { value: 'rrhh', label: 'Recursos Humanos' },
  { value: 'gerente', label: 'Gerente' },
  { value: 'supervisor', label: 'Supervisor' },
  { value: 'trabajador', label: 'Trabajador' },
];

const emptyForm = {
  empresa_id: 0,
  empleado_id: 0,
  nombre_completo: '',
  usuario: '',
  email: '',
  password: '',
  rol: 'rrhh' as Rol,
};

export function UsuariosPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [resetPasswordId, setResetPasswordId] = useState<number | null>(null);
  const [nuevaPassword, setNuevaPassword] = useState('');

  const empresasQuery = useQuery({
    queryKey: ['empresas'],
    queryFn: async () => (await api.get<Empresa[]>('/empresas')).data,
  });

  const empleadosQuery = useQuery({
    queryKey: ['empleados', ''],
    queryFn: async () => (await api.get<Empleado[]>('/empleados')).data,
  });

  const usuariosQuery = useQuery({
    queryKey: ['usuarios'],
    queryFn: async () => (await api.get<UsuarioCuenta[]>('/usuarios')).data,
  });

  const empresas = empresasQuery.data ?? [];

  const crearMutation = useMutation({
    mutationFn: async () =>
      (
        await api.post('/usuarios', {
          ...form,
          empleado_id: form.rol === 'trabajador' ? form.empleado_id || undefined : undefined,
        })
      ).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      setForm(emptyForm);
      setShowForm(false);
      setError(null);
    },
    onError: (err) => setError(apiErrorMessage(err)),
  });

  const cambiarRolMutation = useMutation({
    mutationFn: async ({ id, rol }: { id: number; rol: Rol }) =>
      (await api.put(`/usuarios/${id}`, { rol })).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['usuarios'] }),
  });

  const toggleActivoMutation = useMutation({
    mutationFn: async ({ id, activo }: { id: number; activo: boolean }) =>
      (await api.put(`/usuarios/${id}`, { activo })).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['usuarios'] }),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async ({ id, password }: { id: number; password: string }) =>
      (await api.put(`/usuarios/${id}`, { password })).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      setResetPasswordId(null);
      setNuevaPassword('');
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Usuarios</h1>
          <p className="text-sm text-gray-500">Cuentas de acceso al sistema y sus roles.</p>
        </div>
        <button
          onClick={() => {
            setForm((f) => ({ ...f, empresa_id: f.empresa_id || empresas[0]?.id || 0 }));
            setShowForm((s) => !s);
          }}
          className="px-4 py-2 rounded-md bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
        >
          {showForm ? 'Cancelar' : '+ Nuevo usuario'}
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
          <label className="block">
            <span className="block text-xs font-medium text-gray-500 mb-1">Nombre completo</span>
            <input
              required
              className="input"
              value={form.nombre_completo}
              onChange={(e) => setForm({ ...form, nombre_completo: e.target.value })}
            />
          </label>
          <label className="block">
            <span className="block text-xs font-medium text-gray-500 mb-1">Usuario</span>
            <input
              required
              className="input"
              value={form.usuario}
              onChange={(e) => setForm({ ...form, usuario: e.target.value })}
              placeholder="ej. jperez"
            />
          </label>
          <label className="block">
            <span className="block text-xs font-medium text-gray-500 mb-1">Email (opcional)</span>
            <input
              type="email"
              className="input"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </label>
          <label className="block">
            <span className="block text-xs font-medium text-gray-500 mb-1">Rol</span>
            <select
              className="input"
              value={form.rol}
              onChange={(e) => setForm({ ...form, rol: e.target.value as Rol })}
            >
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>
          {form.rol === 'trabajador' && (
            <label className="block">
              <span className="block text-xs font-medium text-gray-500 mb-1">Empleado vinculado</span>
              <select
                required
                className="input"
                value={form.empleado_id}
                onChange={(e) => setForm({ ...form, empleado_id: Number(e.target.value) })}
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
          )}
          <label className="block">
            <span className="block text-xs font-medium text-gray-500 mb-1">Contraseña inicial</span>
            <PasswordInput
              required
              minLength={8}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="mínimo 8 caracteres"
            />
          </label>

          {error && <p className="col-span-2 text-sm text-red-600">{error}</p>}

          <div className="col-span-2 flex justify-end">
            <button
              type="submit"
              disabled={crearMutation.isPending}
              className="px-4 py-2 rounded-md bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              {crearMutation.isPending ? 'Creando...' : 'Crear usuario'}
            </button>
          </div>
        </form>
      )}

      {usuariosQuery.isError && <ApiErrorBanner error={usuariosQuery.error} />}

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-left">
            <tr>
              <th className="px-4 py-2 font-medium">Nombre</th>
              <th className="px-4 py-2 font-medium">Usuario</th>
              <th className="px-4 py-2 font-medium">Email</th>
              <th className="px-4 py-2 font-medium">Rol</th>
              <th className="px-4 py-2 font-medium">Estado</th>
              <th className="px-4 py-2 font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {(usuariosQuery.data ?? []).map((u) => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="px-4 py-2 text-gray-900">{u.nombre_completo}</td>
                <td className="px-4 py-2 text-gray-600">{u.usuario}</td>
                <td className="px-4 py-2 text-gray-400">{u.email ?? '—'}</td>
                <td className="px-4 py-2">
                  <select
                    className="text-sm border border-gray-200 rounded-md px-2 py-1"
                    value={u.rol}
                    onChange={(e) =>
                      cambiarRolMutation.mutate({ id: u.id, rol: e.target.value as Rol })
                    }
                  >
                    {ROLES.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-2">
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      u.activo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {u.activo ? 'activo' : 'inactivo'}
                  </span>
                </td>
                <td className="px-4 py-2 space-x-3">
                  <button
                    className="text-blue-600 hover:underline"
                    onClick={() => {
                      setResetPasswordId(u.id);
                      setNuevaPassword('');
                    }}
                  >
                    Resetear contraseña
                  </button>
                  <button
                    className="text-gray-500 hover:underline"
                    onClick={() => toggleActivoMutation.mutate({ id: u.id, activo: !u.activo })}
                  >
                    {u.activo ? 'Desactivar' : 'Activar'}
                  </button>
                </td>
              </tr>
            ))}
            {usuariosQuery.isSuccess && usuariosQuery.data.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  Sin usuarios registrados todavía.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {resetPasswordId !== null && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center px-4">
          <div className="bg-white rounded-lg p-5 w-full max-w-sm space-y-4">
            <h3 className="font-medium text-gray-900">Resetear contraseña</h3>
            <PasswordInput
              minLength={8}
              placeholder="Nueva contraseña (mínimo 8 caracteres)"
              value={nuevaPassword}
              onChange={(e) => setNuevaPassword(e.target.value)}
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900"
                onClick={() => setResetPasswordId(null)}
              >
                Cancelar
              </button>
              <button
                disabled={nuevaPassword.length < 8 || resetPasswordMutation.isPending}
                className="px-3 py-1.5 text-sm rounded-md bg-indigo-600 text-white disabled:opacity-50"
                onClick={() =>
                  resetPasswordMutation.mutate({ id: resetPasswordId, password: nuevaPassword })
                }
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
