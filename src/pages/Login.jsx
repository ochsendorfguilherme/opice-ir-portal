import { useState, useEffect, useRef } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Lock, AlertCircle, ShieldCheck, RefreshCw } from 'lucide-react';
import { getStorage, setStorage, KEYS } from '../utils/storage';
import OpiceLogo from '../components/OpiceLogo';

function maskEmail(email) {
  if (!email) return '—';
  const [local, domain] = email.split('@');
  if (!domain) return email;
  return `${local.slice(0, 2)}***@${domain}`;
}

function MFAInput({ onVerify, email, onBack }) {
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(300); // 5 min
  const [resendCooldown, setResendCooldown] = useState(60);
  const refs = useRef([]);

  useEffect(() => {
    refs.current[0]?.focus();
    const iv = setInterval(() => setCountdown(c => c > 0 ? c - 1 : 0), 1000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const iv = setInterval(() => setResendCooldown(c => c > 0 ? c - 1 : 0), 1000);
    return () => clearInterval(iv);
  }, [resendCooldown]);

  const handleDigit = (i, val) => {
    const v = val.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[i] = v;
    setDigits(next);
    if (v && i < 5) refs.current[i + 1]?.focus();
  };

  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) refs.current[i - 1]?.focus();
  };

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setDigits(pasted.split(''));
      refs.current[5]?.focus();
    }
  };

  const allFilled = digits.every(d => d !== '');

  const handleVerify = async () => {
    if (!allFilled) return;
    setLoading(true);
    await new Promise(r => setTimeout(r, 800));
    setLoading(false);
    const expiry = Date.now() + 8 * 60 * 60 * 1000; // 8h
    setStorage(KEYS.mfaVerified(email), { verified: true, expiry });
    onVerify();
  };

  const mins = Math.floor(countdown / 60);
  const secs = countdown % 60;

  return (
    <div className="w-full max-w-sm">
      <div className="flex flex-col items-center mb-8">
        <div className="w-16 h-16 bg-[#CAFF00] flex items-center justify-center mb-4">
          <ShieldCheck size={32} className="text-[#111111]" />
        </div>
        <h2 className="font-syne font-extrabold text-[#111111] text-2xl uppercase text-center">
          Verificação de Segurança
        </h2>
        <p className="text-[#555555] font-dm text-sm text-center mt-2">
          Um código de 6 dígitos foi enviado para<br />
          <span className="font-medium text-[#111111]">{maskEmail(email)}</span>
        </p>
      </div>

      {/* 6-digit inputs */}
      <div className="flex gap-2 justify-center mb-4" onPaste={handlePaste}>
        {digits.map((d, i) => (
          <input
            key={i}
            ref={el => refs.current[i] = el}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={d}
            onChange={e => handleDigit(i, e.target.value)}
            onKeyDown={e => handleKeyDown(i, e)}
            className={`w-11 h-14 text-center border-2 font-mono text-xl focus:outline-none transition-colors ${d ? 'border-[#111111] bg-[#CAFF00] text-[#111111] font-bold' : 'border-[#E0E0E0] text-[#111111] focus:border-[#111111]'
              }`}
          />
        ))}
      </div>

      {/* Countdown */}
      <div className="text-center mb-6">
        <span className="font-mono text-sm text-[#555555]">
          Código expira em: <span className={`font-bold ${countdown < 60 ? 'text-red-600' : 'text-[#111111]'}`}>
            {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
          </span>
        </span>
      </div>

      <button
        onClick={handleVerify}
        disabled={!allFilled || loading}
        className="w-full bg-[#111111] text-white font-dm font-medium py-3.5 text-sm hover:bg-[#333] transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-4 flex items-center justify-center gap-2"
      >
        {loading ? (
          <><RefreshCw size={14} className="animate-spin" /> Verificando...</>
        ) : 'Verificar →'}
      </button>

      <div className="flex items-center justify-between">
        <button onClick={onBack} className="font-dm text-xs text-[#555555] hover:text-[#111111] transition-colors">
          ← Usar outras credenciais
        </button>
        {resendCooldown <= 0 ? (
          <button onClick={() => setResendCooldown(60)} className="font-dm text-xs text-blue-600 hover:underline">
            Reenviar código
          </button>
        ) : (
          <span className="font-mono text-xs text-gray-400">Reenviar em {resendCooldown}s</span>
        )}
      </div>

      <p className="text-center mt-6 font-mono text-xs text-gray-300">[MODO TESTE] Use qualquer 6 dígitos</p>
    </div>
  );
}

export default function Login() {
  const { user, login, authStep } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (authStep === 'AUTHENTICATED') {
      if (user.role === 'admin') {
        navigate('/admin');
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
  }, [authStep, user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Pequeno delay para UX
    await new Promise(r => setTimeout(r, 600));

    const result = login(email.trim(), password);
    setLoading(false);

    if (result.success) {
      if (result.needsMFA) {
        navigate('/mfa');
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

      {/* Right — Form */}
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
              <label className="block font-mono text-xs font-medium uppercase text-[#111111] mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="seu@email.com.br"
                className="w-full border border-[#E0E0E0] px-4 py-3 font-dm text-sm focus:outline-none focus:border-[#111111] transition-colors"
                autoComplete="email"
              />
            </div>
            <div>
              <label className="block font-mono text-xs font-medium uppercase text-[#111111] mb-1.5">Senha</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full border border-[#E0E0E0] px-4 py-3 font-dm text-sm focus:outline-none focus:border-[#111111] transition-colors"
                autoComplete="current-password"
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
              {loading ? 'Verificando credenciais...' : 'Entrar no Portal →'}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-[#E0E0E0]">
            <p className="text-[#555555] font-dm text-xs">Problemas de acesso? Contate o time Opice Blum.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
