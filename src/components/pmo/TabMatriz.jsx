import { startTransition, useEffect, useMemo, useState } from 'react';
import { getStorage, setStorage, KEYS } from '../../utils/storage';
import { AlertTriangle, Columns, List, Plus, Trash2 } from 'lucide-react';
import { getPmoDeadlineMeta } from '../../utils/meetingPendencies';

const AREAS = ['TI', 'Jurídico', 'DPO', 'Comunicação', 'RH', 'Diretoria', 'Segurança', 'Compliance'];
const STATUS_OPTS = ['Aberto', 'Em andamento', 'Bloqueado', 'Feito'];
const PRIORIDADE_OPTS = ['Crítica', 'Alta', 'Média', 'Baixa'];
const STATUS_STYLE = {
  Aberto: 'border-[rgba(21,38,43,0.08)] bg-white/70 text-[var(--ink-soft)]',
  'Em andamento': 'border-amber-200 bg-amber-50 text-amber-700',
  Bloqueado: 'border-red-200 bg-red-50 text-red-700',
  Feito: 'border-green-200 bg-green-50 text-green-700',
};
const PRIO_STYLE = {
  Crítica: 'bg-red-100 text-red-700',
  Alta: 'bg-orange-100 text-orange-700',
  Média: 'bg-amber-100 text-amber-700',
  Baixa: 'bg-white/70 text-gray-600',
};

const EMPTY_FORM = { descricao: '', responsavel: '', area: 'TI', status: 'Aberto', prazo: '', prioridade: 'Alta', observacoes: '' };

function nextId(actions) {
  const nums = actions.map((item) => parseInt(item.id?.replace('#', '') || 0, 10)).filter(Boolean);
  return `#${String(Math.max(0, ...nums) + 1).padStart(3, '0')}`;
}

function formatDeadline(value) {
  if (!value) return '—';
  const normalized = String(value).slice(0, 10);
  const [year, month, day] = normalized.split('-');
  if (!year || !month || !day) return String(value).replace('T', ' ');
  return `${day}/${month}/${year}`;
}

function SummaryCard({ label, value, helper, tone = 'neutral' }) {
  const toneClass = {
    neutral: 'border-[rgba(21,38,43,0.08)] bg-white/80',
    warning: 'border-amber-200 bg-amber-50',
    danger: 'border-red-200 bg-red-50',
    success: 'border-green-200 bg-green-50',
  }[tone];
  return (
    <div className={`rounded-[24px] border p-4 shadow-[0_12px_24px_rgba(21,38,43,0.04)] ${toneClass}`}>
      <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--ink-soft)]">{label}</div>
      <div className="mt-3 font-syne text-3xl font-bold text-[var(--ink)]">{value}</div>
      <p className="mt-2 text-sm leading-6 text-[var(--ink-soft)]">{helper}</p>
    </div>
  );
}

