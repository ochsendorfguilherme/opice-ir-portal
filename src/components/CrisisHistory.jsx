import { useMemo, useState } from 'react';
import { Check, ChevronDown, ChevronUp, Copy, ShieldAlert, ShieldCheck, X } from 'lucide-react';
import { getAllCrises } from '../utils/crisisHistory';

function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text || '');
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };
  return (
    <button type="button" onClick={handleCopy} className="inline-flex items-center gap-2 rounded-full border border-[rgba(21,38,43,0.12)] bg-white px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--ink-soft)] transition-colors hover:text-[var(--ink)]">
      {copied ? <Check size={12} className="text-green-600" /> : <Copy size={12} />}
      {copied ? 'Copiado' : 'Copiar'}
    </button>
  );
}

function CrisisDetailModal({ crisis, onClose }) {
  const membersPresent = (crisis.members || []).filter((member) => member.present).length;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#15262b]/52 backdrop-blur-sm" />
      <div className="relative w-full max-w-2xl rounded-[30px] border border-[rgba(21,38,43,0.12)] bg-white p-6 shadow-[0_24px_56px_rgba(21,38,43,0.18)] md:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--ink-soft)]">Histórico de crise</div>
            <h3 className="mt-3 font-syne text-2xl font-bold text-[var(--ink)]">{crisis.crisisId}</h3>
          </div>
          <button type="button" onClick={onClose} className="rounded-full border border-[rgba(21,38,43,0.12)] bg-white p-3 text-[var(--ink-soft)] transition-colors hover:text-[var(--ink)]"><X size={18} /></button>
        </div>
        <div className="mt-6 grid gap-3 md:grid-cols-2">
          {[
            ['Status', crisis.crisisStatus === 'closed' ? 'Encerrada' : 'Ativa'],
            ['Declarada em', crisis.crisisTimestamp ? new Date(crisis.crisisTimestamp).toLocaleString('pt-BR') : '—'],
            ['Encerrada em', crisis.crisisClosedAt ? new Date(crisis.crisisClosedAt).toLocaleString('pt-BR') : '—'],
            ['Duração', crisis.crisisDuration || '—'],
            ['Membros presentes', `${membersPresent}/5`],
            ['Hash final', crisis.crisisCloseHash || '—'],
          ].map(([label, value]) => (
            <div key={label} className="rounded-[22px] border border-[rgba(21,38,43,0.08)] bg-[rgba(245,247,248,0.85)] p-4">
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--ink-soft)]">{label}</div>
              <div className="mt-2 text-sm leading-6 text-[var(--ink)] break-all">{value}</div>
            </div>
          ))}
        </div>
        {crisis.crisisResummo && (
          <div className="mt-4 rounded-[22px] border border-[rgba(21,38,43,0.08)] bg-[rgba(245,247,248,0.85)] p-4">
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--ink-soft)]">Resumo do encerramento</div>
            <p className="mt-2 text-sm leading-7 text-[var(--ink)]">{crisis.crisisResummo}</p>
          </div>
        )}
        <div className="mt-4 rounded-[22px] border border-[rgba(21,38,43,0.08)] bg-[rgba(245,247,248,0.85)] p-4">
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--ink-soft)]">Hash de auditoria</div>
          <div className="mt-2 break-all font-mono text-xs text-[var(--ink-soft)]">{crisis.crisisHash}</div>
          <div className="mt-3"><CopyBtn text={crisis.crisisHash || ''} /></div>
        </div>
      </div>
    </div>
  );
}

function CrisisCard({ crisis }) {
  const [open, setOpen] = useState(false);
  const shortHash = crisis.crisisHash ? `${crisis.crisisHash.slice(0, 18)}...` : '—';
  return (
    <>
      <div className="rounded-[28px] border border-[rgba(21,38,43,0.08)] bg-white/82 p-5 shadow-[0_14px_30px_rgba(21,38,43,0.06)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--ink-soft)]">{crisis.crisisId}</div>
            <div className="mt-2 font-syne text-xl font-bold text-[var(--ink)]">{crisis.crisisStatus === 'closed' ? 'Crise encerrada' : 'Crise ativa'}</div>
          </div>
          <span className={`rounded-full px-3 py-1 font-mono text-[10px] uppercase tracking-[0.16em] ${crisis.crisisStatus === 'closed' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
            {crisis.crisisStatus === 'closed' ? 'Encerrada' : 'Ativa'}
          </span>
        </div>
        <div className="mt-4 space-y-2 text-sm text-[var(--ink-soft)]">
          <div><strong className="text-[var(--ink)]">Declarada:</strong> {crisis.crisisTimestamp ? new Date(crisis.crisisTimestamp).toLocaleString('pt-BR') : '—'}</div>
          <div><strong className="text-[var(--ink)]">Duração:</strong> {crisis.crisisDuration || '—'}</div>
          <div><strong className="text-[var(--ink)]">Hash:</strong> <span className="font-mono text-xs">{shortHash}</span></div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <CopyBtn text={crisis.crisisHash || ''} />
          <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-2 rounded-full border border-[rgba(21,38,43,0.12)] bg-white px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-blue-700 transition-colors hover:text-blue-800">
            Abrir detalhes
          </button>
        </div>
      </div>
      {open && <CrisisDetailModal crisis={crisis} onClose={() => setOpen(false)} />}
    </>
  );
}

export function CrisisHistory({ clientId }) {
  const [expanded, setExpanded] = useState(true);
  const crises = useMemo(() => getAllCrises(clientId), [clientId]);
  const closedCrises = crises.filter((crisis) => crisis.crisisStatus === 'closed');

  return (
    <div className="app-panel rounded-[34px] p-6 shadow-[0_24px_48px_rgba(21,38,43,0.08)] md:p-7">
      <button type="button" onClick={() => setExpanded((prev) => !prev)} className="flex w-full items-center justify-between gap-4 rounded-[24px] border border-[rgba(21,38,43,0.08)] bg-[linear-gradient(135deg,rgba(22,50,57,0.98),rgba(22,64,71,0.94))] px-5 py-4 text-left text-white shadow-[0_18px_32px_rgba(21,38,43,0.08)]">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/12 bg-white/8 text-[var(--accent)]">{closedCrises.length > 0 ? <ShieldCheck size={18} /> : <ShieldAlert size={18} />}</div>
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--accent)]">Histórico</div>
            <div className="mt-1 font-syne text-2xl font-bold">Crises anteriores</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full border border-white/12 bg-white/8 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.16em]">{closedCrises.length} registradas</span>
          {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>
      </button>
      {expanded && (
        <div className="mt-5">
          {closedCrises.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-[rgba(21,38,43,0.16)] bg-white/72 px-5 py-10 text-center text-sm text-[var(--ink-soft)]">Nenhuma crise encerrada registrada para este cliente.</div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {closedCrises.map((crisis) => <CrisisCard key={crisis.crisisId} crisis={crisis} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}