import { useMemo, useState } from 'react';
import { getStorage, setStorage, KEYS } from '../../utils/storage';
import { CalendarClock, Download, FileClock, Plus, Trash2 } from 'lucide-react';

const PHASES = ['Detecção', 'Análise', 'Contenção', 'Erradicação', 'Recuperação', 'Pós-Incidente'];
const PHASE_TONES = {
  Detecção: 'border-red-200 bg-red-50 text-red-700',
  Análise: 'border-amber-200 bg-amber-50 text-amber-700',
  Contenção: 'border-violet-200 bg-violet-50 text-violet-700',
  Erradicação: 'border-blue-200 bg-blue-50 text-blue-700',
  Recuperação: 'border-green-200 bg-green-50 text-green-700',
  'Pós-Incidente': 'border-[rgba(21,38,43,0.1)] bg-white/70 text-[var(--ink)]',
};

const now = () => new Date().toISOString().slice(0, 16);

function SummaryCard({ label, value, helper }) {
  return (
    <div className="rounded-[24px] border border-[rgba(21,38,43,0.08)] bg-white/80 p-4 shadow-[0_12px_24px_rgba(21,38,43,0.04)]">
      <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--ink-soft)]">{label}</div>
      <div className="mt-3 font-syne text-3xl font-bold text-[var(--ink)]">{value}</div>
      <p className="mt-2 text-sm leading-6 text-[var(--ink-soft)]">{helper}</p>
    </div>
  );
}

