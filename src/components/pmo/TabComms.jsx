import { useState, useEffect } from 'react';
import { getStorage, setStorage, KEYS } from '../../utils/storage';
import { Plus, Lock, AlertTriangle, Trash2 } from 'lucide-react';

const PUBLICO_OPTS = ['Clientes', 'Reguladores', 'Imprensa', 'Colaboradores', 'ANPD', 'Parceiros', 'Diretoria', 'Outro'];
const CANAL_OPTS = ['Email', 'Site Oficial', 'Press Release', 'SEI! ANPD', 'WhatsApp', 'Reunião', 'Outro'];
const STATUS_OPTS = ['Rascunho', 'Pendente Jurídico', 'Aprovado', 'Enviado', 'Cancelado'];

const STATUS_STYLE = {
  'Rascunho': 'bg-gray-100 text-gray-600 border-gray-200',
  'Pendente Jurídico': 'bg-amber-50 text-amber-700 border-amber-200',
  'Aprovado': 'bg-blue-50 text-blue-700 border-blue-200',
  'Enviado': 'bg-green-50 text-green-700 border-green-200',
  'Cancelado': 'bg-red-50 text-red-600 border-red-200',
};

const EMPTY_FORM = {
  publico: '', mensagem: '', canal: 'Email',
  statusAprovacao: 'Rascunho', aprovadoPor: '', dataEnvio: '', observacoes: '',
  actividadeId: '',
};

