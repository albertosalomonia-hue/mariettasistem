import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { useAuth } from '../api/AuthContext';
import { AuthImage } from '../components/AuthImage';
import { ESTADO_BAR, ESTADO_LABEL } from '../api/estados';
import { calcularVigencia, VIGENCIA_ESTILO } from '../api/vigencia';
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

function diasLabel(dias: number): string {
  if (dias < 0) return `Vencido hace ${Math.abs(dias)} día${Math.abs(dias) === 1 ? '' : 's'}`;
  if (dias === 0) return 'Vence hoy';
  return `${dias} día${dias === 1 ? '' : 's'} restantes`;
}

export function DashboardPage() {
  const { usuario } = useAuth();
  const navigate = useNavigate();

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

  const empleados = (empleadosQuery.data ?? []).filter((e) => e.estado === 'activo');
  const plantillasActivas = (plantillasQuery.data ?? []).filter((p) => p.activa).length;
  const contratos = contratosQuery.data ?? [];
  const contratosFirmados = contratos.filter((c) => c.estado === 'firmado').length;

  const porEstado = contratos.reduce<Record<string, number>>((acc, c) => {
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
        <KpiCard label="Empleados activos" value={empleados.length} icon={IconUsers} accent="bg-indigo-500" />
        <KpiCard label="Plantillas activas" value={plantillasActivas} icon={IconTemplate} accent="bg-blue-500" />
        <KpiCard label="Contratos generados" value={contratos.length} icon={IconContract} accent="bg-amber-500" />
        <KpiCard label="Contratos firmados" value={contratosFirmados} icon={IconDashboard} accent="bg-green-500" />
      </div>

      <div>
        <h2 className="font-medium text-gray-900 mb-3">Vigencia de contratos por empleado</h2>
        <p className="text-xs text-gray-400 mb-3">Haz clic en una tarjeta para ver los contratos de ese empleado.</p>
        {empleados.length === 0 ? (
          <p className="text-sm text-gray-400">Sin empleados activos registrados todavía.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {empleados.map((emp) => {
              const vigencia = calcularVigencia(contratos, emp.id);
              const estilo = VIGENCIA_ESTILO[vigencia.estado];
              const mostrarBoton = vigencia.estado !== 'vigente';

              return (
                <div
                  key={emp.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate(`/contratos?filtro_empleado=${emp.id}`)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') navigate(`/contratos?filtro_empleado=${emp.id}`);
                  }}
                  className={`border rounded-2xl p-5 space-y-4 cursor-pointer select-none transition-all duration-150 hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.97] active:shadow-sm ${estilo.tarjeta}`}
                >
                  <div className="w-full flex flex-col items-center text-center gap-2">
                    <AuthImage
                      src={emp.foto_path ? `/empleados/${emp.id}/foto` : null}
                      alt={emp.nombre_completo}
                      className="w-20 h-20 rounded-lg object-cover shrink-0"
                      fallback={
                        <div className="w-20 h-20 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center text-lg font-semibold shrink-0">
                          {iniciales(emp.nombre_completo)}
                        </div>
                      }
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{emp.nombre_completo}</p>
                      <p className="text-xs text-gray-400 truncate">{emp.cargo_default}</p>
                    </div>
                    <span className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-medium ${estilo.badge}`}>
                      {estilo.label}
                    </span>
                  </div>

                  <div>
                    <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${estilo.barra}`}
                        style={{ width: `${vigencia.contrato ? vigencia.porcentaje : 0}%` }}
                      />
                    </div>
                    <p className="mt-2 text-sm text-gray-500">
                      {vigencia.diasRestantes === null ? 'Nunca se le generó un contrato' : diasLabel(vigencia.diasRestantes)}
                    </p>
                  </div>

                  {mostrarBoton && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/contratos?empleado_id=${emp.id}`);
                      }}
                      className="w-full px-4 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 active:scale-[0.97] transition-transform"
                    >
                      + Generar nuevo contrato
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="font-medium text-gray-900 mb-4">Contratos por estado</h2>
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
