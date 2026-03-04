import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import OpiceLogo from '../components/OpiceLogo';
import TLPBanner from '../components/TLPBanner';
import { Shield, ArrowLeft, CheckCircle, Loader2 } from 'lucide-react';

export default function MFAPage() {
    const { pendingUser, verifyMFA, cancelMFA, authStep } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [code, setCode] = useState(['', '', '', '', '', '']);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const inputRefs = [useRef(), useRef(), useRef(), useRef(), useRef(), useRef()];

    useEffect(() => {
        if (authStep === 'AUTHENTICATED') {
            navigate('/dashboard');
        } else if (authStep === 'UNAUTHENTICATED') {
            navigate('/login');
        }
    }, [authStep, navigate]);

    const handleChange = (index, value) => {
        if (!/^\d*$/.test(value)) return;

        const newCode = [...code];
        newCode[index] = value.slice(-1);
        setCode(newCode);

        if (value && index < 5) {
            inputRefs[index + 1].current.focus();
        }
    };

    const handleKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !code[index] && index > 0) {
            inputRefs[index - 1].current.focus();
        }
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

        // Simulação de delay para efeito visual premium
        setTimeout(() => {
            const res = verifyMFA(fullCode);
            if (res.success) {
                const destination = location.state?.from?.pathname || (res.user.role === 'admin' ? '/admin' : '/dashboard');
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
        <div className="min-h-screen bg-[#F9F9F9] flex flex-col">
            <TLPBanner />

            <div className="flex-1 flex flex-col items-center justify-center p-6 bg-[radial-gradient(circle_at_top_right,rgba(202,255,0,0.05),transparent_40%)]">
                <div className="mb-12">
                    <OpiceLogo />
                </div>

                <div className="w-full max-w-md bg-white border border-[#E0E0E0] shadow-[0_10px_40px_-15px_rgba(0,0,0,0.1)] overflow-hidden">
                    <div className="bg-[#111111] px-8 py-6 flex items-center justify-between">
                        <h2 className="font-syne font-bold text-white text-lg uppercase tracking-tight flex items-center gap-2">
                            <Shield size={18} className="text-[#CAFF00]" />
                            Verificação em duas etapas
                        </h2>
                    </div>

                    <div className="p-8">
                        <p className="font-dm text-sm text-[#555555] mb-8 leading-relaxed text-center">
                            Para sua segurança, inserimos uma camada extra de proteção. Digite o código de acesso para continuar.
                        </p>

                        <form onSubmit={handleConfirm}>
                            <div className="flex justify-between gap-2 mb-8">
                                {code.map((digit, i) => (
                                    <input
                                        key={i}
                                        ref={inputRefs[i]}
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={1}
                                        value={digit}
                                        onChange={(e) => handleChange(i, e.target.value)}
                                        onKeyDown={(e) => handleKeyDown(i, e)}
                                        className="w-12 h-16 border-2 border-[#E0E0E0] text-center font-syne font-bold text-2xl focus:border-[#CAFF00] focus:outline-none transition-all bg-white text-[#111111]"
                                        autoFocus={i === 0}
                                    />
                                ))}
                            </div>

                            {error && (
                                <div className="mb-6 bg-red-50 border border-red-100 p-3 flex items-center gap-2 text-red-600 font-mono text-xs">
                                    <AlertCircle size={14} />
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading || code.join('').length < 6}
                                className={`w-full h-14 font-mono font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${loading || code.join('').length < 6
                                        ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
                                        : 'bg-[#111111] text-white hover:bg-[#333] border border-black'
                                    }`}
                            >
                                {loading ? (
                                    <>
                                        <Loader2 size={16} className="animate-spin" />
                                        Verificando...
                                    </>
                                ) : (
                                    <>
                                        Confirmar Código
                                        <CheckCircle size={16} className="text-[#CAFF00]" />
                                    </>
                                )}
                            </button>
                        </form>

                        <div className="mt-8 pt-6 border-t border-gray-100 flex justify-center">
                            <button
                                onClick={handleBack}
                                className="flex items-center gap-2 text-[#555555] hover:text-[#111111] font-mono text-[10px] uppercase transition-colors"
                            >
                                <ArrowLeft size={12} />
                                Voltar / Trocar Usuário
                            </button>
                        </div>
                    </div>
                </div>

                <div className="mt-12 flex items-center gap-8 opacity-40 grayscale pointer-events-none">
                    <img src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg" alt="Visa" className="h-4" />
                    <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" alt="Mastercard" className="h-6" />
                    <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/b/b5/PayPal.svg/1200px-PayPal.svg.png" alt="Paypal" className="h-4" />
                </div>
            </div>
        </div>
    );
}

function AlertCircle({ size, className }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
    );
}
