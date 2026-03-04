import { useState, useEffect } from 'react';
import { getStorage, setStorage, KEYS } from '../../utils/storage';
import { Plus, AlertTriangle, Trash2 } from 'lucide-react';

const STATUS_OPTS = ['Aguardando', 'Notificado', 'Em Análise', 'Ação em Curso', 'Concluído', 'Inadimplente'];
const STATUS_STYLE = {
  'Aguardando': 'bg-gray-100 text-gray-700 border-gray-200',
  'Notificado': 'bg-blue-50 text-blue-700 border-blue-200',
  'Em Análise': 'bg-amber-50 text-amber-700 border-amber-200',
  'Ação em Curso': 'bg-purple-50 text-purple-700 border-purple-200',
  'Concluído': 'bg-green-50 text-green-700 border-green-200',
  'Inadimplente': 'bg-red-100 text-red-800 border-red-300',
};

const EMPTY_FORM = { parceiro: '', poc: '', contato: '', horaNotificacao: '', protocoloSLA: '', status: 'Aguardando', descricaoAcao: '', risco: '' };

export default function TabTerceiros({ effectiveClientId }) {
  const [terceiros, setTerceiros] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const pmoData = getStorage(KEYS.pmo(effectiveClientId), {});
    setTerceiros(pmoData.terceiros || []);
  }, [effectiveClientId]);

  const saveTerceiros = (t) => {
    const pmoData = getStorage(KEYS.pmo(effectiveClientId), {});
    setStorage(KEYS.pmo(effectiveClientId), { ...pmoData, terceiros: t });
    setTerceiros(t);
  };

  const add = () => {
    if (!form.parceiro.trim()) return;
    saveTerceiros([...terceiros, { id: Date.now(), ...form }]);
    setForm(EMPTY_FORM);
    setShowForm(false);
  };
  const updateStatus = (id, s) => saveTerceiros(terceiros.map(t => t.id === id ? { ...t, status: s } : t));
  const del = (id) => saveTerceiros(terceiros.filter(t => t.id !== id));

  const getSLAStatus = (t) => {
    if (!t.horaNotificacao || !t.protocoloSLA) return null;
    const elapsed = (currentTime - new Date(t.horaNotificacao)) / (1000 * 60 * 60);
    const limit = parseFloat(t.protocoloSLA);
    if (isNaN(limit)) return null;
    return { elapsed: elapsed.toFixed(1), limit, overdue: elapsed > limit };
  };

  const inputClass = "border border-[#E0E0E0] px-3 py-2 font-dm text-sm focus:outline-none focus:border-[#111111] w-full";

  return (
    <div>
      <div className="bg-amber-50 border border-amber-200 px-4 py-3 mb-5 flex items-center gap-2">
        <AlertTriangle size={14} className="text-amber-600" />
        <span className="font-mono text-xs text-amber-700">
          ⚠ Correspondentes com protocolo de 1 hora devem ser monitorados continuamente.
        </span>
      </div>

      <div className="flex justify-end mb-4">
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1.5 bg-[#111111] text-white px-4 py-2 font-mono text-xs hover:bg-[#333]">
          <Plus size={13} /> Adicionar Terceiro
        </button>
      </div>

      {showForm && (
        <div className="border border-[#E0E0E0] p-5 mb-5 bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div><label className="block font-mono text-xs uppercase text-[#555555] mb-1">Parceiro *</label><input type="text" value={form.parceiro} onChange={e => setForm(f => ({ ...f, parceiro: e.target.value }))} className={inputClass} /></div>
            <div><label className="block font-mono text-xs uppercase text-[#555555] mb-1">POC</label><input type="text" value={form.poc} onChange={e => setForm(f => ({ ...f, poc: e.target.value }))} className={inputClass} /></div>
            <div><label className="block font-mono text-xs uppercase text-[#555555] mb-1">Contato</label><input type="text" value={form.contato} onChange={e => setForm(f => ({ ...f, contato: e.target.value }))} className={inputClass} /></div>
            <div><label className="block font-mono text-xs uppercase text-[#555555] mb-1">Hora Notificação</label><input type="datetime-local" value={form.horaNotificacao} onChange={e => setForm(f => ({ ...f, horaNotificacao: e.target.value }))} className={inputClass} /></div>
            <div><label className="block font-mono text-xs uppercase text-[#555555] mb-1">Protocolo SLA (horas)</label><input type="number" value={form.protocoloSLA} onChange={e => setForm(f => ({ ...f, protocoloSLA: e.target.value }))} className={inputClass} placeholder="Ex: 1" /></div>
            <div>
              <label className="block font-mono text-xs uppercase text-[#555555] mb-1">Status</label>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className={inputClass}>
                {STATUS_OPTS.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div><label className="block font-mono text-xs uppercase text-[#555555] mb-1">Descrição da Ação</label><input type="text" value={form.descricaoAcao} onChange={e => setForm(f => ({ ...f, descricaoAcao: e.target.value }))} className={inputClass} /></div>
            <div><label className="block font-mono text-xs uppercase text-[#555555] mb-1">Risco</label><input type="text" value={form.risco} onChange={e => setForm(f => ({ ...f, risco: e.target.value }))} className={inputClass} /></div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowForm(false)} className="border border-[#E0E0E0] px-4 py-2 font-mono text-xs">Cancelar</button>
            <button onClick={add} className="bg-[#111111] text-white px-6 py-2 font-mono text-xs hover:bg-[#333]">Adicionar</button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {terceiros.length === 0 && (
          <div className="border border-[#E0E0E0] p-8 text-center text-gray-400 font-dm text-sm">Nenhum terceiro registrado</div>
        )}
        {terceiros.map(t => {
          const sla = getSLAStatus(t);
          const isInad = t.status === 'Inadimplente';
          return (
            <div key={t.id} className={`border p-4 ${isInad ? 'border-red-300 bg-red-50/40' : 'border-[#E0E0E0]'}`}>
              <div className="flex items-start justify-between gap-4 mb-2">
                <div>
                  <div className="font-syne font-bold text-[#111111] text-sm">{t.parceiro}</div>
                  {t.poc && <div className="font-dm text-xs text-[#555555]">POC: {t.poc} · {t.contato}</div>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <select
                    value={t.status}
                    onChange={e => updateStatus(t.id, e.target.value)}
                    className={`font-mono text-xs px-2 py-1 border ${STATUS_STYLE[t.status]} focus:outline-none cursor-pointer`}
                  >
                    {STATUS_OPTS.map(s => <option key={s}>{s}</option>)}
                  </select>
                  <button onClick={() => del(t.id)} className="text-gray-400 hover:text-red-600"><Trash2 size={13} /></button>
                </div>
              </div>
              {sla && (
                <div className={`font-mono text-xs flex items-center gap-2 mt-1 ${sla.overdue ? 'text-red-600' : 'text-amber-600'}`}>
                  {sla.overdue && <AlertTriangle size={11} className="animate-pulse" />}
                  SLA: {sla.elapsed}h / {sla.limit}h {sla.overdue ? '— INADIMPLENTE' : 'decorridos'}
                </div>
              )}
              {t.descricaoAcao && <p className="font-dm text-xs text-[#555555] mt-1">{t.descricaoAcao}</p>}
              {t.risco && <p className="font-mono text-xs text-amber-600 mt-0.5">Risco: {t.risco}</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
