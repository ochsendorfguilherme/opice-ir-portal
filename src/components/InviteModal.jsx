import { useState } from 'react';
import { Mail, Briefcase, MessageSquare, X } from 'lucide-react';

export default function InviteModal({ isOpen, onClose, onInvite, isLoading }) {
  const [form, setForm] = useState({ name: '', email: '', role: '', message: '' });

  if (!isOpen) return null;

  const handleSubmit = (event) => {
    event.preventDefault();
    onInvite(form);
  };

  const inputClass = 'w-full rounded-[20px] border border-[rgba(21,38,43,0.12)] bg-white/78 px-4 py-3 text-sm text-[var(--ink)] outline-none transition focus:border-[rgba(23,48,56,0.42)] focus:bg-white placeholder:text-[rgba(81,97,104,0.58)]';
  const labelClass = 'mb-2 block font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-soft)]';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#15262b]/45 p-4 backdrop-blur-sm">
      <div className="app-panel w-full max-w-xl overflow-hidden rounded-[32px] shadow-[0_26px_56px_rgba(21,38,43,0.22)] animate-in fade-in zoom-in-95 duration-200">
        <div className="soft-ribbon flex items-center justify-between px-6 py-5">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/60">Convite supervisionado</p>
            <h3 className="text-xl font-bold text-white">Chamar convidado</h3>
            <p className="mt-1 text-sm text-white/70">
              O convite entra em aprovacao administrativa antes da liberacao do acesso.
            </p>
          </div>
          <button onClick={onClose} className="rounded-full bg-white/10 p-2 text-white/72 transition-colors hover:bg-white/16 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-6">
          <div>
            <label className={labelClass}>Nome completo *</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              className={inputClass}
              placeholder="Ex: Joao Silva"
              disabled={isLoading}
            />
          </div>

          <div>
            <label className={labelClass}>E-mail *</label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-[var(--ink-soft)]">
                <Mail size={16} />
              </div>
              <input
                type="email"
                required
                value={form.email}
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                className={`${inputClass} pl-11`}
                placeholder="joao@empresa.com.br"
                disabled={isLoading}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Cargo / funcao</label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-[var(--ink-soft)]">
                <Briefcase size={16} />
              </div>
              <input
                type="text"
                value={form.role}
                onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))}
                className={`${inputClass} pl-11`}
                placeholder="Ex: Advogado externo"
                disabled={isLoading}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Mensagem</label>
            <div className="relative">
              <div className="pointer-events-none absolute left-4 top-4 text-[var(--ink-soft)]">
                <MessageSquare size={16} />
              </div>
              <textarea
                value={form.message}
                onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))}
                className={`${inputClass} min-h-[120px] resize-none pl-11`}
                placeholder="Detalhes para justificar o convite a equipe interna."
                disabled={isLoading}
              />
            </div>
            <p className="mt-2 text-xs text-[var(--ink-soft)]">
              Esta mensagem fica visivel apenas para os administradores no fluxo de aprovacao.
            </p>
          </div>

          <div className="flex gap-3 border-t border-[rgba(21,38,43,0.08)] pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="btn-outline flex-1 rounded-full disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading || !form.name || !form.email}
              className="btn-primary flex flex-1 items-center justify-center gap-2 rounded-full uppercase disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                  Enviando...
                </>
              ) : (
                'Enviar convite'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
