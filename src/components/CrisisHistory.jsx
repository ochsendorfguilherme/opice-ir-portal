import { useState } from 'react';
import { getAllCrises } from '../utils/crisisHistory';
import { Copy, Check, X, ChevronDown, ChevronUp } from 'lucide-react';

function CopyBtn({ text }) {
  const [c, setC] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setC(true); setTimeout(() => setC(false), 2000); }}
      className="flex items-center gap-1 text-xs font-mono text-[var(--ink-soft)] hover:text-gray-600 transition-colors"
    >
      {c ? <Check size={11} className="text-green-500" /> : <Copy size={11} />}
      {c ? 'Copiado' : 'Copiar'}
    </button>
  );
}

function CrisisDetailModal({ crise, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div className="bg-white border border-[rgba(21,38,43,0.12)] w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="bg-[#173038] px-5 py-3 flex items-center justify-between sticky top-0">
          <div>
            <div className="text-[var(--accent)] font-mono text-xs">DETALHES DA CRISE</div>
            <div className="text-[#fffdf8] font-dm text-sm">{crise.crisisId}</div>
          </div>
          <button onClick={onClose} className="text-[var(--ink-soft)] hover:text-[#fffdf8] p-1"><X size={16} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {[
              ['Status', crise.crisisStatus === 'closed' ? '✓ Encerrada' : '⚡ Ativa'],
              ['Crisis ID', crise.crisisId],
              ['Declarada em', crise.crisisTimestamp ? new Date(crise.crisisTimestamp).toLocaleString('pt-BR') : '—'],
              ['Encerrada em', crise.crisisClosedAt ? new Date(crise.crisisClosedAt).toLocaleString('pt-BR') : '—'],
              ['Duração', crise.crisisDuration || '—'],
              ['Membros presentes', `${(crise.crisisMembers || []).filter(m => m.present).length}/5`],
            ].map(([l, v]) => (
              <div key={l} className="border border-[#F0F0F0] p-3">
                <div className="font-mono text-xs text-[var(--ink-soft)] uppercase mb-1">{l}</div>
                <div className="font-dm text-sm text-[var(--ink)]">{v}</div>
              </div>
            ))}
          </div>
          {crise.crisisResummo && (
            <div className="border border-[rgba(21,38,43,0.12)] p-3">
              <div className="font-mono text-xs text-[var(--ink-soft)] uppercase mb-1">Resumo da Resolução</div>
              <p className="font-dm text-sm text-[var(--ink)]">{crise.crisisResummo}</p>
            </div>
          )}
          <div className="bg-white/72 border border-[rgba(21,38,43,0.12)] p-3">
            <div className="font-mono text-xs text-[var(--ink-soft)] uppercase mb-1">Hash SHA-256 de Auditoria</div>
            <div className="font-mono text-xs text-[#333] break-all">{crise.crisisHash}</div>
            <div className="mt-1"><CopyBtn text={crise.crisisHash || ''} /></div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CrisisCard({ crise }) {
  const [showDetail, setShowDetail] = useState(false);
  const shortHash = crise.crisisHash ? `${crise.crisisHash.slice(0, 16)}...` : '—';
  const duration = crise.crisisDuration || '—';

  return (
    <>
      <div className="border border-[rgba(21,38,43,0.12)] p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="font-mono text-xs text-[var(--ink-soft)]">{crise.crisisId}</span>
          <span className={`font-mono text-xs px-2 py-0.5 ${crise.crisisStatus === 'closed' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            {crise.crisisStatus === 'closed' ? '✓ Encerrada' : '⚡ Ativa'}
          </span>
        </div>
        <div className="space-y-1.5 mb-3">
          <div className="flex gap-3 text-xs">
            <span className="font-mono text-[var(--ink-soft)] w-24 shrink-0">Declarada</span>
            <span className="font-dm text-[var(--ink)]">{crise.crisisTimestamp ? new Date(crise.crisisTimestamp).toLocaleString('pt-BR') : '—'}</span>
          </div>
          {crise.crisisClosedAt && (
            <div className="flex gap-3 text-xs">
              <span className="font-mono text-[var(--ink-soft)] w-24 shrink-0">Encerrada</span>
              <span className="font-dm text-[var(--ink)]">{new Date(crise.crisisClosedAt).toLocaleString('pt-BR')}</span>
            </div>
          )}
          <div className="flex gap-3 text-xs">
            <span className="font-mono text-[var(--ink-soft)] w-24 shrink-0">Duração</span>
            <span className="font-dm text-[var(--ink)]">{duration}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-white/72 px-3 py-2 mb-3">
          <span className="font-mono text-xs text-[var(--ink-soft)] break-all flex-1">{shortHash}</span>
          <CopyBtn text={crise.crisisHash || ''} />
        </div>
        <button
          onClick={() => setShowDetail(true)}
          className="w-full text-left font-mono text-xs text-blue-600 hover:text-blue-800 hover:underline transition-colors"
        >
          Ver Detalhes Completos →
        </button>
      </div>
      {showDetail && <CrisisDetailModal crise={crise} onClose={() => setShowDetail(false)} />}
    </>
  );
}

export function CrisisHistory({ clientId }) {
  const [expanded, setExpanded] = useState(true);
  const crises = getAllCrises(clientId);
  const encerradas = crises.filter(c => c.crisisStatus === 'closed');

  return (
    <div className="mt-8 border border-[rgba(21,38,43,0.12)]">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-3 bg-[#173038] text-[#fffdf8] hover:bg-[#222] transition-colors"
      >
        <span className="font-mono text-xs uppercase tracking-widest">Histórico de Crises Anteriores</span>
        <div className="flex items-center gap-2">
          {encerradas.length > 0 && (
            <span className="font-mono text-xs bg-[var(--accent)] text-[var(--ink)] px-2 py-0.5">{encerradas.length}</span>
          )}
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
      </button>
      {expanded && (
        <div className="p-4">
          {encerradas.length === 0 ? (
            <div className="py-6 text-center text-[var(--ink-soft)] font-dm text-sm">
              Nenhuma crise encerrada registrada.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {encerradas.map(c => <CrisisCard key={c.crisisId} crise={c} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
