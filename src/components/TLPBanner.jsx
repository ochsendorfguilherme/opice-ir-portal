import { Lock } from 'lucide-react';

export default function TLPBanner() {
  return (
    <div className="w-full bg-[#111111] text-[#F59E0B] font-mono text-xs flex items-center justify-center gap-2 py-1.5 px-4 select-none">
      <Lock size={10} />
      <span>TLP:AMBER+STRICT — Compartilhamento restrito ao grupo de gestão do incidente</span>
    </div>
  );
}
