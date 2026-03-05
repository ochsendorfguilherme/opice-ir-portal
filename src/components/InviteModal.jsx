import { useState } from 'react';
import { Mail, Briefcase, MessageSquare, X, CheckCircle, AlertTriangle } from 'lucide-react';

export default function InviteModal({ isOpen, onClose, onInvite, isLoading }) {
    const [form, setForm] = useState({ name: '', email: '', role: '', message: '' });

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        onInvite(form);
    };

    const inputClass = "w-full bg-[#1A1A1A] border border-white/10 p-3 text-white font-dm text-sm focus:outline-none focus:border-[#CAFF00] transition-colors placeholder:text-gray-600";
    const labelClass = "block font-mono text-[10px] uppercase text-gray-500 mb-2 tracking-wider";

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-[#111111] border border-white/10 w-full max-w-lg shadow-2xl animate-in fade-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between bg-black/20">
                    <div>
                        <h3 className="font-syne font-bold text-white uppercase text-lg">Chamar Convidado</h3>
                        <p className="font-dm text-xs text-gray-400 mt-1">
                            O convite passará por uma aprovação do Administrador antes do acesso ser liberado.
                        </p>
                    </div>
                    <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Form Body */}
                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    <div>
                        <label className={labelClass}>Nome Completo *</label>
                        <input
                            type="text"
                            required
                            value={form.name}
                            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                            className={inputClass}
                            placeholder="Ex: João Silva"
                            disabled={isLoading}
                        />
                    </div>

                    <div>
                        <label className={labelClass}>E-mail *</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                                <Mail size={16} />
                            </div>
                            <input
                                type="email"
                                required
                                value={form.email}
                                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                                className={`${inputClass} pl-10`}
                                placeholder="joao@empresa.com.br"
                                disabled={isLoading}
                            />
                        </div>
                    </div>

                    <div>
                        <label className={labelClass}>Cargo / Função (Opcional)</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                                <Briefcase size={16} />
                            </div>
                            <input
                                type="text"
                                value={form.role}
                                onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                                className={`${inputClass} pl-10`}
                                placeholder="Ex: Advogado Externo"
                                disabled={isLoading}
                            />
                        </div>
                    </div>

                    <div>
                        <label className={labelClass}>Mensagem (Opcional)</label>
                        <div className="relative">
                            <div className="absolute top-3 left-3 pointer-events-none text-gray-400">
                                <MessageSquare size={16} />
                            </div>
                            <textarea
                                value={form.message}
                                onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                                className={`${inputClass} pl-10 min-h-[100px] resize-none`}
                                placeholder="Detalhes para justificar a chamada do convidado à nossa equipe interna..."
                                disabled={isLoading}
                            />
                        </div>
                        <p className="font-dm text-[10px] text-gray-500 mt-2">
                            Esta mensagem ficará visível apenas para os Sócios Administradores no momento da aprovação.
                        </p>
                    </div>

                    {/* Footer Actions */}
                    <div className="pt-4 flex gap-3 border-t border-white/5">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isLoading}
                            className="flex-1 border border-white/10 text-gray-300 font-dm text-sm py-3 hover:bg-white/5 transition-colors disabled:opacity-50"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading || !form.name || !form.email}
                            className="flex-1 bg-[#CAFF00] text-[#111111] font-dm font-bold text-sm py-3 hover:opacity-90 transition-all uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <>
                                    <div className="w-4 h-4 rounded-full border-2 border-black/20 border-t-black animate-spin" />
                                    ENVIANDO...
                                </>
                            ) : (
                                'ENVIAR CONVITE'
                            )}
                        </button>
                    </div>
                </form>

            </div>
        </div>
    );
}