export default function TabTimeline({ effectiveClientId }) {
  const [events, setEvents] = useState(() => getStorage(KEYS.pmo(effectiveClientId), {}).timeline || []);
  const [showForm, setShowForm] = useState(false);
  const [phaseFilter, setPhaseFilter] = useState('Todas');
  const [form, setForm] = useState({ datetime: now(), fase: 'Detecção', evento: '', fonte: '', evidencia: '' });

  const saveEvents = (nextEvents) => {
    const pmoData = getStorage(KEYS.pmo(effectiveClientId), {});
    setStorage(KEYS.pmo(effectiveClientId), { ...pmoData, timeline: nextEvents });
    setEvents(nextEvents);
  };

  const addEvent = () => {
    if (!form.evento.trim()) return;
    const newEvent = { id: Date.now(), ...form };
    const sorted = [...events, newEvent].sort((a, b) => new Date(b.datetime) - new Date(a.datetime));
    saveEvents(sorted);
    setForm({ datetime: now(), fase: 'Detecção', evento: '', fonte: '', evidencia: '' });
    setShowForm(false);
  };

  const exportCSV = () => {
    const header = 'DATA/HORA UTC,FASE,EVENTO,FONTE,EVIDENCIA\n';
    const rows = events.map((event) => `"${event.datetime}","${event.fase}","${event.evento}","${event.fonte || ''}","${event.evidencia || ''}"`).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `OPICE_Timeline_${effectiveClientId}_${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const filteredEvents = phaseFilter === 'Todas' ? events : events.filter((event) => event.fase === phaseFilter);
  const latestEvent = events[0];
  const dominantPhase = useMemo(() => {
    const phaseCount = PHASES.map((phase) => ({ phase, count: events.filter((event) => event.fase === phase).length }));
    return phaseCount.sort((a, b) => b.count - a.count)[0] || { phase: '—', count: 0 };
  }, [events]);

  const inputClass = 'w-full rounded-[20px] border border-[rgba(21,38,43,0.08)] bg-white px-4 py-3 text-sm text-[var(--ink)] focus:border-[rgba(21,38,43,0.18)] focus:outline-none';

  return (
    <div className="space-y-6">
      <section className="grid gap-6 2xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.95fr)]">
        <div className="app-panel-dark rounded-[32px] p-6 shadow-[0_22px_44px_rgba(21,38,43,0.12)]">
          <div className="font-mono text-[11px] uppercase tracking-[0.28em] text-[var(--accent)]">Linha do tempo</div>
          <h2 className="mt-3 font-syne text-3xl font-bold text-white md:text-4xl">Evidência cronológica do caso</h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-[#d7e0e3]">
            Registre fatos, decisões e evidências na ordem certa para auditoria, reporte regulatório e reconstrução do incidente.
          </p>
          <div className="mt-6 grid gap-3 md:grid-cols-3">
            <div className="rounded-[24px] border border-white/10 bg-white/6 p-4">
              <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--ink-soft)]">Eventos</div>
              <div className="mt-2 font-syne text-3xl font-bold text-white">{events.length}</div>
              <p className="mt-2 text-xs leading-5 text-[#c6d0d4]">Itens registrados no histórico mestre.</p>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/6 p-4">
              <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--ink-soft)]">Fase dominante</div>
              <div className="mt-2 font-syne text-3xl font-bold text-white">{dominantPhase.phase}</div>
              <p className="mt-2 text-xs leading-5 text-[#c6d0d4]">{dominantPhase.count} registro(s) nessa etapa.</p>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/6 p-4">
              <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--ink-soft)]">Último marco</div>
              <div className="mt-2 font-syne text-xl font-bold text-white line-clamp-2">{latestEvent?.evento || 'Sem registros'}</div>
              <p className="mt-2 text-xs leading-5 text-[#c6d0d4]">{latestEvent?.datetime ? latestEvent.datetime.replace('T', ' ') : 'Inclua o primeiro evento relevante.'}</p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="app-panel rounded-[30px] p-5 shadow-[0_18px_36px_rgba(21,38,43,0.06)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--ink-soft)]">Comandos</div>
                <h3 className="mt-2 font-syne text-2xl font-bold text-[var(--ink)]">Ações rápidas</h3>
              </div>
              <button onClick={exportCSV} className="btn-outline inline-flex items-center gap-2 px-4 py-2 text-[11px] uppercase tracking-[0.18em]">Exportar CSV <Download size={13} /></button>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <button onClick={() => setShowForm((current) => !current)} className="btn-primary inline-flex items-center gap-2 px-4 py-2 text-[11px] uppercase tracking-[0.18em]">Registrar evento <Plus size={13} /></button>
              <select value={phaseFilter} onChange={(event) => setPhaseFilter(event.target.value)} className="rounded-full border border-[rgba(21,38,43,0.08)] bg-white px-4 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--ink)] focus:outline-none">
                <option>Todas</option>
                {PHASES.map((phase) => <option key={phase}>{phase}</option>)}
              </select>
            </div>
          </div>

          <SummaryCard label="Fonte mais recente" value={latestEvent?.fonte || 'Não informada'} helper="Use a timeline para consolidar origem da informação e evidência associada." />
        </div>
      </section>

      {showForm && (
        <section className="app-panel rounded-[30px] p-5 shadow-[0_18px_36px_rgba(21,38,43,0.06)]">
          <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--ink-soft)]">Novo marco</div>
          <h3 className="mt-2 font-syne text-2xl font-bold text-[var(--ink)]">Registrar evento</h3>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--ink-soft)]">Data e hora (UTC)</label>
              <input type="datetime-local" value={form.datetime} onChange={(event) => setForm((current) => ({ ...current, datetime: event.target.value }))} className={inputClass} />
            </div>
            <div>
              <label className="mb-2 block font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--ink-soft)]">Fase</label>
              <select value={form.fase} onChange={(event) => setForm((current) => ({ ...current, fase: event.target.value }))} className={inputClass}>
                {PHASES.map((phase) => <option key={phase}>{phase}</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="mb-2 block font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--ink-soft)]">Evento</label>
              <textarea value={form.evento} onChange={(event) => setForm((current) => ({ ...current, evento: event.target.value }))} rows={3} className={`${inputClass} min-h-[120px]`} placeholder="Explique a decisão, descoberta ou ação registrada." />
            </div>
            <div>
              <label className="mb-2 block font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--ink-soft)]">Fonte</label>
              <input type="text" value={form.fonte} onChange={(event) => setForm((current) => ({ ...current, fonte: event.target.value }))} className={inputClass} placeholder="Ex.: SIEM, reunião, jurídico, forense" />
            </div>
            <div>
              <label className="mb-2 block font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--ink-soft)]">Evidência</label>
              <input type="text" value={form.evidencia} onChange={(event) => setForm((current) => ({ ...current, evidencia: event.target.value }))} className={inputClass} placeholder="Ex.: arquivo, ticket, print ou log" />
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <button onClick={() => setShowForm(false)} className="btn-outline px-4 py-2 text-[11px] uppercase tracking-[0.18em]">Cancelar</button>
            <button onClick={addEvent} className="btn-primary px-4 py-2 text-[11px] uppercase tracking-[0.18em]">Salvar evento</button>
          </div>
        </section>
      )}

      <section className="space-y-4">
        {filteredEvents.length === 0 ? (
          <div className="rounded-[30px] border border-dashed border-[rgba(21,38,43,0.12)] bg-white/76 p-10 text-center text-sm leading-7 text-[var(--ink-soft)]">
            Nenhum evento encontrado para o filtro atual.
          </div>
        ) : (
          filteredEvents.map((event, index) => (
            <article key={event.id} className="grid gap-4 lg:grid-cols-[120px_minmax(0,1fr)_auto]">
              <div className="hidden lg:flex items-start justify-center">
                <div className="flex h-full flex-col items-center">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full border border-[rgba(21,38,43,0.08)] bg-white shadow-[0_10px_20px_rgba(21,38,43,0.06)]">
                    <CalendarClock size={16} className="text-[var(--ink)]" />
                  </div>
                  {index < filteredEvents.length - 1 && <div className="mt-2 h-full min-h-[70px] w-px bg-[rgba(21,38,43,0.08)]" />}
                </div>
              </div>

              <div className="rounded-[30px] border border-[rgba(21,38,43,0.08)] bg-white/82 p-5 shadow-[0_14px_28px_rgba(21,38,43,0.05)]">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="rounded-full border border-[rgba(21,38,43,0.08)] bg-[#f4f6ef] px-3 py-1 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--ink)]">
                    {event.datetime?.replace('T', ' ') || 'Sem data'}
                  </span>
                  <span className={`rounded-full border px-3 py-1 font-mono text-[11px] uppercase tracking-[0.18em] ${PHASE_TONES[event.fase] || PHASE_TONES['Pós-Incidente']}`}>
                    {event.fase}
                  </span>
                  {event.fonte && <span className="rounded-full border border-[rgba(21,38,43,0.08)] bg-white px-3 py-1 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--ink-soft)]">Fonte: {event.fonte}</span>}
                </div>
                <h3 className="mt-4 font-syne text-2xl font-bold text-[var(--ink)]">{event.evento}</h3>
                {event.evidencia && (
                  <div className="mt-4 rounded-[22px] border border-[rgba(21,38,43,0.08)] bg-[#f9faf6] px-4 py-3 text-sm leading-7 text-[var(--ink-soft)]">
                    Evidência relacionada: {event.evidencia}
                  </div>
                )}
              </div>

              <div className="flex items-start justify-end">
                <button onClick={() => saveEvents(events.filter((item) => item.id !== event.id))} className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-red-700 hover:bg-red-100">
                  Excluir <Trash2 size={13} />
                </button>
              </div>
            </article>
          ))
        )}
      </section>
    </div>
  );
}
