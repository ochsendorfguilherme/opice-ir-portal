import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { AlertCircle, ArrowRight, Lock, ShieldCheck } from 'lucide-react';
import { getStorage, KEYS } from '../utils/storage';
import OpiceLogo from '../components/OpiceLogo';

export default function Login() {
  const { user, login, authStep, authReady, demoAuthEnabled } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authReady) return;
    if (authStep === 'AUTHENTICATED') {
      if (user.role === 'admin') {
        navigate('/admin/modulos');
      } else {
        const info = getStorage(KEYS.info(user.clientId));
        const hasInfo = info?.nomeCliente && info?.dataIncidente && info?.dataConhecimento && info?.codigoCliente && info?.contexto?.length >= 30;
        navigate(hasInfo ? '/dashboard' : '/informacoes');
      }
    } else if (authStep === 'MFA_REQUIRED') {
      navigate('/mfa');
    } else if (authStep === 'FORCE_PASSWORD_CHANGE') {
      navigate('/change-password');
    }
  }, [authReady, authStep, user, navigate]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 600));
    const result = await login(email.trim(), password);
    setLoading(false);
    if (result.success) {
      if (result.needsMFA) navigate('/mfa');
    } else {
      setError(result.error);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(214,255,99,0.14),transparent_30%),linear-gradient(180deg,#f7f5ef_0%,#ece7dc_100%)] text-[var(--ink)] lg:grid lg:grid-cols-[1.08fr_0.92fr]">
      <section className="relative overflow-hidden bg-[linear-gradient(160deg,rgba(23,48,56,0.98)_0%,rgba(15,33,40,0.98)_100%)] px-8 py-10 text-white lg:flex lg:min-h-screen lg:flex-col lg:justify-between lg:px-12 lg:py-12">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(214,255,99,0.14),transparent_26%),radial-gradient(circle_at_bottom_right,rgba(248,211,131,0.12),transparent_22%)]" />
        <div className="relative z-10 flex items-start justify-between">
          <div>
            <OpiceLogo />
            <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/6 px-3 py-2">
              <Lock size={12} className="text-[#f8d383]" />
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#f8d383]">TLP:AMBER+STRICT</span>
            </div>
          </div>
        </div>

        <div className="relative z-10 mt-20 max-w-xl lg:mt-0">
          <p className="section-kicker text-white/60">Ambiente control room</p>
          <h1 className="mt-5 font-syne text-5xl font-extrabold uppercase leading-[0.92] tracking-[-0.04em] text-white md:text-6xl">
            Incident
            <br />
            response
            <br />
            portal
          </h1>
          <p className="mt-8 max-w-md font-dm text-base leading-7 text-white/72 md:text-lg">
            Gestão centralizada da resposta a incidentes cibernéticos com trilha auditável,
            coordenação jurídica e governança operacional.
          </p>

          <div className="mt-10 grid gap-4 md:grid-cols-2">
            <div className="rounded-[24px] border border-white/10 bg-white/6 p-5 backdrop-blur-sm">
              <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#f8d383]">Camada segura</div>
              <div className="mt-3 font-syne text-2xl font-bold text-white">MFA + trilha de auditoria</div>
              <p className="mt-2 font-dm text-sm leading-6 text-white/60">Fluxo protegido para acesso administrativo e clientes.</p>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/6 p-5 backdrop-blur-sm">
              <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#f8d383]">Operação guiada</div>
              <div className="mt-3 font-syne text-2xl font-bold text-white">Dashboard, PMO e War Room</div>
              <p className="mt-2 font-dm text-sm leading-6 text-white/60">Ambiente único para coordenar a crise ponta a ponta.</p>
            </div>
          </div>
        </div>

        <div className="relative z-10 mt-12 rounded-[24px] border border-white/10 bg-white/6 p-4 font-mono text-[11px] leading-5 text-white/45 backdrop-blur-sm lg:mt-0">
          Sistema de uso restrito. Acesso não autorizado é crime nos termos da Lei nº 12.737/2012.
        </div>
      </section>

      <section className="flex items-center justify-center px-6 py-10 lg:px-12">
        <div className="w-full max-w-[30rem]">
          <div className="page-hero-card shadow-[0_28px_64px_rgba(21,38,43,0.12)]">
            <div className="mb-8 flex items-start justify-between gap-4">
              <div>
                <p className="section-kicker">Acesso ao portal</p>
                <h2 className="mt-3 font-syne text-3xl font-extrabold uppercase tracking-[-0.04em] text-[var(--ink)] md:text-4xl">Entrar</h2>
                <p className="mt-3 max-w-sm font-dm text-sm leading-6 text-[var(--ink-soft)]">
                  Use suas credenciais para continuar no ambiente de resposta ao incidente.
                </p>
              </div>
              <div className="hidden h-12 w-12 items-center justify-center rounded-[18px] bg-[rgba(214,255,99,0.18)] text-[#6e8617] md:flex">
                <ShieldCheck size={20} />
              </div>
            </div>

            {!demoAuthEnabled && (
              <div className="mb-5 rounded-[20px] border border-amber-200 bg-amber-50/95 px-4 py-3 text-sm text-amber-800">
                A autenticação local de demonstração está desabilitada neste ambiente. Para acesso seguro, conecte um provedor de identidade real ou habilite <code className="font-mono text-xs">VITE_ENABLE_DEMO_AUTH=true</code> apenas em demonstrações controladas.
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--ink-soft)]">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  placeholder="seu@email.com.br"
                  className="field-control font-dm"
                  autoComplete="email"
                />
              </div>

              <div>
                <label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--ink-soft)]">Senha</label>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  placeholder=""
                  className="field-control font-sans"
                  autoComplete="current-password"
                />
              </div>

              {error && (
                <div className="flex items-start gap-3 rounded-[20px] border border-red-200 bg-red-50/90 px-4 py-3 text-sm text-red-700">
                  <AlertCircle size={16} className="mt-0.5 shrink-0" />
                  <span className="font-dm leading-6">{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn-primary flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? 'Verificando credenciais...' : <>Entrar no portal <ArrowRight size={16} /></>}
              </button>
            </form>

            <div className="toolbar-strip mt-8">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--ink-soft)]">Suporte</p>
              <p className="mt-2 font-dm text-sm leading-6 text-[var(--ink-soft)]">Problemas de acesso? Contate o time Opice Blum para validação do usuário e do cliente vinculado.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
