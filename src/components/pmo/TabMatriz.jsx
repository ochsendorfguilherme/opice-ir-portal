import { useState, useEffect } from 'react';
import { getStorage, setStorage, KEYS } from '../../utils/storage';
import { Plus, Trash2, AlertTriangle, Columns, List } from 'lucide-react';

const AREAS = ['TI', 'Jurídico', 'DPO', 'Comunicação', 'RH', 'Diretoria', 'Segurança', 'Compliance'];
const STATUS_OPTS = ['Aberto', 'Em andamento', 'Bloqueado', 'Feito'];
const PRIORIDADE_OPTS = ['Crítica', 'Alta', 'Média', 'Baixa'];

const STATUS_STYLE = {
  'Aberto': 'bg-gray-100 text-gray-700 border-gray-200',
  'Em andamento': 'bg-amber-50 text-amber-700 border-amber-200',
  'Bloqueado': 'bg-red-50 text-red-700 border-red-200',
  'Feito': 'bg-green-50 text-green-700 border-green-200',
};

const PRIO_STYLE = {
  'Crítica': 'bg-red-100 text-red-700',
  'Alta': 'bg-orange-100 text-orange-700',
  'Média': 'bg-amber-100 text-amber-700',
  'Baixa': 'bg-gray-100 text-gray-600',
};

function nextId(actions) {
  const nums = actions.map(a => parseInt(a.id?.replace('#', '') || 0)).filter(Boolean);
  return `#${String(Math.max(0, ...nums) + 1).padStart(3, '0')}`;
}

const EMPTY_FORM = { descricao: '', responsavel: '', area: 'TI', status: 'Aberto', prazo: '', prioridade: 'Alta', observacoes: '' };

