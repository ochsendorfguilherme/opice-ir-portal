import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Lock, AlertCircle } from 'lucide-react';
import { getStorage, KEYS } from '../utils/storage';
import OpiceLogo from '../components/OpiceLogo';

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) {
    if (user.role === 'admin') return <Navigate to="/admin" replace />;
    const info = getStorage(KEYS.info(user.clientId));
    const hasInfo = info?.nomeCliente && info?.dataIncidente && info?.dataConhecimento && info?.codigoCliente && info?.contexto?.length >= 30;
    if (!hasInfo) return <Navigate to="/informacoes" replace />;
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    await new Promise(r => setTimeout(r, 400));
    const result = login(email.trim(), password);
    setLoading(false);
    if (result.success) {
      if (result.user.role === 'admin') {
        navigate('/admin');
      } else {
        const info = getStorage(KEYS.info(result.user.clientId));
        const hasInfo = info?.nomeCliente && info?.dataIncidente && info?.dataConhecimento && info?.codigoCliente && info?.contexto?.length >= 30;
        navigate(hasInfo ? '/dashboard' : '/informacoes');
      }
    } else {
      setError(result.error);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left — Black panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#111111] flex-col justify-between p-12">
        <div>
          <OpiceLogo />
          <div className="mt-4 flex items-center gap-1.5">
            <Lock size={10} className="text-[#F59E0B]" />
            <span className="font-mono text-xs text-[#F59E0B]">TLP:AMBER+STRICT</span>
          </div>
        </div>
        <div>
          <h1 className="font-syne font-extrabold text-white text-5xl leading-tight uppercase">
            Incident<br />Response<br />Portal
          </h1>
          <p className="text-gray-400 font-dm mt-6 text-base max-w-xs">
            Gestão centralizada de resposta a incidentes cibernéticos. Seguro. Auditável. Regulatório.
          </p>
        </div>
        <div>
          <div className="bg-white/5 border border-white/10 p-4">
            <p className="text-gray-500 font-mono text-xs">
              Sistema de uso restrito. Acesso não autorizado é crime nos termos da Lei nº 12.737/2012.
            </p>
          </div>
        </div>
      </div>

      {/* Right — Login form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-white px-8">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <OpiceLogo light />
          </div>

          <div className="mb-8">
            <h2 className="font-syne font-extrabold text-[#111111] text-3xl uppercase">Acesso ao Portal</h2>
            <p className="text-[#555555] font-dm mt-1 text-sm">Entre com suas credenciais para continuar</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block font-mono text-xs font-medium uppercase text-[#111111] mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="seu@email.com.br"
                className="w-full border border-[#E0E0E0] px-4 py-3 font-dm text-sm focus:outline-none focus:border-[#111111] transition-colors"
              />
            </div>
            <div>
              <label className="block font-mono text-xs font-medium uppercase text-[#111111] mb-1.5">
                Senha
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full border border-[#E0E0E0] px-4 py-3 font-dm text-sm focus:outline-none focus:border-[#111111] transition-colors"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 px-4 py-3 text-red-700 font-dm text-sm">
                <AlertCircle size={15} />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#111111] text-white font-dm font-medium py-3.5 text-sm hover:bg-[#333] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Verificando...' : 'Entrar no Portal →'}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-[#E0E0E0]">
            <p className="text-[#555555] font-dm text-xs">
              Problemas de acesso? Contate o time Opice Blum.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
