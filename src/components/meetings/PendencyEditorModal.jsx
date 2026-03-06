import { useMemo, useState } from 'react';
import { AlertCircle, CalendarDays, Save, X } from 'lucide-react';
import { PENDENCY_TREATMENT_OPTIONS } from '../../utils/meetingPendencies';

export default function PendencyEditorModal({ item, onClose, onSave }) {
  const [texto, setTexto] = useState(item?.texto || '');
  const [tratamentoPrazo, setTratamentoPrazo] = useState(item?.tratamentoPrazo || 'sem_prazo');
  const [prazo, setPrazo] = useState(item?.prazo || '');
  const [error, setError] = useState('');

  const helper = useMemo(
    () => PENDENCY_TREATMENT_OPTIONS.find((option) => option.value === tratamentoPrazo)?.helper || '',
    [tratamentoPrazo],
  );

  if (!item) return null;

  function handleSubmit() {
    if (!texto.trim()) {
      setError('Descreva a pendencia antes de salvar.');
      return;
    }

    if (!tratamentoPrazo) {
      setError('Escolha como o prazo sera tratado.');
      return;
    }

    if (tratamentoPrazo === 'definir_prazo' && !prazo) {
      setError('Informe a data da pendencia.');
      return;
    }

    onSave({
      ...item,
      texto: texto.trim(),
      tratamentoPrazo,
      prazo: tratamentoPrazo === 'definir_prazo' ? prazo : null,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#15262b]/45 px-4" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="app-panel w-full max-w-2xl overflow-hidden rounded-[32px] shadow-[0_30px_70px_rgba(21,38,43,0.22)]">
        <div className="soft-ribbon flex items-start justify-between gap-4 rounded-t-[32px] px-6 py-5 md:px-8">
          <div>
            <p className="section-kicker mb-2">Reuniao / Pendencia</p>
            <h2 className="font-syne text-2xl font-extrabold uppercase text-[var(--accent)]">Editar pendencia</h2>
            <p className="mt-1 font-dm text-sm text-[#dce9eb]">Ajuste a descricao e como o prazo sera tratado antes de refletir no PMO.</p>
          </div>
          <button onClick={onClose} className="rounded-full border border-white/10 p-2 text-[#dce9eb] transition-colors hover:border-white/20 hover:bg-white/10 hover:text-white"><X size={18} /></button>
        </div>

        <div className="space-y-5 px-6 py-6 md:px-8">
          <div>
            <label className="mb-2 block font-mono text-xs uppercase tracking-[0.16em] text-[var(--ink)]">Descricao da pendencia</label>
            <textarea value={texto} onChange={(event) => { setTexto(event.target.value); if (error) setError(''); }} rows={5} className="w-full resize-none rounded-[22px] border border-[rgba(21,38,43,0.12)] bg-white px-4 py-3 font-dm text-sm text-[var(--ink)] outline-none focus:border-[rgba(21,38,43,0.28)]" />
          </div>

          <div className="rounded-[26px] border border-[rgba(21,38,43,0.08)] bg-[rgba(23,48,56,0.04)] p-4">
            <div className="mb-3 flex items-center gap-2 font-dm text-sm text-[var(--ink)]"><AlertCircle size={15} />Tratamento do prazo</div>
            <div className="grid gap-3 md:grid-cols-3">
              {PENDENCY_TREATMENT_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => { setTratamentoPrazo(option.value); if (error) setError(''); }}
                  className={`rounded-[20px] border px-4 py-4 text-left transition-colors ${tratamentoPrazo === option.value ? 'border-[rgba(183,236,35,0.4)] bg-[rgba(214,255,99,0.18)]' : 'border-[rgba(21,38,43,0.08)] bg-white hover:border-[rgba(21,38,43,0.16)]'}`}
                >
                  <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--ink-soft)]">Opcao</p>
                  <p className="mt-2 font-dm text-sm font-semibold text-[var(--ink)]">{option.label}</p>
                </button>
              ))}
            </div>
            {helper && <p className="mt-3 font-dm text-sm text-[var(--ink-soft)]">{helper}</p>}
            {tratamentoPrazo === 'definir_prazo' && (
              <div className="mt-4 max-w-xs">
                <label className="mb-2 block font-mono text-xs uppercase tracking-[0.16em] text-[var(--ink)]">Prazo</label>
                <div className="relative">
                  <CalendarDays size={15} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--ink-soft)]" />
                  <input type="date" value={prazo} onChange={(event) => { setPrazo(event.target.value); if (error) setError(''); }} className="w-full rounded-[18px] border border-[rgba(21,38,43,0.12)] bg-white py-3 pl-11 pr-4 font-dm text-sm text-[var(--ink)] outline-none focus:border-[rgba(21,38,43,0.28)]" />
                </div>
              </div>
            )}
          </div>

          {error && <div className="rounded-[18px] border border-red-200 bg-red-50 px-4 py-3 font-dm text-sm text-red-700">{error}</div>}
        </div>

        <div className="flex justify-between gap-3 border-t border-[rgba(21,38,43,0.08)] bg-white/70 px-6 py-4 md:px-8">
          <button onClick={onClose} className="btn-outline rounded-full px-4 py-2.5 font-mono text-xs uppercase">Cancelar</button>
          <button onClick={handleSubmit} className="btn-primary rounded-full px-5 py-2.5 font-mono text-xs uppercase"><span className="inline-flex items-center gap-2"><Save size={14} />Salvar pendencia</span></button>
        </div>
      </div>
    </div>
  );
}
