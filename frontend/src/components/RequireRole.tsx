import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../api/AuthContext';
import type { Rol } from '../api/types';

export function RequireRole({ roles }: { roles: Rol[] }) {
  const { usuario } = useAuth();

  if (!usuario || !roles.includes(usuario.rol)) {
    const fallback = usuario?.rol === 'trabajador' ? '/mi-contrato' : '/dashboard';
    return <Navigate to={fallback} replace />;
  }

  return <Outlet />;
}
