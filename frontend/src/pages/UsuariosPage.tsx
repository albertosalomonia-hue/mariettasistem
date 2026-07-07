import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiErrorMessage } from '../api/client';
import { useAuth } from '../api/AuthContext';
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

const PASSWORD_POR_DEFECTO = '12345678';

const emptyForm = {
  empresa_id: 0,
  empleado_id: 0,
  nombre_completo: '',
  usuario: '',
  email: '',
  password: PASSWORD_POR_DEFECTO,
  rol: 'rrhh' as Rol,
};

const MAPA_ACENTOS: Record<string, string> = {
  á: 'a', é: 'e', í: 'i', ó: 'o', ú: 'u', ñ: 'n', ü: 'u',
};

function quitarAcentos(texto: string): string {
  return texto
    .split('')
    .map((c) => MAPA_ACENTOS[c] ?? c)
    .join('');
}

/** "TORIBIO TARICUARIMA MALAFAYA" -> "toribio.taricuarima" (nombre.apellido, sin tildes/ñ). */
function generarUsuarioDesdeNombre(nombreCompleto: string): string {
  const limpio = quitarAcentos(nombreCompleto.toLowerCase().trim());
  const [nombre, apellido] = limpio.split(/\s+/);
  return apellido ? `${nombre}.${apellido}` : nombre || '';
}

