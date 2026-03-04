import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import { getStorage, setStorage, KEYS } from '../utils/storage';
import { DEFAULT_ACTIVITIES } from '../data/activities';
import { useSLATimer, getSLAStatus, calcSLAHours, formatSLALabel } from '../hooks/useSLA';
import { businessDaysRemaining, formatCountdown } from '../utils/businessDays';
import {
  Clock, AlertTriangle, Scale, ChevronDown, X, Save,
  Columns, List, Zap, Shield, Filter, ExternalLink, MessageSquare, GitBranch
} from 'lucide-react';

const STATUSES = ['Planejado', 'Em andamento', 'Feito', 'Não se aplica'];

const TABLE_COLUMNS = [
  { h: '#',                   key: 'id',          type: 'text' },
  { h: 'ATIVIDADE',           key: 'nome',        type: 'text' },
  { h: 'STATUS',              key: 'status',      type: 'select', options: ['Planejado', 'Em andamento', 'Feito', 'Não se aplica'] },
  { h: 'SLA',                 key: null,          type: null },
  { h: 'ETAPA',               key: 'etapa',       type: 'select', options: ['Etapa 1', 'Etapa 2', 'Etapa 3'] },
  { h: 'RESPONSÁVEL',         key: 'responsavel', type: 'text' },
  { h: 'DATA INÍCIO',         key: 'dataInicio',  type: 'date' },
  { h: 'DATA FIM',            key: 'dataFim',     type: 'date' },
  { h: 'OBSERVAÇÕES CLIENTE', key: 'observacoes', type: 'text' },
  { h: 'FUNDAMENTO',          key: 'fundamento',  type: 'text' },
];

