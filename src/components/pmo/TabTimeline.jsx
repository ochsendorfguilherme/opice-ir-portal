import { useState, useEffect } from 'react';
import { getStorage, setStorage, KEYS } from '../../utils/storage';
import { Plus, Download, Trash2 } from 'lucide-react';

const PHASES = ['Detecção', 'Análise', 'Contenção', 'Erradicação', 'Recuperação', 'Pós-Incidente'];

const PHASE_COLORS = {
  'Detecção': 'bg-red-600 text-[#fffdf8]',
  'Análise': 'bg-amber-500 text-black',
  'Contenção': 'bg-purple-600 text-[#fffdf8]',
  'Erradicação': 'bg-blue-600 text-[#fffdf8]',
  'Recuperação': 'bg-green-600 text-[#fffdf8]',
  'Pós-Incidente': 'bg-white/720 text-[#fffdf8]',
};

const now = () => new Date().toISOString().slice(0, 16);

export default function TabTimeline({ effectiveClientId }) {
  const [events, setEvents] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ datetime: now(), fase: 'Detecção', evento: '', fonte: '', evidencia: '' });

  useEffect(() => {
    const pmoData = getStorage(KEYS.pmo(effectiveClientId), {});
    setEvents(pmoData.timeline || []);
  }, [effectiveClientId]);

  const saveEvents = (evts) => {
    const pmoData = getStorage(KEYS.pmo(effectiveClientId), {});
    setStorage(KEYS.pmo(effectiveClientId), { ...pmoData, timeline: evts });
    setEvents(evts);
  };

  const addEvent = () => {
    if (!form.evento.trim()) return;
    const newEvt = { id: Date.now(), ...form };
    const sorted = [...events, newEvt].sort((a, b) => new Date(b.datetime) - new Date(a.datetime));
    saveEvents(sorted);
    setForm({ datetime: now(), fase: 'Detecção', evento: '', fonte: '', evidencia: '' });
    setShowForm(false);
  };

  const deleteEvent = (id) => {
    saveEvents(events.filter(e => e.id !== id));
  };

  const exportCSV = () => {
    const header = 'DATA/HORA UTC,FASE,EVENTO,FONTE,EVIDENCIA\n';
    const rows = events.map(e => `"${e.datetime}","${e.fase}","${e.evento}","${e.fonte || ''}","${e.evidencia || ''}"`).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `OPICE_Timeline_${effectiveClientId}_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const inputClass = "border border-[rgba(21,38,43,0.12)] px-3 py-2 font-dm text-sm focus:outline-none focus:border-[rgba(21,38,43,0.16)] w-full";

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <p className="text-[var(--ink-soft)] font-dm text-sm">Registro minuto a minuto para auditoria forense e compliance ANPD</p>
        <div className="flex gap-3">
          <button onClick={exportCSV} className="flex items-center gap-1.5 border border-[rgba(21,38,43,0.12)] px-3 py-2 font-mono text-xs hover:bg-white/72 transition-colors">
            <Download size={13} /> Exportar CSV
          </button>
          <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1.5 bg-[#173038] text-[#fffdf8] px-3 py-2 font-mono text-xs hover:bg-[#0f2128] transition-colors">
            <Plus size={13} /> Registrar Evento
          </button>
        </div>
      </div>

      {showForm && (
        <div className="border border-[rgba(21,38,43,0.12)] p-5 mb-5 bg-white/72">
          <h4 className="font-syne font-bold uppercase text-sm mb-4">Novo Evento</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block font-mono text-xs uppercase text-[var(--ink-soft)] mb-1">Data/Hora UTC *</label>
              <input type="datetime-local" value={form.datetime} onChange={e => setForm(f => ({ ...f, datetime: e.target.value }))} className={inputClass} />
            </div>
            <div>
              <label className="block font-mono text-xs uppercase text-[var(--ink-soft)] mb-1">Fase NIST</label>
              <select value={form.fase} onChange={e => setForm(f => ({ ...f, fase: e.target.value }))} className={inputClass}>
                {PHASES.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block font-mono text-xs uppercase text-[var(--ink-soft)] mb-1">Evento/Ação *</label>
              <textarea value={form.evento} onChange={e => setForm(f => ({ ...f, evento: e.target.value }))} rows={2} className={`${inputClass} resize-none`} placeholder="Descreva o evento..." />
            </div>
            <div>
              <label className="block font-mono text-xs uppercase text-[var(--ink-soft)] mb-1">Fonte</label>
              <input type="text" value={form.fonte} onChange={e => setForm(f => ({ ...f, fonte: e.target.value }))} className={inputClass} placeholder="Ex: SIEM, analista..." />
            </div>
            <div>
              <label className="block font-mono text-xs uppercase text-[var(--ink-soft)] mb-1">Evidência</label>
              <input type="text" value={form.evidencia} onChange={e => setForm(f => ({ ...f, evidencia: e.target.value }))} className={inputClass} placeholder="Ex: log-001.txt" />
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowForm(false)} className="border border-[rgba(21,38,43,0.12)] px-4 py-2 font-mono text-xs hover:bg-white transition-colors">Cancelar</button>
            <button onClick={addEvent} className="bg-[#173038] text-[#fffdf8] px-6 py-2 font-mono text-xs hover:bg-[#0f2128] transition-colors">Registrar</button>
          </div>
        </div>
      )}

      <div className="border border-[rgba(21,38,43,0.12)] overflow-x-auto">
        <table className="w-full min-w-[700px]">
          <thead>
            <tr className="bg-[#173038]">
              {['DATA/HORA UTC', 'FASE', 'EVENTO/AÇÃO', 'FONTE', 'EVIDÊNCIA', 'AÇÕES'].map(h => (
                <th key={h} className="px-4 py-3 text-left font-mono text-xs text-[#fffdf8] uppercase whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {events.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-[var(--ink-soft)] font-dm text-sm">Nenhum evento registrado</td>
              </tr>
            )}
            {events.map((evt, idx) => (
              <tr key={evt.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-[#F9F9F9]'}>
                <td className="px-4 py-3 font-mono text-xs text-[var(--ink-soft)] whitespace-nowrap">{evt.datetime?.replace('T', ' ') || '—'}</td>
                <td className="px-4 py-3">
                  <span className={`font-mono text-xs px-2 py-0.5 ${PHASE_COLORS[evt.fase] || 'bg-white/70'}`}>
                    {evt.fase}
                  </span>
                </td>
                <td className="px-4 py-3 font-dm text-sm text-[var(--ink)] max-w-[250px]">{evt.evento}</td>
                <td className="px-4 py-3 font-mono text-xs text-[var(--ink-soft)]">{evt.fonte || '—'}</td>
                <td className="px-4 py-3 font-mono text-xs text-[var(--ink-soft)]">{evt.evidencia || '—'}</td>
                <td className="px-4 py-3">
                  <button onClick={() => deleteEvent(evt.id)} className="text-[var(--ink-soft)] hover:text-red-600 transition-colors">
                    <Trash2 size={13} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
