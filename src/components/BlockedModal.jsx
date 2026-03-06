import { useNavigate } from 'react-router-dom';
import { Lock } from 'lucide-react';

export default function BlockedModal({ message, redirectTo, onClose }) {
  const navigate = useNavigate();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#15262b]/45">
      <div className="bg-black border border-[rgba(21,38,43,0.16)] p-10 max-w-md w-full mx-4 text-center">
        <Lock size={40} className="text-[var(--accent)] mx-auto mb-5" />
        <h2 className="font-syne font-extrabold text-[#fffdf8] text-2xl uppercase mb-3">Acesso Bloqueado</h2>
        <p className="text-gray-300 font-dm mb-8">{message}</p>
        <button
          onClick={() => { onClose?.(); navigate(redirectTo); }}
          className="bg-[var(--accent)] text-[var(--ink)] font-dm font-medium px-8 py-3 cursor-pointer hover:bg-[var(--accent-deep)] transition-colors"
        >
          Ir para etapa anterior →
        </button>
      </div>
    </div>
  );
}