const STATUS_STYLE = {
  'Feito': { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', dot: 'bg-green-500' },
  'Em andamento': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' },
  'Planejado': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500' },
  'Não se aplica': { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200', dot: 'bg-gray-400' },
};

const STATUS_LEFT = {
  'Feito': 'border-l-4 border-l-green-500',
  'Em andamento': 'border-l-4 border-l-amber-500',
  'Planejado': 'border-l-4 border-l-blue-500',
  'Não se aplica': 'border-l-4 border-l-gray-400',
};

// Activities that involve communications (INT-9)
const COMM_ACTIVITY_IDS = [17, 18, 19, 20, 21];

function nextPMOId(actions) {
  const nums = actions.map(a => parseInt(a.id?.replace('#', '') || 0)).filter(Boolean);
  return `#${String(Math.max(0, ...nums) + 1).padStart(3, '0')}`;
}

function SLABadge({ dataConhecimento, slaConfig, crisis }) {
  const { hours, status, label } = useSLATimer(
    dataConhecimento,
    slaConfig?.warnThreshold || 36,
    slaConfig?.critThreshold || 48
  );
  if (!dataConhecimento) return <span className="text-gray-400 font-mono text-xs">—</span>;
  if (crisis) return <span className="font-mono text-xs text-amber-600">⏸ Pausado em {label}</span>;
  if (status === 'critical') return (
    <span className="font-mono text-xs text-white bg-red-600 px-2 py-0.5 animate-pulse-red flex items-center gap-1">
      <AlertTriangle size={10} /> Crítico · {label}
    </span>
  );
  if (status === 'warning') return (
    <span className="font-mono text-xs text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 animate-pulse-amber flex items-center gap-1">
      <Clock size={10} /> Aviso · {label}
    </span>
  );
  return (
    <span className="font-mono text-xs text-gray-600 bg-gray-50 border border-gray-200 px-2 py-0.5 flex items-center gap-1">
      <Clock size={10} /> No Prazo · {label}
    </span>
  );
}

function StatusDropdown({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const s = STATUS_STYLE[value] || STATUS_STYLE['Planejado'];

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 font-mono text-xs px-2.5 py-1 border ${s.bg} ${s.text} ${s.border} cursor-pointer`}
      >
        {value}
        <ChevronDown size={10} />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-[#E0E0E0] shadow-lg z-20 min-w-[140px]">
          {STATUSES.map(st => {
            const ss = STATUS_STYLE[st];
            return (
              <button
                key={st}
                onClick={() => { onChange(st); setOpen(false); }}
                className={`w-full text-left flex items-center gap-2 px-3 py-2 font-mono text-xs hover:bg-gray-50 transition-colors ${value === st ? 'font-bold' : ''}`}
              >
                <span className={`w-2 h-2 rounded-full ${ss.dot}`} />
                {st}
                {value === st && <span className="ml-auto text-[#111111]">✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// INT-3: Modal to create PMO action from a Jornada activity
function CreatePMOActionModal({ activity, effectiveClientId, onClose, onCreated }) {
  const AREAS = ['TI', 'Jurídico', 'DPO', 'Comunicação', 'RH', 'Diretoria', 'Segurança', 'Compliance'];
  const [form, setForm] = useState({
    descricao: activity.nome,
    responsavel: activity.responsavel || '',
    area: 'TI',
    status: activity.status === 'Feito' ? 'Feito' : activity.status === 'Em andamento' ? 'Em andamento' : 'Aberto',
    prazo: activity.dataFim ? `${activity.dataFim}T00:00` : '',
    prioridade: 'Alta',
    observacoes: '',
  });

  const handleCreate = () => {
    const pmoData = getStorage(KEYS.pmo(effectiveClientId), {});
    const actions = pmoData.actions || [];
    const newAction = {
      id: nextPMOId(actions),
      ...form,
      origem: 'Jornada',
      jornadaId: activity.id,
    };
    setStorage(KEYS.pmo(effectiveClientId), { ...pmoData, actions: [...actions, newAction] });
    onCreated(newAction.id);
    onClose();
  };

  const inputClass = "w-full border border-[#E0E0E0] px-3 py-2 font-dm text-sm focus:outline-none focus:border-[#111111]";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div className="bg-white border border-[#E0E0E0] w-full max-w-md shadow-2xl">
        <div className="bg-[#111111] px-5 py-3 flex items-center justify-between">
          <div>
            <div className="text-[#CAFF00] font-mono text-xs">CRIAR AÇÃO NO PMO</div>
            <div className="text-white font-dm text-sm">#{activity.id} — {activity.etapa}</div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1"><X size={16} /></button>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <label className="block font-mono text-xs uppercase text-[#555555] mb-1">Descrição</label>
            <input type="text" value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} className={inputClass} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-mono text-xs uppercase text-[#555555] mb-1">Responsável</label>
              <input type="text" value={form.responsavel} onChange={e => setForm(f => ({ ...f, responsavel: e.target.value }))} className={inputClass} />
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
                {['Aberto', 'Em andamento', 'Bloqueado', 'Feito'].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block font-mono text-xs uppercase text-[#555555] mb-1">Prioridade</label>
              <select value={form.prioridade} onChange={e => setForm(f => ({ ...f, prioridade: e.target.value }))} className={inputClass}>
                {['Crítica', 'Alta', 'Média', 'Baixa'].map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block font-mono text-xs uppercase text-[#555555] mb-1">Prazo</label>
            <input type="datetime-local" value={form.prazo} onChange={e => setForm(f => ({ ...f, prazo: e.target.value }))} className={inputClass} />
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 border border-[#E0E0E0] text-[#111111] font-dm text-sm py-2.5 hover:bg-gray-50">Cancelar</button>
            <button onClick={handleCreate} className="flex-1 bg-[#111111] text-white font-dm text-sm py-2.5 hover:bg-[#333] flex items-center justify-center gap-2">
              <ExternalLink size={13} /> Criar no PMO
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SlideOver({ activity, onClose, onSave, isAdmin, dataConhecimento, crisis, onWarroom, effectiveClientId, comms, pmoActions }) {
  const [form, setForm] = useState({ ...activity });
  const [showPMOModal, setShowPMOModal] = useState(false);
  const [pmoActionCreated, setPMOActionCreated] = useState(null);

  if (!activity) return null;

  const handleSave = () => { onSave(form); onClose(); };

  const inputClass = "w-full border border-[#E0E0E0] px-3 py-2 font-dm text-sm focus:outline-none focus:border-[#111111] transition-colors";
  const disabledClass = "w-full border border-[#E0E0E0] px-3 py-2 font-dm text-sm bg-gray-50 text-gray-500 cursor-not-allowed";

  // INT-9: comms linked to this activity
  const linkedComms = (comms || []).filter(c => c.actividadeId === activity.id);

  // INT-3: check if linked PMO action exists and is blocked
  const linkedPMOAction = (pmoActions || []).find(a => a.jornadaId === activity.id);

  return (
    <>
      <div className="fixed inset-0 z-40 flex">
        <div className="flex-1 bg-black/40" onClick={onClose} />
        <div className="w-full max-w-md bg-white flex flex-col shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-[#111111] px-5 py-4 flex items-center justify-between shrink-0">
            <div className="flex-1 min-w-0">
              <div className="font-mono text-[#CAFF00] text-xs">#{activity.id} · {activity.etapa}</div>
              <div className="text-white font-dm text-sm font-medium mt-0.5 line-clamp-2">{activity.nome}</div>
            </div>
            <div className="flex items-center gap-2 ml-3 shrink-0">
              <button
                onClick={onWarroom}
                className={`flex items-center gap-1.5 text-xs font-mono px-3 py-1.5 transition-colors ${
                  crisis ? 'bg-red-600 text-white animate-pulse-red' : 'bg-red-700 text-white hover:bg-red-600'
                }`}
              >
                {crisis ? <Zap size={11} /> : <Shield size={11} />}
                {crisis ? '⚡ WARROOM ATIVA' : '🚨 WarRoom'}
              </button>
              <button onClick={onClose} className="text-gray-400 hover:text-white p-1">
                <X size={18} />
              </button>
            </div>
          </div>

          {/* INT-3: Create PMO Action button */}
          <div className="border-b border-[#E0E0E0] px-5 py-2.5 flex items-center justify-between bg-gray-50">
            {linkedPMOAction ? (
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5">
                  ↗ Ação PMO {linkedPMOAction.id} vinculada
                </span>
                {linkedPMOAction.status === 'Bloqueado' && (
                  <span className="font-mono text-xs text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 flex items-center gap-1">
                    <AlertTriangle size={10} /> Bloqueada
                  </span>
                )}
              </div>
            ) : (
              pmoActionCreated ? (
                <span className="font-mono text-xs text-green-700">✓ Ação {pmoActionCreated} criada no PMO</span>
              ) : (
                <button
                  onClick={() => setShowPMOModal(true)}
                  className="flex items-center gap-1.5 font-mono text-xs text-[#111111] border border-[#E0E0E0] px-3 py-1.5 hover:bg-white hover:border-[#111111] transition-colors"
                >
                  <ExternalLink size={11} /> Criar Ação no PMO ↗
                </button>
              )
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {/* Status */}
            <div>
              <label className="block font-mono text-xs uppercase text-[#555555] mb-1.5">Status</label>
              <StatusDropdown value={form.status} onChange={v => setForm(f => ({ ...f, status: v }))} />
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-mono text-xs uppercase text-[#555555] mb-1.5">Data Início</label>
                <input type="date" value={form.dataInicio || ''} onChange={e => setForm(f => ({ ...f, dataInicio: e.target.value }))} className={inputClass} />
              </div>
              <div>
                <label className="block font-mono text-xs uppercase text-[#555555] mb-1.5">Data Fim</label>
                <input type="date" value={form.dataFim || ''} onChange={e => setForm(f => ({ ...f, dataFim: e.target.value }))} className={inputClass} />
              </div>
            </div>

            {/* Responsável & Revisão */}
            <div>
              <label className="block font-mono text-xs uppercase text-[#555555] mb-1.5">Responsável</label>
              <input type="text" value={form.responsavel || ''} onChange={e => setForm(f => ({ ...f, responsavel: e.target.value }))} className={inputClass} placeholder="Nome do responsável" />
            </div>
            <div>
              <label className="block font-mono text-xs uppercase text-[#555555] mb-1.5">Revisão</label>
              <input type="text" value={form.revisao || ''} onChange={e => setForm(f => ({ ...f, revisao: e.target.value }))} className={inputClass} placeholder="Revisado por" />
            </div>

            {/* Obs Cliente */}
            <div>
              <label className="block font-mono text-xs uppercase text-[#555555] mb-1.5">Observações Cliente</label>
              <textarea value={form.observacoes || ''} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} rows={3} className={`${inputClass} resize-none`} placeholder="Notas do cliente..." />
            </div>

            {/* Obs Opice — admin only */}
            <div>
              <label className="block font-mono text-xs uppercase text-[#555555] mb-1.5">
                Observações Opice
                {!isAdmin && <span className="ml-2 text-gray-400">(Apenas uso interno)</span>}
              </label>
              {isAdmin ? (
                <textarea value={form.observacoesOpice || ''} onChange={e => setForm(f => ({ ...f, observacoesOpice: e.target.value }))} rows={3} className={`${inputClass} resize-none`} placeholder="Notas internas Opice Blum..." />
              ) : (
                <textarea value={form.observacoesOpice || ''} disabled rows={3} className={`${disabledClass} resize-none`} title="Apenas uso interno Opice Blum" />
              )}
            </div>

            {/* Fundamento Legal */}
            <div className="bg-gray-50 border border-[#E0E0E0] p-3">
              <div className="font-mono text-xs text-[#555555] uppercase mb-1">Fundamento Legal</div>
              <p className="font-dm text-xs text-[#333]">{activity.fundamento}</p>
              {activity.observacoes && (
                <p className="font-dm text-xs text-[#555555] mt-1 italic">{activity.observacoes}</p>
              )}
            </div>

            {/* ANPD link for regulatory activities */}
            {[13, 14, 15, 16, 23, 24].includes(activity.id) && (
              <button
                onClick={() => window.location.href = '/anpd'}
                className="w-full flex items-center gap-2 border border-[#E0E0E0] px-4 py-2.5 font-mono text-xs text-blue-700 hover:bg-blue-50 transition-colors"
              >
                <Scale size={13} /> Ver no ANPD → (Atividade vinculada ao processo regulatório)
              </button>
            )}

            {/* ANPD vinculado */}
            {activity.anpdVinculado && dataConhecimento && (
              <div className="border border-amber-200 bg-amber-50 p-3">
                <div className="flex items-center gap-2 mb-1.5">
                  <Scale size={13} className="text-amber-600" />
                  <span className="font-mono text-xs text-amber-700 uppercase">Prazo Regulatório ANPD</span>
                </div>
                <div className="font-mono text-sm text-amber-800">
                  {formatCountdown(businessDaysRemaining(new Date(dataConhecimento), 3).diffHours)}
                </div>
                <p className="text-amber-700 font-dm text-xs mt-1">3 dias úteis do conhecimento do incidente</p>
              </div>
            )}

            {/* INT-9: Linked communications */}
            {COMM_ACTIVITY_IDS.includes(activity.id) && (
              <div className="border border-[#E0E0E0]">
                <div className="bg-[#111111] px-3 py-2 flex items-center gap-2">
                  <MessageSquare size={12} className="text-[#CAFF00]" />
                  <span className="font-mono text-xs text-white uppercase">Comunicações Registradas</span>
                  <span className="font-mono text-xs text-[#CAFF00] ml-auto">{linkedComms.length}</span>
                </div>
                {linkedComms.length === 0 ? (
                  <div className="p-3 text-center text-gray-400 font-dm text-xs">Nenhuma comunicação vinculada</div>
                ) : (
                  <div className="divide-y divide-[#F0F0F0]">
                    {linkedComms.map(c => (
                      <div key={c.id} className="p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`font-mono text-xs px-1.5 py-0.5 border ${
                            c.statusAprovacao === 'Enviado' ? 'bg-green-50 text-green-700 border-green-200' :
                            c.statusAprovacao === 'Aprovado' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                            'bg-gray-100 text-gray-600 border-gray-200'
                          }`}>{c.statusAprovacao}</span>
                          <span className="font-mono text-xs text-[#555555]">{c.publico} · {c.canal}</span>
                        </div>
                        <p className="font-dm text-xs text-[#111111] line-clamp-2">{c.mensagem}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-[#E0E0E0] p-4 flex gap-3 shrink-0">
            <button
              onClick={onClose}
              className="flex-1 border border-[#E0E0E0] text-[#111111] font-dm text-sm py-2.5 hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              className="flex-1 bg-[#111111] text-white font-dm text-sm py-2.5 hover:bg-[#333] transition-colors flex items-center justify-center gap-2"
            >
              <Save size={14} />
              Salvar
            </button>
          </div>
        </div>
      </div>

      {/* INT-3: Create PMO Action Modal */}
      {showPMOModal && (
        <CreatePMOActionModal
          activity={activity}
          effectiveClientId={effectiveClientId}
          onClose={() => setShowPMOModal(false)}
          onCreated={(id) => { setPMOActionCreated(id); setShowPMOModal(false); }}
        />
      )}
    </>
  );
}

function KanbanCard({ activity, onClick, dataConhecimento, slaConfig, crisis }) {
  const { status, label: slaLabel } = useSLATimer(
    dataConhecimento,
    slaConfig?.warnThreshold || 36,
    slaConfig?.critThreshold || 48
  );
  const isCritical = status === 'critical';
  const isWarning = status === 'warning';

  return (
    <div
      onClick={() => onClick(activity)}
      className={`bg-white p-3 cursor-pointer hover:shadow-md transition-shadow ${
        isCritical ? 'border-2 border-red-500 bg-red-50' : isWarning ? 'border-l-4 border-l-amber-500 border border-amber-100' : 'border border-[#E0E0E0]'
      }`}
    >
      {crisis && (
        <div className="font-mono text-xs text-red-600 mb-1 flex items-center gap-1">
          <Zap size={9} /> CRISE
        </div>
      )}
      <div className="font-dm text-xs text-[#111111] line-clamp-2 mb-2">{activity.nome}</div>
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs text-[#555555]">{activity.etapa}</span>
        <span className={`font-mono text-xs flex items-center gap-1 ${
          isCritical ? 'text-red-600' : isWarning ? 'text-amber-600' : 'text-gray-500'
        }`}>
          <Clock size={9} />
          {dataConhecimento ? slaLabel : '—'}
        </span>
      </div>
    </div>
  );
}

export default function Jornada({ clientId: propClientId, isAdmin = false, adminClientName, onAdminBack, defaultView = 'table' }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const effectiveClientId = propClientId || user?.clientId;
  const effectiveIsAdmin = isAdmin || user?.role === 'admin';

  const [activities, setActivities] = useState([]);
  const [info, setInfo] = useState({});
  const [slaConfig, setSlaConfig] = useState({});
  const [crisis, setCrisis] = useState(null);
  const [view, setView] = useState(defaultView);
  const [colFilters, setColFilters] = useState({});
  const [activeFilterCol, setActiveFilterCol] = useState(null);
  const [selected, setSelected] = useState(null);
  const [flashRow, setFlashRow] = useState(null);
  const [pmoActions, setPmoActions] = useState([]);
  const [comms, setComms] = useState([]);

  useEffect(() => {
    const stored = getStorage(KEYS.activities(effectiveClientId));
    if (!stored) {
      setStorage(KEYS.activities(effectiveClientId), DEFAULT_ACTIVITIES);
      setActivities(DEFAULT_ACTIVITIES);
    } else {
      setActivities(stored);
    }
    setInfo(getStorage(KEYS.info(effectiveClientId), {}));
    setSlaConfig(getStorage(KEYS.slaConfig(effectiveClientId), {}));
    const c = getStorage(KEYS.crisis(effectiveClientId, 'active'));
    setCrisis(c?.crisisActive === true && c?.crisisStatus !== 'closed' ? c : null);

    // Load PMO actions and comms (INT-3, INT-9)
    const pmoData = getStorage(KEYS.pmo(effectiveClientId), {});
    setPmoActions(pmoData.actions || []);
    setComms(pmoData.commsLog || []);
  }, [effectiveClientId]);

  const updateStatus = (id, newStatus) => {
    const updated = activities.map(a => a.id === id ? { ...a, status: newStatus } : a);
    setActivities(updated);
    setStorage(KEYS.activities(effectiveClientId), updated);
    setFlashRow(id);
    setTimeout(() => setFlashRow(null), 600);
  };

  const saveActivity = (updated) => {
    const newActs = activities.map(a => a.id === updated.id ? updated : a);
    setActivities(newActs);
    setStorage(KEYS.activities(effectiveClientId), newActs);
  };

  const filtered = activities.filter(a => {
    for (const col of TABLE_COLUMNS) {
      if (!col.key || !col.type) continue;
      const val = colFilters[col.key];
      if (!val) continue;
      const field = String(a[col.key] || '').toLowerCase();
      if (col.type === 'select') {
        if (field !== val.toLowerCase()) return false;
      } else if (col.type === 'date') {
        if (a[col.key] !== val) return false;
      } else {
        if (!field.includes(val.toLowerCase())) return false;
      }
    }
    return true;
  });

  useEffect(() => {
    const handler = () => setActiveFilterCol(null);
    if (activeFilterCol) document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [activeFilterCol]);

  const total = activities.length;
  const done = activities.filter(a => a.status === 'Feito').length;
  const pct = total ? Math.round(done / total * 100) : 0;

  const slaHours = calcSLAHours(info.dataConhecimento || new Date().toISOString());
  const globalSlaStatus = getSLAStatus(slaHours, slaConfig?.warnThreshold || 36, slaConfig?.critThreshold || 48);

  const handleWarroom = () => {
    navigate(isAdmin ? `/admin/cliente/${effectiveClientId}/pmo/warroom` : '/pmo/warroom');
    setSelected(null);
  };

  const KANBAN_COLS = ['Planejado', 'Em andamento', 'Feito', 'Não se aplica'];

  // Prazos críticos para barra
  const anpdDeadline = info.dataConhecimento ? businessDaysRemaining(new Date(info.dataConhecimento), 3) : null;
  const criticalDeadlines = [
    anpdDeadline && { label: 'Comunicação ANPD', hours: anpdDeadline.diffHours, overdue: anpdDeadline.overdue },
  ].filter(Boolean);
  const showDeadlineBar = criticalDeadlines.some(d => d.overdue || d.hours < 24);
  const [deadlineBarOpen, setDeadlineBarOpen] = useState(true);

  return (
    <Layout clientId={propClientId} isAdmin={isAdmin} adminClientName={adminClientName} onAdminBack={onAdminBack}>
      <div className="p-6 md:p-10">

        {/* Barra de prazos críticos */}
        {showDeadlineBar && deadlineBarOpen && (
          <div className="mb-4 border border-red-300 bg-red-50">
            <div className="flex items-center justify-between px-4 py-2 bg-red-600">
              <span className="font-mono text-xs text-white font-bold uppercase tracking-widest">⚖ Prazos Regulatórios Ativos</span>
              <button onClick={() => setDeadlineBarOpen(false)} className="text-red-200 hover:text-white font-mono text-xs">Recolher ↑</button>
            </div>
            <div className="divide-y divide-red-100">
              {criticalDeadlines.map((d, i) => (
                <div key={i} className="flex items-center gap-4 px-4 py-2.5">
                  <span className="font-mono text-xs text-red-800 flex-1">{d.label}</span>
                  <span className={`font-mono text-xs px-2 py-0.5 font-bold ${d.overdue ? 'bg-red-600 text-white' : 'bg-red-100 text-red-700'}`}>
                    {d.overdue ? 'VENCIDO' : `Vence em ${formatSLALabel(d.hours)}`}
                  </span>
                  <span className={`font-mono text-xs px-2 py-0.5 ${d.overdue ? 'bg-red-700 text-white' : 'bg-amber-100 text-amber-700'}`}>
                    {d.overdue ? '⛔ VENCIDO' : '🔴 CRÍTICO'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Header */}
        <div className="mb-6">
          <h1 className="font-syne font-extrabold text-[#111111] text-4xl uppercase mb-4">
            Jornada do Incidente
          </h1>

          {/* Overall progress */}
          <div className="flex items-center gap-4 mb-4">
            <div className="flex-1">
              <div className="flex justify-between mb-1.5">
                <span className="font-dm text-sm text-[#555555]">{done} de {total} atividades concluídas</span>
                <span className="font-mono text-sm font-medium text-[#111111]">{pct}% Feito</span>
              </div>
              <div className="w-full h-2 bg-[#E5E5E5]">
                <div className="h-2 bg-[#CAFF00] transition-all duration-700" style={{ width: `${pct}%` }} />
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap items-center gap-3">
            {/* View toggle */}
            <div className="flex border border-[#E0E0E0]">
              <button
                onClick={() => setView('table')}
                className={`flex items-center gap-1.5 px-3 py-2 font-mono text-xs transition-colors ${view === 'table' ? 'bg-[#111111] text-white' : 'bg-white text-[#555555] hover:bg-gray-50'}`}
              >
                <List size={13} /> Tabela
              </button>
              <button
                onClick={() => setView('kanban')}
                className={`flex items-center gap-1.5 px-3 py-2 font-mono text-xs transition-colors ${view === 'kanban' ? 'bg-[#111111] text-white' : 'bg-white text-[#555555] hover:bg-gray-50'}`}
              >
                <Columns size={13} /> Kanban
              </button>
              <button
                onClick={() => setView('timeline')}
                className={`flex items-center gap-1.5 px-3 py-2 font-mono text-xs transition-colors ${view === 'timeline' ? 'bg-[#111111] text-white' : 'bg-white text-[#555555] hover:bg-gray-50'}`}
              >
                <GitBranch size={13} /> Timeline
              </button>
            </div>

            {/* Active filters indicator */}
            {Object.values(colFilters).some(v => v) && (
              <button
                onClick={() => setColFilters({})}
                className="flex items-center gap-1.5 px-3 py-2 font-mono text-xs border border-[#CAFF00] bg-[#CAFF00] text-[#111111] hover:bg-lime-300 transition-colors"
              >
                <Filter size={11} /> Limpar filtros
              </button>
            )}
          </div>
        </div>

        {/* TABLE VIEW */}
        {view === 'table' && (
          <div className="overflow-x-auto border border-[#E0E0E0]">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="bg-[#111111]">
                  {TABLE_COLUMNS.map(col => {
                    const hasFilter = col.type != null;
                    const isActive = !!(col.key && colFilters[col.key]);
                    const isOpen = activeFilterCol === col.key;
                    return (
                      <th key={col.h} className="px-4 py-3 text-left font-mono text-xs text-white uppercase whitespace-nowrap relative">
                        <div className="flex items-center gap-1.5">
                          <span>{col.h}</span>
                          {hasFilter && (
                            <button
                              onClick={e => { e.stopPropagation(); setActiveFilterCol(isOpen ? null : col.key); }}
                              className={`p-0.5 rounded transition-colors ${isActive ? 'text-[#CAFF00]' : 'text-gray-400 hover:text-white'}`}
                              title="Filtrar coluna"
                            >
                              <Filter size={10} />
                            </button>
                          )}
                        </div>
                        {isOpen && hasFilter && (
                          <div
                            className="absolute top-full left-0 z-50 mt-1 bg-white border border-gray-200 rounded shadow-lg p-2 min-w-[160px]"
                            onClick={e => e.stopPropagation()}
                          >
                            {col.type === 'select' ? (
                              <select
                                autoFocus
                                value={colFilters[col.key] || ''}
                                onChange={e => setColFilters(f => ({ ...f, [col.key]: e.target.value }))}
                                className="w-full text-xs font-mono text-[#111111] border border-gray-200 rounded px-2 py-1"
                              >
                                <option value="">Todos</option>
                                {col.options.map(o => <option key={o} value={o}>{o}</option>)}
                              </select>
                            ) : (
                              <input
                                autoFocus
                                type={col.type === 'date' ? 'date' : 'text'}
                                value={colFilters[col.key] || ''}
                                onChange={e => setColFilters(f => ({ ...f, [col.key]: e.target.value }))}
                                placeholder="Filtrar..."
                                className="w-full text-xs font-mono text-[#111111] border border-gray-200 rounded px-2 py-1"
                              />
                            )}
                            {colFilters[col.key] && (
                              <button
                                onClick={() => setColFilters(f => { const n = { ...f }; delete n[col.key]; return n; })}
                                className="mt-1 text-xs text-red-500 hover:text-red-700 w-full text-left"
                              >
                                Limpar filtro
                              </button>
                            )}
                          </div>
                        )}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {filtered.map((a, idx) => {
                  const leftStyle = STATUS_LEFT[a.status] || STATUS_LEFT['Planejado'];
                  const isCritical = info.dataConhecimento && getSLAStatus(slaHours, slaConfig?.warnThreshold || 36, slaConfig?.critThreshold || 48) === 'critical';
                  const isFlash = flashRow === a.id;
                  // INT-3: check blocked PMO action
                  const linkedPMO = pmoActions.find(p => p.jornadaId === a.id);
                  const isPMOBlocked = linkedPMO?.status === 'Bloqueado';
                  // INT-9: comm count for comm activities
                  const commCount = COMM_ACTIVITY_IDS.includes(a.id) ? comms.filter(c => c.actividadeId === a.id).length : 0;
                  return (
                    <tr
                      key={a.id}
                      className={`cursor-pointer hover:bg-[rgba(202,255,0,0.08)] transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-[#F9F9F9]'} ${isCritical ? 'bg-[rgba(220,38,38,0.04)]' : ''} ${isFlash ? 'animate-flash-lime' : ''} ${leftStyle}`}
                      onClick={() => setSelected(a)}
                    >
                      <td className="px-4 py-3 font-mono text-xs text-[#555555] whitespace-nowrap">{a.id}</td>
                      <td className="px-4 py-3 font-dm text-sm text-[#111111] max-w-[200px]">
                        <div className="flex items-center gap-1.5">
                          {crisis && <Zap size={10} className="text-red-500 shrink-0 animate-pulse" />}
                          {a.anpdVinculado && (
                            <Scale size={12} className="text-amber-500 shrink-0" title="Prazo regulatório vinculado — ver SLA & Prazos" />
                          )}
                          {isPMOBlocked && (
                            <AlertTriangle size={12} className="text-red-500 shrink-0" title="Ação bloqueada no PMO" />
                          )}
                          <span className="line-clamp-2">{a.nome}</span>
                          {commCount > 0 && (
                            <span className="flex items-center gap-0.5 ml-1 shrink-0">
                              <MessageSquare size={11} className="text-blue-500" />
                              <span className="font-mono text-[10px] text-blue-600">{commCount}</span>
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <StatusDropdown
                          value={a.status}
                          onChange={v => updateStatus(a.id, v)}
                        />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {crisis ? (
                          <span className="font-mono text-xs text-amber-600">⏸ Pausado</span>
                        ) : (
                          <SLABadge dataConhecimento={info.dataConhecimento} slaConfig={slaConfig} crisis={crisis} />
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-[#555555] whitespace-nowrap">{a.etapa}</td>
                      <td className="px-4 py-3 font-dm text-xs text-[#555555]">{a.responsavel || '—'}</td>
                      <td className="px-4 py-3 font-mono text-xs text-[#555555] whitespace-nowrap">
                        {a.dataInicio ? new Date(a.dataInicio + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-[#555555] whitespace-nowrap">
                        {a.dataFim ? new Date(a.dataFim + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}
                      </td>
                      <td className="px-4 py-3 font-dm text-xs text-[#555555] max-w-[150px]">
                        <span className="line-clamp-2">{a.observacoes || '—'}</span>
                      </td>
                      <td className="px-4 py-3 font-dm text-xs text-[#555555] max-w-[150px]">
                        <span className="line-clamp-2">{a.fundamento}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* KANBAN VIEW */}
        {view === 'kanban' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {KANBAN_COLS.map(col => {
              const colActs = filtered.filter(a => a.status === col);
              const s = STATUS_STYLE[col];
              return (
                <div key={col} className="flex flex-col">
                  <div className={`px-3 py-2 mb-3 flex items-center justify-between border ${s.bg} ${s.border}`}>
                    <span className={`font-mono text-xs font-medium uppercase ${s.text}`}>{col}</span>
                    <span className={`font-mono text-xs ${s.text}`}>{colActs.length}</span>
                  </div>
                  <div className="space-y-2 flex-1">
                    {colActs.map(a => (
                      <KanbanCard
                        key={a.id}
                        activity={a}
                        onClick={setSelected}
                        dataConhecimento={info.dataConhecimento}
                        slaConfig={slaConfig}
                        crisis={crisis}
                      />
                    ))}
                    {colActs.length === 0 && (
                      <div className="border border-dashed border-[#E0E0E0] p-6 text-center text-gray-400 font-dm text-xs">
                        Nenhuma atividade
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

        {/* TIMELINE VIEW */}
        {view === 'timeline' && (
          <div>
            {/* Progress bar */}
            <div className="mb-6 border border-[#E0E0E0] p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-xs text-[#555555] uppercase">Progresso da Jornada</span>
                <span className="font-mono text-xs font-bold text-[#111111]">{pct}%</span>
              </div>
              <div className="relative w-full h-2 bg-[#E5E5E5]">
                <div className="h-2 bg-[#CAFF00] transition-all duration-700" style={{ width: `${pct}%` }} />
                {['Etapa 1', 'Etapa 2', 'Etapa 3'].map((stage, i) => {
                  const stageActs = activities.filter(a => a.etapa === stage);
                  const stageOffset = activities.filter(a => a.etapa !== stage && activities.findIndex(x => x.etapa === stage) > activities.findIndex(x => x.etapa === a.etapa)).length;
                  const stagePct = Math.round(activities.findIndex(a => a.etapa === stage) / activities.length * 100);
                  return (
                    <div key={i} className="absolute top-4 transform -translate-x-1/2 font-mono text-[10px] text-[#555555]" style={{ left: `${stagePct}%` }}>
                      {stage}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Timeline */}
            <div className="relative">
              {/* Central line */}
              <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-[#E5E5E5]" />

              {['Etapa 1', 'Etapa 2', 'Etapa 3'].map(stage => {
                const stageActs = filtered.filter(a => a.etapa === stage);
                if (stageActs.length === 0) return null;
                return (
                  <div key={stage} className="mb-2">
                    {/* Stage separator */}
                    <div className="relative flex items-center mb-4 ml-0">
                      <div className="z-10 w-12 h-12 bg-[#111111] flex items-center justify-center shrink-0">
                        <span className="font-mono text-[#CAFF00] text-[10px] font-bold">{stage.replace('Etapa ', 'E')}</span>
                      </div>
                      <div className="ml-4 bg-[#111111] px-4 py-2">
                        <span className="font-mono text-white text-xs uppercase">{stage}</span>
                      </div>
                    </div>

                    {stageActs.map(a => {
                      const s = STATUS_STYLE[a.status] || STATUS_STYLE['Planejado'];
                      const isAnpd = [13, 14, 15, 16, 23, 24].includes(a.id);
                      const linkedPMO = pmoActions.find(p => p.jornadaId === a.id);
                      const isPMOBlocked = linkedPMO?.status === 'Bloqueado';

                      return (
                        <div key={a.id} className="relative flex items-start mb-3 pl-0">
                          {/* Node dot */}
                          <div className={`z-10 w-12 flex items-center justify-center shrink-0 pt-3`}>
                            <div className={`w-3.5 h-3.5 rounded-full border-2 border-white ${s.dot}`} />
                          </div>

                          {/* Card */}
                          <div
                            className={`ml-4 flex-1 border cursor-pointer hover:shadow-md transition-shadow p-4 ${
                              a.status === 'Feito' ? 'border-green-200 bg-green-50/30' :
                              a.status === 'Em andamento' ? 'border-amber-200 bg-amber-50/30' :
                              'border-[#E0E0E0] bg-white'
                            }`}
                            onClick={() => setSelected(a)}
                          >
                            <div className="flex items-start gap-3 flex-wrap">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-mono text-xs text-[#555555]">#{a.id}</span>
                                  <span className="font-dm text-sm text-[#111111] font-medium">{a.nome}</span>
                                  {isAnpd && <Scale size={12} className="text-amber-500 shrink-0" title="Vinculado ao processo ANPD" />}
                                  {crisis && <span className="font-mono text-[10px] text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5">⚡ WARROOM</span>}
                                  {isPMOBlocked && <AlertTriangle size={11} className="text-red-500" title="Ação bloqueada no PMO" />}
                                </div>
                                <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                                  <span className={`font-mono text-xs px-2 py-0.5 border ${s.bg} ${s.text} ${s.border}`}>{a.status}</span>
                                  {a.dataInicio || a.dataFim ? (
                                    <span className="font-mono text-xs text-[#555555]">
                                      {a.dataInicio ? new Date(a.dataInicio + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}
                                      {' → '}
                                      {a.dataFim ? new Date(a.dataFim + 'T00:00:00').toLocaleDateString('pt-BR') : '?'}
                                    </span>
                                  ) : (
                                    <span className="font-mono text-xs text-gray-400">— → —</span>
                                  )}
                                  {a.responsavel && <span className="font-dm text-xs text-[#555555]">{a.responsavel}</span>}
                                </div>
                                {isAnpd && info.dataConhecimento && (
                                  <div className="mt-1.5 flex items-center gap-1">
                                    <Scale size={11} className="text-amber-500" />
                                    <span className="font-mono text-xs text-amber-700">
                                      {formatCountdown(businessDaysRemaining(new Date(info.dataConhecimento), 3).diffHours)} restantes
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        )}

      {/* Slide-over */}
      {selected && (
        <SlideOver
          activity={selected}
          onClose={() => setSelected(null)}
          onSave={saveActivity}
          isAdmin={effectiveIsAdmin}
          dataConhecimento={info.dataConhecimento}
          crisis={crisis}
          onWarroom={handleWarroom}
          effectiveClientId={effectiveClientId}
          comms={comms}
          pmoActions={pmoActions}
        />
      )}
    </Layout>
  );
}
