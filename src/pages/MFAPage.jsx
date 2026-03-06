import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft, CheckCircle2, Loader2, Lock, ShieldCheck } from 'lucide-react';
import OpiceLogo from '../components/OpiceLogo';

function AlertCircle({ size, className }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

export default function MFAPage() {
  const { pendingUser, verifyMFA, cancelMFA, authStep, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRefs = [useRef(), useRef(), useRef(), useRef(), useRef(), useRef()];

  useEffect(() => {
    if (authStep === 'AUTHENTICATED') {
      navigate(user?.role === 'admin' ? '/admin/modulos' : '/dashboard');
    } else if (authStep === 'UNAUTHENTICATED') {
      navigate('/login');
    }
  }, [authStep, navigate, user]);

  const handleChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const next = [...code];
    next[index] = value.slice(-1);
    setCode(next);
    if (value && index < 5) inputRefs[index + 1].current.focus();
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) inputRefs[index - 1].current.focus();
  };

  const handleConfirm = async (e) => {
    if (e) e.preventDefault();
    const fullCode = code.join('');
    if (fullCode.length < 6) {
      setError('Por favor, insira o código de 6 dígitos.');
      return;
    }

    setLoading(true);
    setError('');

    setTimeout(() => {
      const res = verifyMFA(fullCode);
      if (res.success) {
        const destination = location.state?.from?.pathname || (res.user.role === 'admin' ? '/admin/modulos' : '/dashboard');
        navigate(destination);
      } else {
        setError(res.error);
        setLoading(false);
      }
    }, 1200);
  };

  const handleBack = () => {
    cancelMFA();
    navigate('/login');
  };

  if (!pendingUser) return null;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(214,255,99,0.12),transparent_28%),linear-gradient(180deg,#f7f5ef_0%,#ece7dc_100%)] text-[var(--ink)] lg:grid lg:grid-cols-[0.95fr_1.05fr]">
      <section className="relative overflow-hidden bg-[linear-gradient(160deg,rgba(23,48,56,0.98)_0%,rgba(15,33,40,0.98)_100%)] px-8 py-10 text-white lg:flex lg:min-h-screen lg:flex-col lg:justify-between lg:px-12 lg:py-12">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(214,255,99,0.14),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(248,211,131,0.12),transparent_22%)]" />
        <div className="relative z-10">
          <OpiceLogo />
          <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/6 px-3 py-2">
            <Lock size={12} className="text-[#f8d383]" />
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#f8d383]">TLP:AMBER+STRICT</span>
          </div>
        </div>

        <div className="relative z-10 mt-16 max-w-lg lg:mt-0">
          <p className="section-kicker text-white/60">Autenticação adicional</p>
          <h1 className="mt-5 font-syne text-5xl font-extrabold uppercase leading-[0.92] tracking-[-0.04em] text-white md:text-6xl">
            Verificação
            <br />
            em duas
            <br />
            etapas
          </h1>
          <p className="mt-8 max-w-md font-dm text-base leading-7 text-white/72 md:text-lg">
            Antes de liberar o portal, confirme o código temporário vinculado a este acesso.
          </p>

          <div className="mt-10 rounded-[24px] border border-white/10 bg-white/6 p-5 backdrop-blur-sm">
            <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#f8d383]">Fluxo de segurança</div>
            <div className="mt-3 flex items-center gap-3 text-white">
              <ShieldCheck size={18} className="text-[var(--accent)]" />
              <span className="font-dm text-sm text-white/72">Use qualquer código de 6 dígitos neste ambiente de teste.</span>
            </div>
          </div>
        </div>

        <button onClick={handleBack} className="relative z-10 inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/6 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-white/70 transition-colors hover:bg-white/10 hover:text-white">
          <ArrowLeft size={12} /> Voltar para login
        </button>
      </section>

      <section className="flex items-center justify-center px-6 py-10 lg:px-12">
        <div className="w-full max-w-[32rem]">
          <div className="page-hero-card shadow-[0_28px_64px_rgba(21,38,43,0.12)]">
            <div className="mb-8 flex items-start justify-between gap-4">
              <div>
                <p className="section-kicker">Código temporário</p>
                <h2 className="mt-3 font-syne text-3xl font-extrabold uppercase tracking-[-0.04em] text-[var(--ink)] md:text-4xl">Confirmar acesso</h2>
                <p className="mt-3 max-w-sm font-dm text-sm leading-6 text-[var(--ink-soft)]">Insira o código de seis dígitos para concluir a autenticação do usuário <span className="font-semibold text-[var(--ink)]">{pendingUser.email}</span>.</p>
              </div>
              <div className="hidden h-12 w-12 items-center justify-center rounded-[18px] bg-[rgba(214,255,99,0.18)] text-[#6e8617] md:flex">
                <ShieldCheck size={20} />
              </div>
            </div>

            <form onSubmit={handleConfirm}>
              <div className="mb-8 flex justify-between gap-2 md:gap-3">
                {code.map((digit, i) => {
                  const active = digit !== '';
                  const classes = active
                    ? 'border-[rgba(183,236,35,0.42)] bg-[rgba(214,255,99,0.18)] text-[#6e8617] shadow-[inset_0_0_0_1px_rgba(214,255,99,0.08)]'
                    : 'border-[rgba(21,38,43,0.1)] bg-white text-[var(--ink)] focus:border-[rgba(183,236,35,0.42)] focus:ring-4 focus:ring-[rgba(214,255,99,0.12)]';

                  return (
                    <input
                      key={i}
                      ref={inputRefs[i]}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleChange(i, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(i, e)}
                      className={`h-16 w-12 rounded-[20px] border text-center font-syne text-2xl font-bold transition-all focus:outline-none md:w-14 ${classes}`}
                      autoFocus={i === 0}
                    />
                  );
                })}
              </div>

              {error && (
                <div className="mb-6 flex items-start gap-3 rounded-[20px] border border-red-200 bg-red-50/90 px-4 py-3 text-sm text-red-700">
                  <AlertCircle size={16} className="mt-0.5 shrink-0" />
                  <span className="font-dm leading-6">{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || code.join('').length < 6}
                className={`flex h-14 w-full items-center justify-center gap-2 rounded-full font-mono text-[10px] font-bold uppercase tracking-[0.16em] transition-all ${loading || code.join('').length < 6 ? 'cursor-not-allowed border border-[rgba(21,38,43,0.08)] bg-white/75 text-[var(--ink-soft)]' : 'btn-primary'}`}
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Verificando
                  </>
                ) : (
                  <>
                    Confirmar código
                    <CheckCircle2 size={16} />
                  </>
                )}
              </button>
            </form>

            <div className="toolbar-strip mt-8">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--ink-soft)]">Ambiente de teste</p>
              <p className="mt-2 font-dm text-sm leading-6 text-[var(--ink-soft)]">Neste ambiente, qualquer sequência numérica com 6 dígitos é aceita para seguir.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