export function UsuariosPage() {
  const queryClient = useQueryClient();
  const { usuario: usuarioActual } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [resetPasswordId, setResetPasswordId] = useState<number | null>(null);
  const [nuevaPassword, setNuevaPassword] = useState('');
  const [cambioRolPendiente, setCambioRolPendiente] = useState<{
    id: number;
    nombre: string;
    nuevoRol: Rol;
    rolAnterior: Rol;
  } | null>(null);
  const [cambioEmpleadoPendiente, setCambioEmpleadoPendiente] = useState<{
    id: number;
    nombre: string;
    nuevoEmpleadoId: number;
    nuevoEmpleadoNombre: string;
  } | null>(null);

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
          empleado_id: form.rol !== 'super_admin' ? form.empleado_id || undefined : undefined,
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      setError(null);
    },
    onError: (err) => setError(apiErrorMessage(err)),
  });

  const cambiarEmpleadoMutation = useMutation({
    mutationFn: async ({ id, empleado_id }: { id: number; empleado_id: number }) =>
      (await api.put(`/usuarios/${id}`, { empleado_id })).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      setError(null);
    },
    onError: (err) => setError(apiErrorMessage(err)),
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
          {form.rol !== 'super_admin' && (
            <label className="block">
              <span className="block text-xs font-medium text-gray-500 mb-1">Empleado vinculado</span>
              <select
                required
                className="input"
                value={form.empleado_id}
                onChange={(e) => {
                  const id = Number(e.target.value);
                  const emp = empleadosQuery.data?.find((x) => x.id === id);
                  setForm((f) => ({
                    ...f,
                    empleado_id: id,
                    nombre_completo: emp ? emp.nombre_completo : f.nombre_completo,
                    usuario: emp ? generarUsuarioDesdeNombre(emp.nombre_completo) : f.usuario,
                  }));
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
          )}
          <label className="block">
            <span className="block text-xs font-medium text-gray-500 mb-1">
              Contraseña inicial (por defecto {PASSWORD_POR_DEFECTO})
            </span>
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
      {error && !showForm && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-md px-4 py-3">
          {error}
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-lg overflow-x-auto">
        <table className="w-full text-sm min-w-[900px]">
          <thead className="bg-gray-50 text-gray-500 text-left">
            <tr>
              <th className="px-4 py-2 font-medium">Nombre</th>
              <th className="px-4 py-2 font-medium">Usuario</th>
              <th className="px-4 py-2 font-medium">Email</th>
              <th className="px-4 py-2 font-medium">Rol</th>
              <th className="px-4 py-2 font-medium">Empleado vinculado</th>
              <th className="px-4 py-2 font-medium">Estado</th>
              <th className="px-4 py-2 font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {(usuariosQuery.data ?? []).map((u) => {
              const esMiPropiaCuenta = u.id === usuarioActual?.id;
              const esCuentaAdmin = u.usuario === 'admin';
              return (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 text-gray-900">
                    {u.nombre_completo}
                    {esMiPropiaCuenta && <span className="ml-2 text-xs text-gray-400">(tú)</span>}
                  </td>
                  <td className="px-4 py-2 text-gray-600">{u.usuario}</td>
                  <td className="px-4 py-2 text-gray-400">{u.email ?? '—'}</td>
                  <td className="px-4 py-2">
                    <select
                      disabled={esMiPropiaCuenta}
                      title={esMiPropiaCuenta ? 'No puedes cambiar tu propio rol' : undefined}
                      className="text-sm border border-gray-200 rounded-md px-2 py-1 disabled:bg-gray-50 disabled:text-gray-400"
                      value={u.rol}
                      onChange={(e) =>
                        setCambioRolPendiente({
                          id: u.id,
                          nombre: u.nombre_completo,
                          nuevoRol: e.target.value as Rol,
                          rolAnterior: u.rol,
                        })
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
                    {u.rol === 'super_admin' ? (
                      <span className="text-xs text-gray-400">No aplica</span>
                    ) : (
                      <select
                        className="text-sm border border-gray-200 rounded-md px-2 py-1 max-w-[180px]"
                        value={u.empleado_id ?? 0}
                        onChange={(e) => {
                          const id = Number(e.target.value);
                          const emp = empleadosQuery.data?.find((x) => x.id === id);
                          if (!emp) return;
                          setCambioEmpleadoPendiente({
                            id: u.id,
                            nombre: u.nombre_completo,
                            nuevoEmpleadoId: id,
                            nuevoEmpleadoNombre: emp.nombre_completo,
                          });
                        }}
                      >
                        <option value={0} disabled>
                          Sin vincular
                        </option>
                        {(empleadosQuery.data ?? []).map((emp) => (
                          <option key={emp.id} value={emp.id}>
                            {emp.nombre_completo}
                          </option>
                        ))}
                      </select>
                    )}
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
                      disabled={esCuentaAdmin}
                      title={esCuentaAdmin ? 'La contraseña del usuario admin no puede restablecerse desde aquí' : undefined}
                      className="text-blue-600 hover:underline disabled:text-gray-300 disabled:no-underline disabled:cursor-not-allowed"
                      onClick={() => {
                        setResetPasswordId(u.id);
                        setNuevaPassword('');
                      }}
                    >
                      Resetear contraseña
                    </button>
                    <button
                      disabled={esMiPropiaCuenta}
                      title={esMiPropiaCuenta ? 'No puedes desactivar tu propia cuenta' : undefined}
                      className="text-gray-500 hover:underline disabled:text-gray-300 disabled:no-underline disabled:cursor-not-allowed"
                      onClick={() => toggleActivoMutation.mutate({ id: u.id, activo: !u.activo })}
                    >
                      {u.activo ? 'Desactivar' : 'Activar'}
                    </button>
                  </td>
                </tr>
              );
            })}
            {usuariosQuery.isSuccess && usuariosQuery.data.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
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
            {resetPasswordId === usuarioActual?.id && (
              <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                Estás restableciendo la contraseña de tu propia cuenta. La sesión actual seguirá activa, pero
                necesitarás la nueva contraseña la próxima vez que ingreses.
              </p>
            )}
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

      {cambioRolPendiente && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center px-4">
          <div className="bg-white rounded-lg p-5 w-full max-w-sm space-y-4">
            <h3 className="font-medium text-gray-900">Cambiar rol</h3>
            <p className="text-sm text-gray-600">
              ¿Cambiar el rol de <strong>{cambioRolPendiente.nombre}</strong> a{' '}
              <strong>{ROLES.find((r) => r.value === cambioRolPendiente.nuevoRol)?.label}</strong>?
            </p>
            <div className="flex justify-end gap-2">
              <button
                className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900"
                onClick={() => setCambioRolPendiente(null)}
              >
                Cancelar
              </button>
              <button
                disabled={cambiarRolMutation.isPending}
                className="px-3 py-1.5 text-sm rounded-md bg-indigo-600 text-white disabled:opacity-50"
                onClick={() => {
                  cambiarRolMutation.mutate({
                    id: cambioRolPendiente.id,
                    rol: cambioRolPendiente.nuevoRol,
                  });
                  setCambioRolPendiente(null);
                }}
              >
                {cambiarRolMutation.isPending ? 'Guardando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {cambioEmpleadoPendiente && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center px-4">
          <div className="bg-white rounded-lg p-5 w-full max-w-sm space-y-4">
            <h3 className="font-medium text-gray-900">Cambiar empleado vinculado</h3>
            <p className="text-sm text-gray-600">
              ¿Vincular la cuenta de <strong>{cambioEmpleadoPendiente.nombre}</strong> al empleado{' '}
              <strong>{cambioEmpleadoPendiente.nuevoEmpleadoNombre}</strong>?
            </p>
            <div className="flex justify-end gap-2">
              <button
                className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900"
                onClick={() => setCambioEmpleadoPendiente(null)}
              >
                Cancelar
              </button>
              <button
                disabled={cambiarEmpleadoMutation.isPending}
                className="px-3 py-1.5 text-sm rounded-md bg-indigo-600 text-white disabled:opacity-50"
                onClick={() => {
                  cambiarEmpleadoMutation.mutate({
                    id: cambioEmpleadoPendiente.id,
                    empleado_id: cambioEmpleadoPendiente.nuevoEmpleadoId,
                  });
                  setCambioEmpleadoPendiente(null);
                }}
              >
                {cambiarEmpleadoMutation.isPending ? 'Guardando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
