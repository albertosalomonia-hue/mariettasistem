import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../api/AuthContext';
import { IconDashboard, IconUsers, IconTemplate, IconContract, IconAccount, IconLogout } from './icons';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: IconDashboard },
  { to: '/empleados', label: 'Empleados', icon: IconUsers },
  { to: '/plantillas', label: 'Plantillas', icon: IconTemplate },
  { to: '/contratos', label: 'Contratos', icon: IconContract },
];

export function Layout() {
  const { usuario, logout } = useAuth();
  const esTrabajador = usuario?.rol === 'trabajador';

  const items = esTrabajador
    ? []
    : usuario?.rol === 'super_admin'
      ? [...navItems, { to: '/usuarios', label: 'Usuarios', icon: IconAccount }]
      : navItems;

  return (
    <div className="min-h-screen flex bg-gray-50">
      {!esTrabajador && (
        <aside className="w-60 shrink-0 bg-[#151726] text-gray-300 flex flex-col">
          <div className="h-16 flex items-center gap-2 px-5 border-b border-white/10">
            <div className="w-8 h-8 rounded-md bg-indigo-500 text-white flex items-center justify-center font-semibold text-sm">
              M
            </div>
            <span className="font-semibold text-white tracking-wide">Marietta</span>
          </div>
          <nav className="flex-1 px-3 py-4 space-y-1">
            {items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-indigo-600 text-white'
                      : 'text-gray-400 hover:bg-white/5 hover:text-white'
                  }`
                }
              >
                <item.icon className="shrink-0" />
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="px-3 py-4 border-t border-white/10">
            <button
              onClick={logout}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:bg-white/5 hover:text-white"
            >
              <IconLogout />
              Salir
            </button>
          </div>
        </aside>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 shrink-0 bg-white border-b border-gray-200 flex items-center justify-end px-6 gap-3">
          <div className="text-right">
            <p className="text-sm font-medium text-gray-900 leading-tight">{usuario?.nombre_completo}</p>
            <p className="text-xs text-gray-400 leading-tight capitalize">{usuario?.rol.replace('_', ' ')}</p>
          </div>
          <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-semibold text-sm">
            {usuario?.nombre_completo?.[0] ?? '?'}
          </div>
          {esTrabajador && (
            <button
              onClick={logout}
              className="ml-2 text-sm font-medium text-gray-500 hover:text-gray-900"
            >
              Salir
            </button>
          )}
        </header>
        <main className="flex-1 px-6 py-8 max-w-6xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
