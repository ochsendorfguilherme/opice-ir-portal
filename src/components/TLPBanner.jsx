import { Lock } from 'lucide-react';

export default function TLPBanner() {
  return (
    <div className="w-full py-1">
      <div className="mx-auto flex max-w-[1600px] justify-center">
        <div className="rounded-full bg-[rgba(23,48,56,0.08)] p-1.5 shadow-[0_10px_24px_rgba(21,38,43,0.06)] backdrop-blur-sm">
          <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(255,178,31,0.26)] bg-[linear-gradient(90deg,#173038_0%,#24424b_50%,#173038_100%)] px-3 py-2 text-[#ffb21f] shadow-[0_14px_28px_rgba(15,33,40,0.14)] sm:px-4">
            <Lock size={12} className="shrink-0" />
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] whitespace-nowrap xl:hidden">TLP:AMBER+STRICT</span>
            <span className="hidden font-mono text-[11px] uppercase tracking-[0.18em] whitespace-nowrap xl:inline">TLP:AMBER+STRICT - compartilhamento restrito ao grupo de gest?o do incidente</span>
          </div>
        </div>
      </div>
    </div>
  );
}
