import { useState, useEffect } from 'react';
import { getStorage, setStorage, KEYS } from '../../utils/storage';
import { Plus, Download, Trash2 } from 'lucide-react';

const PHASES = ['Detecção', 'Análise', 'Contenção', 'Erradicação', 'Recuperação', 'Pós-Incidente'];

const PHASE_COLORS = {
  'Detecção': 'bg-red-600 text-white',
  'Análise': 'bg-amber-500 text-black',
  'Contenção': 'bg-purple-600 text-white',
  'Erradicação': 'bg-blue-600 text-white',
  'Recuperação': 'bg-green-600 text-white',
  'Pós-Incidente': 'bg-gray-500 text-white',
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

  const inputClass = "border border-[#E0E0E0] px-3 py-2 font-dm text-sm focus:outline-none focus:border-[#111111] w-full";

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <p className="text-[#555555] font-dm text-sm">Registro minuto a minuto para auditoria forense e compliance ANPD</p>
        <div className="flex gap-3">
          <button onClick={exportCSV} className="flex items-center gap-1.5 border border-[#E0E0E0] px-3 py-2 font-mono text-xs hover:bg-gray-50 transition-colors">
            <Download size={13} /> Exportar CSV
          </button>
          <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1.5 bg-[#111111] text-white px-3 py-2 font-mono text-xs hover:bg-[#333] transition-colors">
            <Plus size={13} /> Registrar Evento
          </button>
        </div>
      </div>

      {showForm && (
        <div className="border border-[#E0E0E0] p-5 mb-5 bg-gray-50">
          <h4 className="font-syne font-bold uppercase text-sm mb-4">Novo Evento</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block font-mono text-xs uppercase text-[#555555] mb-1">Data/Hora UTC *</label>
              <input type="datetime-local" value={form.datetime} onChange={e => setForm(f => ({ ...f, datetime: e.target.value }))} className={inputClass} />
            </div>
            <div>
              <label className="block font-mono text-xs uppercase text-[#555555] mb-1">Fase NIST</label>
              <select value={form.fase} onChange={e => setForm(f => ({ ...f, fase: e.target.value }))} className={inputClass}>
                {PHASES.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block font-mono text-xs uppercase text-[#555555] mb-1">Evento/Ação *</label>
              <textarea value={form.evento} onChange={e => setForm(f => ({ ...f, evento: e.target.value }))} rows={2} className={`${inputClass} resize-none`} placeholder="Descreva o evento..." />
            </div>
            <div>
              <label className="block font-mono text-xs uppercase text-[#555555] mb-1">Fonte</label>
              <input type="text" value={form.fonte} onChange={e => setForm(f => ({ ...f, fonte: e.target.value }))} className={inputClass} placeholder="Ex: SIEM, analista..." />
            </div>
            <div>
              <label className="block font-mono text-xs uppercase text-[#555555] mb-1">Evidência</label>
              <input type="text" value={form.evidencia} onChange={e => setForm(f => ({ ...f, evidencia: e.target.value }))} className={inputClass} placeholder="Ex: log-001.txt" />
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowForm(false)} className="border border-[#E0E0E0] px-4 py-2 font-mono text-xs hover:bg-white transition-colors">Cancelar</button>
            <button onClick={addEvent} className="bg-[#111111] text-white px-6 py-2 font-mono text-xs hover:bg-[#333] transition-colors">Registrar</button>
          </div>
        </div>
      )}

      <div className="border border-[#E0E0E0] overflow-x-auto">
        <table className="w-full min-w-[700px]">
          <thead>
            <tr className="bg-[#111111]">
              {['DATA/HORA UTC', 'FASE', 'EVENTO/AÇÃO', 'FONTE', 'EVIDÊNCIA', 'AÇÕES'].map(h => (
                <th key={h} className="px-4 py-3 text-left font-mono text-xs text-white uppercase whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {events.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400 font-dm text-sm">Nenhum evento registrado</td>
              </tr>
            )}
            {events.map((evt, idx) => (
              <tr key={evt.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-[#F9F9F9]'}>
                <td className="px-4 py-3 font-mono text-xs text-[#555555] whitespace-nowrap">{evt.datetime?.replace('T', ' ') || '—'}</td>
                <td className="px-4 py-3">
                  <span className={`font-mono text-xs px-2 py-0.5 ${PHASE_COLORS[evt.fase] || 'bg-gray-100'}`}>
                    {evt.fase}
                  </span>
                </td>
                <td className="px-4 py-3 font-dm text-sm text-[#111111] max-w-[250px]">{evt.evento}</td>
                <td className="px-4 py-3 font-mono text-xs text-[#555555]">{evt.fonte || '—'}</td>
                <td className="px-4 py-3 font-mono text-xs text-[#555555]">{evt.evidencia || '—'}</td>
                <td className="px-4 py-3">
                  <button onClick={() => deleteEvent(evt.id)} className="text-gray-400 hover:text-red-600 transition-colors">
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
