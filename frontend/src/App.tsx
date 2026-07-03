import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { RequireAuth } from './components/RequireAuth';
import { RequireRole } from './components/RequireRole';
import { useAuth } from './api/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { EmpleadosPage } from './pages/EmpleadosPage';
import { PlantillasPage } from './pages/PlantillasPage';
import { ContratosPage } from './pages/ContratosPage';
import { UsuariosPage } from './pages/UsuariosPage';
import { MiContratoPage } from './pages/MiContratoPage';

export const ROLES_ADMINISTRATIVOS = ['super_admin', 'rrhh', 'gerente', 'supervisor'] as const;

function IndexRedirect() {
  const { usuario } = useAuth();
  const destino = usuario?.rol === 'trabajador' ? '/mi-contrato' : '/dashboard';
  return <Navigate to={destino} replace />;
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireAuth />}>
        <Route element={<Layout />}>
          <Route index element={<IndexRedirect />} />
          <Route path="/mi-contrato" element={<MiContratoPage />} />
          <Route element={<RequireRole roles={[...ROLES_ADMINISTRATIVOS]} />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/empleados" element={<EmpleadosPage />} />
            <Route path="/plantillas" element={<PlantillasPage />} />
            <Route path="/contratos" element={<ContratosPage />} />
          </Route>
          <Route element={<RequireRole roles={['super_admin']} />}>
            <Route path="/usuarios" element={<UsuariosPage />} />
          </Route>
        </Route>
      </Route>
    </Routes>
  );
}

export default App;
