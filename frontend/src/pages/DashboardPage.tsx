import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { useAuth } from '../api/AuthContext';
import { AuthImage } from '../components/AuthImage';
import { ESTADO_BAR, ESTADO_LABEL } from '../api/estados';
import { IconUsers, IconTemplate, IconContract, IconDashboard } from '../components/icons';
import type { Contrato, Empleado, Plantilla } from '../api/types';

interface KpiCardProps {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
}

function KpiCard({ label, value, icon: Icon, accent }: KpiCardProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 flex items-center gap-4">
      <div className={`w-11 h-11 rounded-lg flex items-center justify-center shrink-0 ${accent}`}>
        <Icon className="text-white" />
      </div>
      <div>
        <p className="text-2xl font-semibold text-gray-900 leading-tight">{value}</p>
        <p className="text-sm text-gray-500">{label}</p>
      </div>
    </div>
  );
}

function iniciales(nombre: string): string {
  return nombre
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();
}

export function DashboardPage() {
  const { usuario } = useAuth();
  const [empleadoSeleccionado, setEmpleadoSeleccionado] = useState<number | null>(null);

  const empleadosQuery = useQuery({
    queryKey: ['empleados', ''],
    queryFn: async () => (await api.get<Empleado[]>('/empleados')).data,
  });
  const plantillasQuery = useQuery({
    queryKey: ['plantillas'],
    queryFn: async () => (await api.get<Plantilla[]>('/plantillas')).data,
  });
  const contratosQuery = useQuery({
    queryKey: ['contratos'],
    queryFn: async () => (await api.get<Contrato[]>('/contratos')).data,
  });

  const empleados = empleadosQuery.data ?? [];
  const empleadosActivos = empleados.filter((e) => e.estado === 'activo').length;
  const plantillasActivas = (plantillasQuery.data ?? []).filter((p) => p.activa).length;
  const contratos = contratosQuery.data ?? [];
  const contratosFirmados = contratos.filter((c) => c.estado === 'firmado').length;

  const contarContratos = (empleadoId: number) =>
    contratos.filter((c) => c.empleado_id === empleadoId).length;

  const empleadoActivo = empleados.find((e) => e.id === empleadoSeleccionado) ?? null;
  const contratosFiltrados = empleadoSeleccionado
    ? contratos.filter((c) => c.empleado_id === empleadoSeleccionado)
    : contratos;

  const porEstado = contratosFiltrados.reduce<Record<string, number>>((acc, c) => {
    acc[c.estado] = (acc[c.estado] ?? 0) + 1;
    return acc;
  }, {});
  const maxEstado = Math.max(1, ...Object.values(porEstado));
  const estadosConDatos = (Object.keys(porEstado) as (keyof typeof ESTADO_LABEL)[]).sort(
    (a, b) => porEstado[b] - porEstado[a],
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Hola, {usuario?.nombre_completo}</h1>
        <p className="text-sm text-gray-500">Resumen general del sistema.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Empleados activos" value={empleadosActivos} icon={IconUsers} accent="bg-indigo-500" />
        <KpiCard label="Plantillas activas" value={plantillasActivas} icon={IconTemplate} accent="bg-blue-500" />
        <KpiCard label="Contratos generados" value={contratos.length} icon={IconContract} accent="bg-amber-500" />
        <KpiCard label="Contratos firmados" value={contratosFirmados} icon={IconDashboard} accent="bg-green-500" />
      </div>

      <div>
        <h2 className="font-medium text-gray-900 mb-3">Empleados</h2>
        {empleados.length === 0 ? (
          <p className="text-sm text-gray-400">Sin empleados registrados todavía.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {empleados.map((emp) => {
              const seleccionado = emp.id === empleadoSeleccionado;
              return (
                <button
                  key={emp.id}
                  onClick={() => setEmpleadoSeleccionado(seleccionado ? null : emp.id)}
                  className={`bg-white border rounded-xl p-4 flex flex-col items-center text-center gap-2 transition-all ${
                    seleccionado
                      ? 'border-indigo-500 ring-2 ring-indigo-500'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <AuthImage
                    src={emp.foto_path ? `/empleados/${emp.id}/foto` : null}
                    alt={emp.nombre_completo}
                    className="w-16 h-16 rounded-full object-cover"
                    fallback={
                      <div className="w-16 h-16 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-semibold">
                        {iniciales(emp.nombre_completo)}
                      </div>
                    }
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-900 leading-tight">{emp.nombre_completo}</p>
                    <p className="text-xs text-gray-400">{emp.cargo_default}</p>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">
                    {contarContratos(emp.id)} contrato{contarContratos(emp.id) === 1 ? '' : 's'}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-medium text-gray-900">
            Contratos por estado
            {empleadoActivo && <span className="text-gray-400 font-normal"> — {empleadoActivo.nombre_completo}</span>}
          </h2>
          {empleadoActivo && (
            <button
              onClick={() => setEmpleadoSeleccionado(null)}
              className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
            >
              Quitar filtro
            </button>
          )}
        </div>
        {estadosConDatos.length === 0 ? (
          <p className="text-sm text-gray-400">Aún no hay contratos generados.</p>
        ) : (
          <div className="space-y-3">
            {estadosConDatos.map((estado) => (
              <div key={estado} className="flex items-center gap-3">
                <span className="w-24 shrink-0 text-sm text-gray-600">{ESTADO_LABEL[estado]}</span>
                <div className="flex-1 h-2.5 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${ESTADO_BAR[estado] ?? 'bg-gray-400'}`}
                    style={{ width: `${(porEstado[estado] / maxEstado) * 100}%` }}
                  />
                </div>
                <span className="w-8 shrink-0 text-sm text-gray-900 text-right font-medium">
                  {porEstado[estado]}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
