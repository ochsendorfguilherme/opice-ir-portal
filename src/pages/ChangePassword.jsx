import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Lock, AlertCircle, RefreshCw } from 'lucide-react';
import OpiceLogo from '../components/OpiceLogo';

export default function ChangePassword() {
    const { user, changePassword } = useAuth();
    const navigate = useNavigate();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // If user somehow gets here without needing it, redirect them
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

        // Optional: add more complexity checks here (uppercase, lowercase, numbers, special chars)
        if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])/.test(password)) {
            setError('A senha deve conter letras maiúsculas, minúsculas e números.');
            return;
        }

        setLoading(true);
        await new Promise(r => setTimeout(r, 600)); // UX delay

        const success = changePassword(password);
        setLoading(false);

        if (success) {
            navigate('/dashboard', { replace: true });
        } else {
            setError('Ocorreu um erro ao alterar a senha. Tente novamente.');
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
                        Alteração de<br />Senha<br />Obrigatória
                    </h1>
                    <p className="text-gray-400 font-dm mt-6 text-base max-w-xs">
                        Por motivos de segurança, é necessário definir uma nova senha no seu primeiro acesso.
                    </p>
                </div>
                <div>
                    <div className="bg-white/5 border border-white/10 p-4">
                        <p className="text-gray-500 font-mono text-xs">
                            Mantenha suas credenciais seguras. Acesso não autorizado é crime.
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
                        <h2 className="font-syne font-extrabold text-[#111111] text-3xl uppercase">Nova Senha</h2>
                        <p className="text-[#555555] font-dm mt-1 text-sm">Defina sua nova senha definitiva</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block font-mono text-xs font-medium uppercase text-[#111111] mb-1.5">Nova Senha</label>
                            <input
                                type="password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                required
                                placeholder="••••••••"
                                className={`w-full border px-4 py-3 font-dm text-sm focus:outline-none transition-colors ${error ? 'border-red-300 focus:border-red-500' : 'border-[#E0E0E0] focus:border-[#111111]'}`}
                            />
                            <p className="text-gray-400 text-[10px] uppercase font-mono mt-1">Mínimo 8 caracteres, letras maiúsculas, minúsculas e números.</p>
                        </div>
                        <div>
                            <label className="block font-mono text-xs font-medium uppercase text-[#111111] mb-1.5">Confirmar Nova Senha</label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={e => setConfirmPassword(e.target.value)}
                                required
                                placeholder="••••••••"
                                className={`w-full border px-4 py-3 font-dm text-sm focus:outline-none transition-colors ${error ? 'border-red-300 focus:border-red-500' : 'border-[#E0E0E0] focus:border-[#111111]'}`}
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
                            className="w-full bg-[#111111] text-white font-dm font-medium py-3.5 text-sm hover:bg-[#333] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <><RefreshCw size={14} className="animate-spin" /> Atualizando...</>
                            ) : 'Salvar Nova Senha →'}
                        </button>
                    </form>

                </div>
            </div>
        </div>
    );
}
