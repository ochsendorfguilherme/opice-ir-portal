import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { AlertCircle, ArrowRight, Lock, RefreshCw, ShieldCheck } from 'lucide-react';
import OpiceLogo from '../components/OpiceLogo';

export default function ChangePassword() {
  const { user, changePassword } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!user || !user.forcePasswordChange) {
    navigate('/dashboard', { replace: true });
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('A senha deve ter pelo menos 8 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])/.test(password)) {
      setError('A senha deve conter letras maiúsculas, minúsculas e números.');
      return;
    }

    setLoading(true);
    await new Promise((r) => setTimeout(r, 600));
    const success = changePassword(password);
    setLoading(false);

    if (success) navigate('/dashboard', { replace: true });
    else setError('Ocorreu um erro ao alterar a senha. Tente novamente.');
  };

  const inputClass = `w-full rounded-[20px] border px-4 py-3.5 font-dm text-sm text-[var(--ink)] shadow-[inset_0_1px_0_rgba(255,255,255,0.48)] focus:outline-none ${error ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-100' : 'border-[rgba(21,38,43,0.1)] bg-white focus:border-[rgba(183,236,35,0.42)] focus:ring-4 focus:ring-[rgba(214,255,99,0.12)]'}`;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(214,255,99,0.12),transparent_28%),linear-gradient(180deg,#f7f5ef_0%,#ece7dc_100%)] text-[var(--ink)] lg:grid lg:grid-cols-[1.02fr_0.98fr]">
      <section className="relative overflow-hidden bg-[linear-gradient(160deg,rgba(23,48,56,0.98)_0%,rgba(15,33,40,0.98)_100%)] px-8 py-10 text-white lg:flex lg:min-h-screen lg:flex-col lg:justify-between lg:px-12 lg:py-12">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(214,255,99,0.14),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(248,211,131,0.12),transparent_22%)]" />
        <div className="relative z-10">
          <OpiceLogo />
          <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/6 px-3 py-2">
            <Lock size={12} className="text-[#f8d383]" />
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#f8d383]">Primeiro acesso</span>
          </div>
        </div>

        <div className="relative z-10 mt-16 max-w-lg lg:mt-0">
          <p className="section-kicker text-white/60">Política de acesso</p>
          <h1 className="mt-5 font-syne text-5xl font-extrabold uppercase leading-[0.92] tracking-[-0.04em] text-white md:text-6xl">
            Atualize
            <br />
            sua senha
            <br />
            inicial
          </h1>
          <p className="mt-8 max-w-md font-dm text-base leading-7 text-white/72 md:text-lg">
            Por segurança, a senha temporária deve ser substituída antes da liberação completa do portal.
          </p>
        </div>

        <div className="relative z-10 rounded-[24px] border border-white/10 bg-white/6 p-4 font-mono text-[11px] leading-5 text-white/45 backdrop-blur-sm">
          Use uma senha com pelo menos 8 caracteres, incluindo letras maiúsculas, minúsculas e números.
        </div>
      </section>

      <section className="flex items-center justify-center px-6 py-10 lg:px-12">
        <div className="w-full max-w-[30rem]">
          <div className="app-panel rounded-[32px] p-7 shadow-[0_28px_64px_rgba(21,38,43,0.12)] md:p-9">
            <div className="mb-8 flex items-start justify-between gap-4">
              <div>
                <p className="section-kicker">Senha definitiva</p>
                <h2 className="mt-3 font-syne text-3xl font-extrabold uppercase tracking-[-0.04em] text-[var(--ink)] md:text-4xl">Nova senha</h2>
                <p className="mt-3 max-w-sm font-dm text-sm leading-6 text-[var(--ink-soft)]">Defina sua credencial definitiva para concluir o onboarding do acesso.</p>
              </div>
              <div className="hidden h-12 w-12 items-center justify-center rounded-[18px] bg-[rgba(214,255,99,0.18)] text-[#6e8617] md:flex">
                <ShieldCheck size={20} />
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--ink-soft)]">Nova senha</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="********" className={`${inputClass} font-sans`} />
                <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--ink-soft)]">Mínimo 8 caracteres, com letras maiúsculas, minúsculas e números.</p>
              </div>

              <div>
                <label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--ink-soft)]">Confirmar nova senha</label>
                <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required placeholder="********" className={`${inputClass} font-sans`} />
              </div>

              {error && (
                <div className="flex items-start gap-3 rounded-[20px] border border-red-200 bg-red-50/90 px-4 py-3 text-sm text-red-700">
                  <AlertCircle size={16} className="mt-0.5 shrink-0" />
                  <span className="font-dm leading-6">{error}</span>
                </div>
              )}

              <button type="submit" disabled={loading} className="btn-primary flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50">
                {loading ? <><RefreshCw size={14} className="animate-spin" /> Atualizando</> : <>Salvar nova senha <ArrowRight size={16} /></>}
              </button>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}