export default function TabMatriz({ effectiveClientId }) {
  const [actions, setActions] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [filterStatus, setFilterStatus] = useState('Todos');
  const [filterArea, setFilterArea] = useState('Todos');
  const [filterPrio, setFilterPrio] = useState('Todos');
  const [view, setView] = useState('table');

  useEffect(() => {
    const pmoData = getStorage(KEYS.pmo(effectiveClientId), {});
    setActions(pmoData.actions || []);
  }, [effectiveClientId]);

  const saveActions = (acts) => {
    const pmoData = getStorage(KEYS.pmo(effectiveClientId), {});
    setStorage(KEYS.pmo(effectiveClientId), { ...pmoData, actions: acts });
    setActions(acts);
  };

  const addAction = () => {
    if (!form.descricao.trim()) return;
    const newAction = { id: nextId(actions), ...form };
    saveActions([...actions, newAction]);
    setForm(EMPTY_FORM);
    setShowForm(false);
  };

  const updateStatus = (id, status) => {
    saveActions(actions.map(a => a.id === id ? { ...a, status } : a));
  };

  const deleteAction = (id) => saveActions(actions.filter(a => a.id !== id));

  const now = new Date();
  const filtered = actions.filter(a => {
    if (filterStatus !== 'Todos' && a.status !== filterStatus) return false;
    if (filterArea !== 'Todos' && a.area !== filterArea) return false;
    if (filterPrio !== 'Todos' && a.prioridade !== filterPrio) return false;
    return true;
  });

  const isOverdue = (a) => a.prazo && new Date(a.prazo) < now && a.status !== 'Feito';

  const inputClass = "border border-[#E0E0E0] px-3 py-2 font-dm text-sm focus:outline-none focus:border-[#111111] w-full";

  const blockedCount = actions.filter(a => a.status === 'Bloqueado').length;

  return (
    <div>
      {blockedCount > 0 && (
        <div className="mb-4 bg-red-50 border border-red-200 px-4 py-3 flex items-center gap-2">
          <AlertTriangle size={14} className="text-red-600 animate-pulse-red" />
          <span className="font-mono text-xs text-red-700">{blockedCount} ação(ões) BLOQUEADA(S) requer atenção imediata</span>
        </div>
      )}

      <div className="flex flex-wrap gap-3 mb-5">
        <div className="flex border border-[#E0E0E0]">
          <button onClick={() => setView('table')} className={`flex items-center gap-1 px-3 py-2 font-mono text-xs ${view === 'table' ? 'bg-[#111111] text-white' : 'hover:bg-gray-50'}`}>
            <List size={12} /> Tabela
          </button>
          <button onClick={() => setView('kanban')} className={`flex items-center gap-1 px-3 py-2 font-mono text-xs ${view === 'kanban' ? 'bg-[#111111] text-white' : 'hover:bg-gray-50'}`}>
            <Columns size={12} /> Kanban
          </button>
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="border border-[#E0E0E0] px-2 py-2 font-mono text-xs focus:outline-none">
          <option>Todos</option>
          {STATUS_OPTS.map(s => <option key={s}>{s}</option>)}
        </select>
        <select value={filterArea} onChange={e => setFilterArea(e.target.value)} className="border border-[#E0E0E0] px-2 py-2 font-mono text-xs focus:outline-none">
          <option>Todos</option>
          {AREAS.map(a => <option key={a}>{a}</option>)}
        </select>
        <select value={filterPrio} onChange={e => setFilterPrio(e.target.value)} className="border border-[#E0E0E0] px-2 py-2 font-mono text-xs focus:outline-none">
          <option>Todos</option>
          {PRIORIDADE_OPTS.map(p => <option key={p}>{p}</option>)}
        </select>
        <button onClick={() => setShowForm(!showForm)} className="ml-auto flex items-center gap-1.5 bg-[#111111] text-white px-4 py-2 font-mono text-xs hover:bg-[#333] transition-colors">
          <Plus size={13} /> Nova Ação
        </button>
      </div>

      {showForm && (
        <div className="border border-[#E0E0E0] p-5 mb-5 bg-gray-50">
          <h4 className="font-syne font-bold uppercase text-sm mb-4">Nova Ação — {nextId(actions)}</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="md:col-span-2">
              <label className="block font-mono text-xs uppercase text-[#555555] mb-1">Descrição *</label>
              <input type="text" value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} className={inputClass} placeholder="Descreva a ação..." />
            </div>
            <div>
              <label className="block font-mono text-xs uppercase text-[#555555] mb-1">Responsável (pessoa)</label>
              <input type="text" value={form.responsavel} onChange={e => setForm(f => ({ ...f, responsavel: e.target.value }))} className={inputClass} placeholder="Nome do responsável" />
            </div>
            <div>
              <label className="block font-mono text-xs uppercase text-[#555555] mb-1">Área</label>
              <select value={form.area} onChange={e => setForm(f => ({ ...f, area: e.target.value }))} className={inputClass}>
                {AREAS.map(a => <option key={a}>{a}</option>)}
              </select>
            </div>
            <div>
              <label className="block font-mono text-xs uppercase text-[#555555] mb-1">Status</label>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className={inputClass}>
                {STATUS_OPTS.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block font-mono text-xs uppercase text-[#555555] mb-1">Prazo</label>
              <input type="datetime-local" value={form.prazo} onChange={e => setForm(f => ({ ...f, prazo: e.target.value }))} className={inputClass} />
            </div>
            <div>
              <label className="block font-mono text-xs uppercase text-[#555555] mb-1">Prioridade</label>
              <select value={form.prioridade} onChange={e => setForm(f => ({ ...f, prioridade: e.target.value }))} className={inputClass}>
                {PRIORIDADE_OPTS.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="block font-mono text-xs uppercase text-[#555555] mb-1">Observações/Blockers</label>
              <input type="text" value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} className={inputClass} />
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowForm(false)} className="border border-[#E0E0E0] px-4 py-2 font-mono text-xs hover:bg-white">Cancelar</button>
            <button onClick={addAction} className="bg-[#111111] text-white px-6 py-2 font-mono text-xs hover:bg-[#333]">Adicionar</button>
          </div>
        </div>
      )}

      {view === 'table' && (
        <div className="border border-[#E0E0E0] overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className="bg-[#111111]">
                {['ID', 'DESCRIÇÃO', 'RESPONSÁVEL', 'ÁREA', 'STATUS', 'PRAZO', 'PRIORIDADE', 'AÇÕES'].map(h => (
                  <th key={h} className="px-3 py-3 text-left font-mono text-xs text-white uppercase whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400 font-dm text-sm">Nenhuma ação encontrada</td></tr>
              )}
              {filtered.map((a, idx) => {
                const overdue = isOverdue(a);
                const isBlocked = a.status === 'Bloqueado';
                return (
                  <tr key={a.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-[#F9F9F9]'} ${isBlocked ? 'border-l-4 border-l-red-500 bg-red-50/40' : ''}`}>
                    <td className="px-3 py-3 font-mono text-xs text-[#555555]">{a.id}</td>
                    <td className="px-3 py-3 font-dm text-sm text-[#111111] max-w-[200px]">
                      <div>{a.descricao}</div>
                      {a.observacoes && <div className="text-xs text-gray-500 mt-0.5">{a.observacoes}</div>}
                    </td>
                    <td className="px-3 py-3 font-dm text-xs">{a.responsavel || '—'}</td>
                    <td className="px-3 py-3 font-mono text-xs">{a.area}</td>
                    <td className="px-3 py-3">
                      <select
                        value={a.status}
                        onChange={e => updateStatus(a.id, e.target.value)}
                        className={`font-mono text-xs px-2 py-1 border ${STATUS_STYLE[a.status]} cursor-pointer focus:outline-none`}
                      >
                        {STATUS_OPTS.map(s => <option key={s}>{s}</option>)}
                      </select>
                    </td>
                    <td className={`px-3 py-3 font-mono text-xs whitespace-nowrap ${overdue ? 'text-red-600' : 'text-[#555555]'}`}>
                      {a.prazo ? (
                        <span className="flex items-center gap-1">
                          {overdue && <AlertTriangle size={11} className="animate-pulse" />}
                          {a.prazo.replace('T', ' ')}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-3 py-3">
                      <span className={`font-mono text-xs px-2 py-0.5 ${PRIO_STYLE[a.prioridade] || ''}`}>{a.prioridade}</span>
                    </td>
                    <td className="px-3 py-3">
                      <button onClick={() => deleteAction(a.id)} className="text-gray-400 hover:text-red-600 transition-colors">
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {view === 'kanban' && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {STATUS_OPTS.map(col => {
            const colActs = filtered.filter(a => a.status === col);
            return (
              <div key={col}>
                <div className={`px-3 py-2 mb-3 font-mono text-xs flex items-center justify-between border ${STATUS_STYLE[col]}`}>
                  <span className="uppercase">{col}</span>
                  <span>{colActs.length}</span>
                </div>
                <div className="space-y-2">
                  {colActs.map(a => (
                    <div key={a.id} className={`bg-white border p-3 ${a.status === 'Bloqueado' ? 'border-red-400' : 'border-[#E0E0E0]'}`}>
                      <div className="font-mono text-xs text-[#555555] mb-1">{a.id}</div>
                      <div className="font-dm text-xs text-[#111111] mb-2">{a.descricao}</div>
                      <span className={`font-mono text-xs px-1.5 py-0.5 ${PRIO_STYLE[a.prioridade]}`}>{a.prioridade}</span>
                    </div>
                  ))}
                  {colActs.length === 0 && <div className="border border-dashed border-[#E0E0E0] p-4 text-center text-gray-400 font-dm text-xs">Vazio</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
