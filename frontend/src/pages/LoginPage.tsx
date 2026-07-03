import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../api/AuthContext';
import { PasswordInput } from '../components/PasswordInput';
import marietaLoginImg from '../assets/marietta-login.jpg';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(usuario, password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center px-4 py-12">
      <img
        src={marietaLoginImg}
        alt=""
        className="fixed inset-0 w-full h-full object-cover object-center"
      />
      <div className="fixed inset-0 bg-gradient-to-b from-black/20 via-black/10 to-black/35" />

      <div className="relative w-full max-w-sm bg-white/95 backdrop-blur-sm border border-white/20 rounded-xl p-6 space-y-5 shadow-xl">
        <div className="text-center space-y-1">
          <div className="w-10 h-10 mx-auto rounded-md bg-indigo-600 text-white flex items-center justify-center font-semibold">
            M
          </div>
          <h1 className="text-lg font-semibold text-gray-900">Marietta · Contratos</h1>
          <p className="text-sm text-gray-500">Ingresa con tu cuenta de administrador</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <label className="block">
            <span className="block text-xs font-medium text-gray-500 mb-1">Usuario</span>
            <input
              required
              type="text"
              className="input"
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              autoFocus
            />
          </label>
          <label className="block">
            <span className="block text-xs font-medium text-gray-500 mb-1">Contraseña</span>
            <PasswordInput required value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-2 rounded-md bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  );
}
