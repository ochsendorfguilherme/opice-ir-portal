import { useNavigate } from 'react-router-dom';
import { Lock } from 'lucide-react';

export default function BlockedModal({ message, redirectTo, onClose }) {
  const navigate = useNavigate();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <div className="bg-black border border-gray-700 p-10 max-w-md w-full mx-4 text-center">
        <Lock size={40} className="text-[#CAFF00] mx-auto mb-5" />
        <h2 className="font-syne font-extrabold text-white text-2xl uppercase mb-3">Acesso Bloqueado</h2>
        <p className="text-gray-300 font-dm mb-8">{message}</p>
        <button
          onClick={() => { onClose?.(); navigate(redirectTo); }}
          className="bg-[#CAFF00] text-[#111111] font-dm font-medium px-8 py-3 cursor-pointer hover:bg-[#b8e600] transition-colors"
        >
          Ir para etapa anterior →
        </button>
      </div>
    </div>
  );
}