export default function TabMatriz({ effectiveClientId }) {
  const [actions, setActions] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [filterStatus, setFilterStatus] = useState('Todos');
  const [filterArea, setFilterArea] = useState('Todos');
  const [filterPrio, setFilterPrio] = useState('Todos');
  const [view, setView] = useState('table');
  const [draggingId, setDraggingId] = useState(null);
  const [dragOverStatus, setDragOverStatus] = useState(null);

  useEffect(() => {
    const pmoData = getStorage(KEYS.pmo(effectiveClientId), {});
    startTransition(() => {
      setActions(pmoData.actions || []);
    });
  }, [effectiveClientId]);

  const saveActions = (nextActions) => {
    const pmoData = getStorage(KEYS.pmo(effectiveClientId), {});
    setStorage(KEYS.pmo(effectiveClientId), { ...pmoData, actions: nextActions });
    setActions(nextActions);
  };

  const addAction = () => {
    if (!form.descricao.trim()) return;
    const newAction = { id: nextId(actions), ...form };
    saveActions([...actions, newAction]);
    setForm(EMPTY_FORM);
    setShowForm(false);
  };

  const updateStatus = (id, status) => saveActions(actions.map((item) => (item.id === id ? { ...item, status } : item)));
  const deleteAction = (id) => saveActions(actions.filter((item) => item.id !== id));

  const handleKanbanDragStart = (event, id) => {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', String(id));
    setDraggingId(id);
  };

  const handleKanbanDrop = (status) => {
    if (!draggingId) return;
    const action = actions.find((item) => item.id === draggingId);
    if (!action || action.status === status) {
      setDraggingId(null);
      setDragOverStatus(null);
      return;
    }
    updateStatus(draggingId, status);
    setDraggingId(null);
    setDragOverStatus(null);
  };

  const now = new Date();
  const filtered = actions.filter((item) => {
    if (filterStatus !== 'Todos' && item.status !== filterStatus) return false;
    if (filterArea !== 'Todos' && item.area !== filterArea) return false;
    if (filterPrio !== 'Todos' && item.prioridade !== filterPrio) return false;
    return true;
  });

  const summary = useMemo(() => {
    const currentDate = new Date();
    return {
      open: actions.filter((item) => item.status === 'Aberto').length,
      inProgress: actions.filter((item) => item.status === 'Em andamento').length,
      blocked: actions.filter((item) => item.status === 'Bloqueado').length,
      overdue: actions.filter((item) => item.prazo && new Date(item.prazo) < currentDate && item.status !== 'Feito').length,
    };
  }, [actions]);

  const inputClass = 'w-full rounded-[20px] border border-[rgba(21,38,43,0.08)] bg-white px-4 py-3 text-sm text-[var(--ink)] focus:border-[rgba(21,38,43,0.18)] focus:outline-none';

  return (
    <div className="space-y-6">
      <section className="grid gap-6 2xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.95fr)]">
        <div className="app-panel-dark rounded-[32px] p-6 shadow-[0_22px_44px_rgba(21,38,43,0.12)]">
          <div className="font-mono text-[11px] uppercase tracking-[0.28em] text-[var(--accent)]">Execução operacional</div>
          <h2 className="mt-3 font-syne text-3xl font-bold text-white md:text-4xl">Matriz de ações do incidente</h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-[#d7e0e3]">
            Acompanhe o que precisa ser feito, quem puxa cada frente e onde estão os gargalos de execução da resposta.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-1">
          <SummaryCard label="Abertas" value={summary.open} helper="Entradas ainda sem avanço operacional." />
          <SummaryCard label="Em andamento" value={summary.inProgress} helper="Itens ativos na rotina do caso." tone={summary.inProgress > 0 ? 'warning' : 'neutral'} />
          <SummaryCard label="Bloqueadas" value={summary.blocked} helper="Dependem de decisão, fornecedor ou destravamento." tone={summary.blocked > 0 ? 'danger' : 'neutral'} />
          <SummaryCard label="Vencidas" value={summary.overdue} helper="Prazos ultrapassados que precisam de reação imediata." tone={summary.overdue > 0 ? 'danger' : 'neutral'} />
        </div>
      </section>

      {summary.blocked > 0 && (
        <div className="rounded-[24px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <div className="flex items-center gap-2"><AlertTriangle size={14} /> {summary.blocked} ação(ões) bloqueada(s) exigem destravamento.</div>
        </div>
      )}

      <section className="app-panel rounded-[30px] p-5 shadow-[0_18px_36px_rgba(21,38,43,0.06)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--ink-soft)]">Console</div>
            <h3 className="mt-2 font-syne text-2xl font-bold text-[var(--ink)]">Visualização e filtros</h3>
          </div>
          <button onClick={() => setShowForm((current) => !current)} className="btn-primary inline-flex items-center gap-2 px-4 py-2 text-[11px] uppercase tracking-[0.18em]">
            Nova ação <Plus size={13} />
          </button>
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <div className="inline-flex rounded-full border border-[rgba(21,38,43,0.08)] bg-white p-1">
            <button onClick={() => setView('table')} className={`inline-flex items-center gap-2 rounded-full px-4 py-2 font-mono text-[11px] uppercase tracking-[0.18em] ${view === 'table' ? 'bg-[#173038] text-white' : 'text-[var(--ink)]'}`}><List size={13} /> Tabela</button>
            <button onClick={() => setView('kanban')} className={`inline-flex items-center gap-2 rounded-full px-4 py-2 font-mono text-[11px] uppercase tracking-[0.18em] ${view === 'kanban' ? 'bg-[#173038] text-white' : 'text-[var(--ink)]'}`}><Columns size={13} /> Kanban</button>
          </div>
          <select value={filterStatus} onChange={(event) => setFilterStatus(event.target.value)} className="rounded-full border border-[rgba(21,38,43,0.08)] bg-white px-4 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--ink)] focus:outline-none">
            <option>Todos</option>
            {STATUS_OPTS.map((status) => <option key={status}>{status}</option>)}
          </select>
          <select value={filterArea} onChange={(event) => setFilterArea(event.target.value)} className="rounded-full border border-[rgba(21,38,43,0.08)] bg-white px-4 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--ink)] focus:outline-none">
            <option>Todos</option>
            {AREAS.map((area) => <option key={area}>{area}</option>)}
          </select>
          <select value={filterPrio} onChange={(event) => setFilterPrio(event.target.value)} className="rounded-full border border-[rgba(21,38,43,0.08)] bg-white px-4 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--ink)] focus:outline-none">
            <option>Todos</option>
            {PRIORIDADE_OPTS.map((prio) => <option key={prio}>{prio}</option>)}
          </select>
        </div>

        {showForm && (
          <div className="mt-5 rounded-[28px] border border-[rgba(21,38,43,0.08)] bg-white/78 p-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-2 block font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--ink-soft)]">Descrição</label>
                <input type="text" value={form.descricao} onChange={(event) => setForm((current) => ({ ...current, descricao: event.target.value }))} className={inputClass} placeholder="Descreva a ação a ser acompanhada" />
              </div>
              <div>
                <label className="mb-2 block font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--ink-soft)]">Responsável</label>
                <input type="text" value={form.responsavel} onChange={(event) => setForm((current) => ({ ...current, responsavel: event.target.value }))} className={inputClass} />
              </div>
              <div>
                <label className="mb-2 block font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--ink-soft)]">Área</label>
                <select value={form.area} onChange={(event) => setForm((current) => ({ ...current, area: event.target.value }))} className={inputClass}>{AREAS.map((area) => <option key={area}>{area}</option>)}</select>
              </div>
              <div>
                <label className="mb-2 block font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--ink-soft)]">Status</label>
                <select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))} className={inputClass}>{STATUS_OPTS.map((status) => <option key={status}>{status}</option>)}</select>
              </div>
              <div>
                <label className="mb-2 block font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--ink-soft)]">Prazo</label>
                <input type="datetime-local" value={form.prazo} onChange={(event) => setForm((current) => ({ ...current, prazo: event.target.value }))} className={inputClass} />
              </div>
              <div>
                <label className="mb-2 block font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--ink-soft)]">Prioridade</label>
                <select value={form.prioridade} onChange={(event) => setForm((current) => ({ ...current, prioridade: event.target.value }))} className={inputClass}>{PRIORIDADE_OPTS.map((prio) => <option key={prio}>{prio}</option>)}</select>
              </div>
              <div className="md:col-span-2">
                <label className="mb-2 block font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--ink-soft)]">Observações ou bloqueios</label>
                <input type="text" value={form.observacoes} onChange={(event) => setForm((current) => ({ ...current, observacoes: event.target.value }))} className={inputClass} />
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <button onClick={() => setShowForm(false)} className="btn-outline px-4 py-2 text-[11px] uppercase tracking-[0.18em]">Cancelar</button>
              <button onClick={addAction} className="btn-primary px-4 py-2 text-[11px] uppercase tracking-[0.18em]">Salvar ação</button>
            </div>
          </div>
        )}
      </section>

      {view === 'table' ? (
        <section className="overflow-hidden rounded-[30px] border border-[rgba(21,38,43,0.08)] bg-white/84 shadow-[0_18px_36px_rgba(21,38,43,0.06)]">
          <div className="overflow-x-auto">
            <table className="min-w-[980px] w-full">
              <thead className="bg-[#173038]">
                <tr>
                  {['ID', 'Origem', 'Descrição', 'Responsável', 'Área', 'Status', 'Prazo', 'Prioridade', 'Ações'].map((header) => (
                    <th key={header} className="px-4 py-3 text-left font-mono text-[11px] uppercase tracking-[0.18em] text-white">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={9} className="px-4 py-10 text-center text-sm text-[var(--ink-soft)]">Nenhuma ação encontrada para os filtros atuais.</td></tr>
                ) : filtered.map((action, index) => {
                  const overdue = action.prazo && new Date(action.prazo) < now && action.status !== 'Feito';
                  const meetingMeta = getPmoDeadlineMeta(action);
                  return (
                    <tr key={action.id} className={`${index % 2 === 0 ? 'bg-white/78' : 'bg-[#f8faf5]'} ${action.status === 'Bloqueado' ? 'border-l-4 border-l-red-500' : ''} ${meetingMeta?.emphasis || ''}`}>
                      <td className="px-4 py-4 font-mono text-[11px] text-[var(--ink-soft)]">{action.id}</td>
                      <td className="px-4 py-4">
                        <span className="rounded-full border border-[rgba(21,38,43,0.08)] bg-white px-3 py-1 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--ink)]">{action.origem || 'PMO'}</span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm font-medium text-[var(--ink)]">{action.descricao}</div>
                        {action.meetingTitle && <div className="mt-1 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--ink-soft)]">Reunião: {action.meetingTitle}</div>}
                        {meetingMeta && <div className={`mt-2 inline-flex rounded-full border px-3 py-1 font-mono text-[11px] uppercase tracking-[0.18em] ${meetingMeta.tone}`}>{meetingMeta.label}</div>}
                        {action.observacoes && <div className="mt-2 text-xs text-[var(--ink-soft)]">{action.observacoes}</div>}
                      </td>
                      <td className="px-4 py-4 text-sm text-[var(--ink)]">{action.responsavel || '—'}</td>
                      <td className="px-4 py-4 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--ink-soft)]">{action.area}</td>
                      <td className="px-4 py-4">
                        <select value={action.status} onChange={(event) => updateStatus(action.id, event.target.value)} className={`rounded-full border px-3 py-1 font-mono text-[11px] uppercase tracking-[0.18em] focus:outline-none ${STATUS_STYLE[action.status]}`}>
                          {STATUS_OPTS.map((status) => <option key={status}>{status}</option>)}
                        </select>
                      </td>
                      <td className={`px-4 py-4 font-mono text-[11px] uppercase tracking-[0.18em] ${overdue ? 'text-red-700' : 'text-[var(--ink-soft)]'}`}>
                        {action.prazo ? formatDeadline(action.prazo) : meetingMeta ? 'Pendente no PMO' : '—'}
                      </td>
                      <td className="px-4 py-4"><span className={`rounded-full px-3 py-1 font-mono text-[11px] uppercase tracking-[0.18em] ${PRIO_STYLE[action.prioridade]}`}>{action.prioridade}</span></td>
                      <td className="px-4 py-4">
                        <button onClick={() => deleteAction(action.id)} className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-red-700 hover:bg-red-100">Excluir <Trash2 size={13} /></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {STATUS_OPTS.map((column) => {
            const columnActions = filtered.filter((item) => item.status === column);
            return (
              <div
                key={column}
                className={`rounded-[28px] border p-3 transition-all ${dragOverStatus === column ? 'border-[rgba(214,255,99,0.6)] bg-[rgba(214,255,99,0.12)]' : 'border-[rgba(21,38,43,0.08)] bg-white/82'}`}
                onDragOver={(event) => event.preventDefault()}
                onDragEnter={() => setDragOverStatus(column)}
                onDragLeave={() => dragOverStatus === column && setDragOverStatus(null)}
                onDrop={() => handleKanbanDrop(column)}
              >
                <div className={`mb-3 flex items-center justify-between rounded-[22px] border px-3 py-3 font-mono text-[11px] uppercase tracking-[0.18em] ${STATUS_STYLE[column]}`}>
                  <span>{column}</span>
                  <span>{columnActions.length}</span>
                </div>
                <div className="space-y-3">
                  {columnActions.length === 0 ? (
                    <div className="rounded-[22px] border border-dashed border-[rgba(21,38,43,0.12)] p-6 text-center text-xs text-[var(--ink-soft)]">Nenhum item</div>
                  ) : columnActions.map((action) => {
                    const meetingMeta = getPmoDeadlineMeta(action);
                    return (
                      <article
                        key={action.id}
                        draggable
                        onDragStart={(event) => handleKanbanDragStart(event, action.id)}
                        onDragEnd={() => { setDraggingId(null); setDragOverStatus(null); }}
                        className={`cursor-grab rounded-[24px] border bg-white p-4 shadow-[0_12px_24px_rgba(21,38,43,0.04)] transition-all active:cursor-grabbing ${draggingId === action.id ? 'scale-[0.985] opacity-45' : ''} ${action.status === 'Bloqueado' ? 'border-red-300' : 'border-[rgba(21,38,43,0.08)]'} ${meetingMeta?.emphasis || ''}`}
                      >
                        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--ink-soft)]">{action.id}</div>
                        <h3 className="mt-3 text-sm font-semibold leading-6 text-[var(--ink)]">{action.descricao}</h3>
                        {action.meetingTitle && <div className="mt-2 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--ink-soft)]">Reunião · {action.meetingTitle}</div>}
                        {meetingMeta && <div className={`mt-3 inline-flex rounded-full border px-3 py-1 font-mono text-[11px] uppercase tracking-[0.18em] ${meetingMeta.tone}`}>{meetingMeta.label}</div>}
                        {action.prazo && <div className="mt-3 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--ink-soft)]">Prazo: {formatDeadline(action.prazo)}</div>}
                        <div className="mt-3 flex items-center justify-between gap-3">
                          <span className={`rounded-full px-3 py-1 font-mono text-[11px] uppercase tracking-[0.18em] ${PRIO_STYLE[action.prioridade]}`}>{action.prioridade}</span>
                          <span className="text-xs text-[var(--ink-soft)]">{action.responsavel || 'Sem responsável'}</span>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </section>
      )}
    </div>
  );
}
