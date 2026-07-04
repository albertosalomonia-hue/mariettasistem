import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, apiErrorMessage } from './client';
import { apiArchivos } from './archivosClient';

const clientes = [api, apiArchivos];

export interface Usuario {
  id: number;
  nombre_completo: string;
  usuario: string;
  email: string | null;
  rol: 'super_admin' | 'rrhh' | 'gerente' | 'supervisor' | 'trabajador';
  empleado_id: number | null;
  must_change_password: boolean;
}

interface AuthContextValue {
  usuario: Usuario | null;
  token: string | null;
  isReady: boolean;
  login: (usuario: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const TOKEN_KEY = 'marietta_token';
const USER_KEY = 'marietta_usuario';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [usuario, setUsuario] = useState<Usuario | null>(() => {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as Usuario) : null;
  });
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    for (const cliente of clientes) {
      if (token) {
        cliente.defaults.headers.common.Authorization = `Bearer ${token}`;
      } else {
        delete cliente.defaults.headers.common.Authorization;
      }
    }
    setIsReady(true);
  }, [token]);

  useEffect(() => {
    const manejarRespuesta = (res: any) => res;
    const manejarError = (err: any) => {
      if (err.response?.status === 401) {
        setToken(null);
        setUsuario(null);
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
      }
      return Promise.reject(err);
    };

    const interceptores = clientes.map((cliente) =>
      cliente.interceptors.response.use(manejarRespuesta, manejarError),
    );
    return () => {
      clientes.forEach((cliente, i) => cliente.interceptors.response.eject(interceptores[i]));
    };
  }, []);

  const login = async (usuarioLogin: string, password: string) => {
    try {
      const { data } = await api.post('/auth/login', { usuario: usuarioLogin, password });
      setToken(data.token);
      setUsuario(data.usuario);
      localStorage.setItem(TOKEN_KEY, data.token);
      localStorage.setItem(USER_KEY, JSON.stringify(data.usuario));
    } catch (err) {
      throw new Error(apiErrorMessage(err));
    }
  };

  const logout = () => {
    setToken(null);
    setUsuario(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  };

  const value = useMemo(
    () => ({ usuario, token, isReady, login, logout }),
    [usuario, token, isReady],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