export default function TabComms({ effectiveClientId }) {
  const [comms, setComms] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [activities, setActivities] = useState([]);

  useEffect(() => {
    const pmoData = getStorage(KEYS.pmo(effectiveClientId), {});
    setComms(pmoData.commsLog || []);
    setActivities(getStorage(KEYS.activities(effectiveClientId), []));
  }, [effectiveClientId]);

  const saveComms = (c) => {
    const pmoData = getStorage(KEYS.pmo(effectiveClientId), {});
    setStorage(KEYS.pmo(effectiveClientId), { ...pmoData, commsLog: c });
    setComms(c);
  };

  const addComm = () => {
    if (!form.mensagem.trim()) return;
    saveComms([...comms, { id: Date.now(), createdAt: new Date().toISOString(), ...form }]);
    setForm(EMPTY_FORM);
    setShowForm(false);
  };

  const updateStatus = (id, s) => saveComms(comms.map(c => c.id === id ? { ...c, statusAprovacao: s } : c));
  const deleteComm = (id) => saveComms(comms.filter(c => c.id !== id));

  const now = new Date();
  const isPendingOverdue = (c) => {
    if (c.statusAprovacao !== 'Pendente Jurídico') return false;
    const diff = now - new Date(c.createdAt);
    return diff > 2 * 60 * 60 * 1000;
  };
  const isApprovedNotSent = (c) => {
    if (c.statusAprovacao !== 'Aprovado') return false;
    const diff = now - new Date(c.createdAt);
    return diff > 1 * 60 * 60 * 1000;
  };

  const inputClass = "border border-[#E0E0E0] px-3 py-2 font-dm text-sm focus:outline-none focus:border-[#111111] w-full";

  return (
    <div>
      {/* OPSEC Card */}
      <div className="bg-[#111111] border-l-4 border-[#CAFF00] p-4 mb-5">
        <div className="flex items-center gap-2 text-[#CAFF00] font-mono text-xs font-medium">
          <Lock size={13} />
          OPSEC: Nenhuma comunicação externa deve sair sem aprovação do Jurídico e do CISO.
        </div>
      </div>

      <div className="flex justify-end mb-4">
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1.5 bg-[#111111] text-white px-4 py-2 font-mono text-xs hover:bg-[#333]">
          <Plus size={13} /> Registrar Comunicação
        </button>
      </div>

      {showForm && (
        <div className="border border-[#E0E0E0] p-5 mb-5 bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block font-mono text-xs uppercase text-[#555555] mb-1">Público Alvo</label>
              <input list="publico-list" value={form.publico} onChange={e => setForm(f => ({ ...f, publico: e.target.value }))} className={inputClass} placeholder="Selecione ou escreva..." />
              <datalist id="publico-list">{PUBLICO_OPTS.map(p => <option key={p} value={p} />)}</datalist>
            </div>
            <div>
              <label className="block font-mono text-xs uppercase text-[#555555] mb-1">Canal</label>
              <select value={form.canal} onChange={e => setForm(f => ({ ...f, canal: e.target.value }))} className={inputClass}>
                {CANAL_OPTS.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block font-mono text-xs uppercase text-[#555555] mb-1">Mensagem Aprovada *</label>
              <textarea value={form.mensagem} onChange={e => setForm(f => ({ ...f, mensagem: e.target.value }))} rows={3} className={`${inputClass} resize-none`} />
            </div>
            <div>
              <label className="block font-mono text-xs uppercase text-[#555555] mb-1">Status Aprovação</label>
              <select value={form.statusAprovacao} onChange={e => setForm(f => ({ ...f, statusAprovacao: e.target.value }))} className={inputClass}>
                {STATUS_OPTS.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block font-mono text-xs uppercase text-[#555555] mb-1">Aprovado por</label>
              <input type="text" value={form.aprovadoPor} onChange={e => setForm(f => ({ ...f, aprovadoPor: e.target.value }))} className={inputClass} />
            </div>
            {form.statusAprovacao === 'Enviado' && (
              <div>
                <label className="block font-mono text-xs uppercase text-[#555555] mb-1">Data/Hora Envio</label>
                <input type="datetime-local" value={form.dataEnvio} onChange={e => setForm(f => ({ ...f, dataEnvio: e.target.value }))} className={inputClass} />
              </div>
            )}
            <div className="md:col-span-2">
              <label className="block font-mono text-xs uppercase text-[#555555] mb-1">Observações</label>
              <input type="text" value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} className={inputClass} />
            </div>
            <div className="md:col-span-2">
              <label className="block font-mono text-xs uppercase text-[#555555] mb-1">Atividade relacionada na Jornada</label>
              <select value={form.actividadeId} onChange={e => setForm(f => ({ ...f, actividadeId: e.target.value ? Number(e.target.value) : '' }))} className={inputClass}>
                <option value="">— Nenhuma —</option>
                {activities.map(a => (
                  <option key={a.id} value={a.id}>#{a.id} {a.nome}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowForm(false)} className="border border-[#E0E0E0] px-4 py-2 font-mono text-xs">Cancelar</button>
            <button onClick={addComm} className="bg-[#111111] text-white px-6 py-2 font-mono text-xs hover:bg-[#333]">Registrar</button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {comms.length === 0 && (
          <div className="border border-[#E0E0E0] p-8 text-center text-gray-400 font-dm text-sm">
            Nenhuma comunicação registrada
          </div>
        )}
        {comms.map(c => {
          const pendOverdue = isPendingOverdue(c);
          const approvedNotSent = isApprovedNotSent(c);
          return (
            <div key={c.id} className={`border p-4 ${pendOverdue ? 'border-amber-300 bg-amber-50' : approvedNotSent ? 'border-red-300 bg-red-50' : 'border-[#E0E0E0]'}`}>
              <div className="flex items-start justify-between gap-4 mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`font-mono text-xs px-2 py-0.5 border ${STATUS_STYLE[c.statusAprovacao]}`}>
                    {pendOverdue && <AlertTriangle size={10} className="inline mr-1 animate-pulse-amber" />}
                    {approvedNotSent && <AlertTriangle size={10} className="inline mr-1 animate-pulse-red" />}
                    {c.statusAprovacao}
                  </span>
                  <span className="font-mono text-xs text-[#555555]">{c.publico || '—'}</span>
                  <span className="font-mono text-xs text-[#555555]">via {c.canal}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <select
                    value={c.statusAprovacao}
                    onChange={e => updateStatus(c.id, e.target.value)}
                    className={`font-mono text-xs px-2 py-1 border ${STATUS_STYLE[c.statusAprovacao]} focus:outline-none cursor-pointer`}
                  >
                    {STATUS_OPTS.map(s => <option key={s}>{s}</option>)}
                  </select>
                  <button onClick={() => deleteComm(c.id)} className="text-gray-400 hover:text-red-600">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
              <p className="font-dm text-sm text-[#111111] mb-1">{c.mensagem}</p>
              {c.aprovadoPor && <p className="font-mono text-xs text-[#555555]">Aprovado por: {c.aprovadoPor}</p>}
              {c.dataEnvio && <p className="font-mono text-xs text-[#555555]">Enviado: {c.dataEnvio.replace('T', ' ')}</p>}
              {c.actividadeId && (() => {
                const act = activities.find(a => a.id === c.actividadeId);
                return act ? (
                  <p className="font-mono text-xs text-blue-600 mt-1">↗ Atividade #{act.id}: {act.nome}</p>
                ) : null;
              })()}
            </div>
          );
        })}
      </div>
    </div>
  );
}
