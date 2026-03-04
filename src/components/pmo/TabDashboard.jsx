import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getStorage, setStorage, KEYS } from '../../utils/storage';
import { useSLATimer } from '../../hooks/useSLA';
import { businessDaysRemaining, formatCountdown } from '../../utils/businessDays';
import { Clock, Shield, AlertTriangle, CheckSquare, Copy, Info, ExternalLink, FileText, ArrowRight } from 'lucide-react';

const NIST_PHASES = ['Detecção', 'Análise', 'Contenção', 'Erradicação', 'Recuperação'];
const STATUSES_GLOBAL = ['CRÍTICO', 'ALTO', 'MÉDIO', 'CONTIDO', 'ERRADICADO'];

const STATUS_COLORS = {
  'CRÍTICO': 'bg-red-600 text-white',
  'ALTO': 'bg-orange-500 text-white',
  'MÉDIO': 'bg-amber-500 text-black',
  'CONTIDO': 'bg-blue-600 text-white',
  'ERRADICADO': 'bg-green-600 text-white',
};

const IMPACT_ICONS = { '💰 Financeiro': '💰', '⚙ Operacional': '⚙', '📰 Reputacional': '📰', '⚖ Legal': '⚖' };

const POST_CHECKLIST = [
  'Hotwash agendado',
  'Relatório ANPD finalizado',
  'POA&M criado',
  'Playbooks atualizados',
  'Simulação agendada',
];

export default function TabDashboard({ effectiveClientId, isAdmin = false, onNavigateTab }) {
  const navigate = useNavigate();
  const [data, setData] = useState({});
  const [info, setInfo] = useState({});
  const [anpdDays, setAnpdDays] = useState(3);
  const [checklist, setChecklist] = useState([]);

  useEffect(() => {
    const pmoData = getStorage(KEYS.pmo(effectiveClientId), {});
    setData(pmoData);
    setAnpdDays(pmoData.anpdDays || 3);
    setChecklist(pmoData.postChecklist || []);
    setInfo(getStorage(KEYS.info(effectiveClientId), {}));
  }, [effectiveClientId]);

  const save = (update) => {
    const updated = { ...data, ...update };
    setData(updated);
    setStorage(KEYS.pmo(effectiveClientId), updated);
  };

  const sla = useSLATimer(info.dataConhecimento || null);
  const anpd = info.dataConhecimento ? businessDaysRemaining(new Date(info.dataConhecimento), anpdDays) : null;

  const status = data.globalStatus || 'CRÍTICO';
  const isPulsing = status === 'CRÍTICO' || status === 'ALTO';
  const showPostChecklist = status === 'CONTIDO' || status === 'ERRADICADO';

  const isBriefingFilled = !!(data.oQueHouve && data.impacto && data.oQueFazendo);
  const briefingPreview = data.oQueHouve ? data.oQueHouve.slice(0, 80) : '';

  const actions = data.actions || [];
  const openActions = actions.filter(a => a.status !== 'Feito').length;
  const blockedActions = actions.filter(a => a.status === 'Bloqueado').length;
  const pendingComms = (data.commsLog || []).filter(c => c.statusAprovacao === 'Pendente Jurídico').length;
  const activeThird = (data.terceiros || []).filter(t => t.status !== 'Concluído').length;

  const nistPhase = data.nistPhase || 'Detecção';
  const nistIndex = NIST_PHASES.indexOf(nistPhase);

  const toggleCheck = (item) => {
    const updated = checklist.includes(item) ? checklist.filter(c => c !== item) : [...checklist, item];
    setChecklist(updated);
    save({ postChecklist: updated });
  };

  const infoPath = isAdmin ? `/admin/cliente/${effectiveClientId}/informacoes` : '/informacoes';
  const infoFilled = !!(info.nomeCliente);

  return (
    <div className="space-y-6">
      {/* Card 0 — Contexto do Incidente */}
      {infoFilled ? (
        <div className="border border-[#E0E0E0] p-5">
          <div className="flex items-center gap-2 mb-3">
            <Info size={14} className="text-[#555555]" />
            <h3 className="font-mono text-xs text-[#555555] uppercase font-semibold tracking-widest">Contexto do Incidente</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="font-mono text-xs text-[#555555] uppercase mb-0.5">Cliente</div>
              <div className="font-medium text-[#111111]">{info.nomeCliente || '—'}</div>
            </div>
            <div>
              <div className="font-mono text-xs text-[#555555] uppercase mb-0.5">Data do Incidente</div>
              <div className="font-medium text-[#111111]">{info.dataIncidente || '—'}</div>
            </div>
            <div>
              <div className="font-mono text-xs text-[#555555] uppercase mb-0.5">Conhecimento (UTC)</div>
              <div className="font-medium text-[#111111]">{info.dataConhecimento ? new Date(info.dataConhecimento).toLocaleString('pt-BR') : '—'}</div>
            </div>
            <div>
              <div className="font-mono text-xs text-[#555555] uppercase mb-0.5">Agente</div>
              <div className="font-medium text-[#111111]">{info.agente || '—'}</div>
            </div>
          </div>
          {info.contexto && (
            <div className="mt-3 pt-3 border-t border-[#E0E0E0]">
              <div className="font-mono text-xs text-[#555555] uppercase mb-1">Contexto Geral</div>
              <p className="text-sm text-[#333] line-clamp-2">{info.contexto}</p>
            </div>
          )}
        </div>
      ) : (
        <div className="border border-amber-300 bg-amber-50 p-4 flex items-center gap-3">
          <AlertTriangle size={16} className="text-amber-600 shrink-0" />
          <span className="text-amber-800 text-sm">Informações do incidente não preenchidas.</span>
          <button
            onClick={() => navigate(infoPath)}
            className="ml-auto flex items-center gap-1 text-amber-700 font-mono text-xs underline hover:no-underline"
          >
            <ExternalLink size={11} /> Preencher Informações
          </button>
        </div>
      )}

      {/* Card 1 — Status + Tempo */}
      <div className="bg-[#111111] p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <div className="font-mono text-xs text-gray-400 uppercase mb-2">Status Global</div>
          <select
            value={status}
            onChange={e => save({ globalStatus: e.target.value })}
            className={`font-mono text-sm px-3 py-2 font-bold ${STATUS_COLORS[status]} border-0 cursor-pointer ${isPulsing ? 'animate-pulse-red' : ''}`}
          >
            {STATUSES_GLOBAL.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div>
          <div className="font-mono text-xs text-gray-400 uppercase mb-2">Tempo Decorrido</div>
          <div className="font-mono text-3xl font-bold text-white">
            {info.dataConhecimento ? sla.label : '—'}
          </div>
        </div>

        <div>
          <div className="font-mono text-xs text-gray-400 uppercase mb-2 flex items-center gap-1.5">
            <Shield size={12} className="text-[#CAFF00]" />
            Countdown ANPD
          </div>
          <div className={`font-mono text-2xl font-bold ${anpd?.overdue ? 'text-red-400' :
            anpd && anpd.diffHours < 24 ? 'text-red-400' :
              anpd && anpd.diffHours < 48 ? 'text-amber-400' :
                'text-green-400'
            }`}>
            {anpd ? formatCountdown(anpd.diffHours) : '—'}
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-gray-400 font-mono text-xs">Prazo ANPD (dias úteis):</span>
            <input
              type="number"
              value={anpdDays}
              min={1}
              max={60}
              onChange={e => { setAnpdDays(+e.target.value); save({ anpdDays: +e.target.value }); }}
              className="w-16 border border-gray-600 bg-gray-800 text-white font-mono text-sm px-2 py-1 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* NIST Timeline */}
      <div className="border border-[#E0E0E0] p-5">
        <h3 className="font-syne font-bold text-[#111111] uppercase text-sm mb-4">Fases NIST SP 800-61r3</h3>
        <div className="flex gap-2 overflow-x-auto">
          {NIST_PHASES.map((phase, i) => {
            const isActive = phase === nistPhase;
            const isDone = i < nistIndex;
            return (
              <button
                key={phase}
                onClick={() => save({ nistPhase: phase })}
                className={`flex-1 min-w-[100px] px-3 py-3 font-mono text-xs text-center transition-all cursor-pointer border ${isActive ? 'bg-[#CAFF00] text-[#111111] font-bold border-[#CAFF00]' :
                  isDone ? 'bg-[#111111] text-white border-[#111111]' :
                    'bg-white text-gray-500 border-[#E0E0E0] hover:bg-gray-50'
                  }`}
              >
                {isDone && '✓ '}
                {phase}
              </button>
            );
          })}
        </div>
      </div>

      {/* Card 2 — Briefing C-Level Preview */}
      <div className={`border p-5 ${!isBriefingFilled ? 'border-amber-300 bg-amber-50 animate-pulse-amber' : 'bg-[#111111] border-[#111111]'}`}>
        <div className="flex items-center justify-between mb-3">
          <h3 className={`font-syne font-bold uppercase text-sm flex items-center gap-2 ${!isBriefingFilled ? 'text-amber-800' : 'text-white'}`}>
            <FileText size={14} className={!isBriefingFilled ? 'text-amber-600' : 'text-[#CAFF00]'} />
            Briefing C-Level
          </h3>
        </div>

        {!isBriefingFilled ? (
          <div>
            <p className="font-dm text-sm text-amber-800 mb-3">
              ⚠ Resumo executivo não preenchido completamente. <br />
              É fundamental manter o relato atualizado para reportar à diretoria.
            </p>
            <button
              onClick={() => onNavigateTab && onNavigateTab('clevel')}
              className="flex items-center gap-1.5 font-mono text-xs uppercase px-4 py-2 bg-amber-600 text-white hover:bg-amber-700 transition-colors"
            >
              Preencher Resumo Executivo <ArrowRight size={13} />
            </button>
          </div>
        ) : (
          <div>
            <div className="font-mono text-xs text-gray-400 uppercase mb-1">Preview: O que houve</div>
            <p className="font-dm text-sm text-gray-200 mb-4 line-clamp-2">
              "{briefingPreview}..."
            </p>
            <button
              onClick={() => onNavigateTab && onNavigateTab('clevel')}
              className="flex items-center gap-1.5 font-mono text-xs uppercase px-4 py-2 border border-gray-600 text-white hover:bg-white hover:text-[#111111] transition-colors"
            >
              Ver e Editar Completo <ArrowRight size={13} />
            </button>
          </div>
        )}
      </div>

      {/* Card 4 — Mini KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="border border-[#E0E0E0] p-4">
          <div className="font-mono text-xs text-[#555555] uppercase mb-1">Ações Abertas</div>
          <div className="font-syne font-bold text-2xl text-[#111111]">{openActions}</div>
        </div>
        <div className={`border p-4 ${blockedActions > 0 ? 'border-red-200 bg-red-50' : 'border-[#E0E0E0]'}`}>
          <div className="font-mono text-xs text-[#555555] uppercase mb-1">Ações Bloqueadas</div>
          <div className={`font-syne font-bold text-2xl ${blockedActions > 0 ? 'text-red-600' : 'text-[#111111]'}`}>{blockedActions}</div>
        </div>
        <div className={`border p-4 ${pendingComms > 0 ? 'border-amber-200 bg-amber-50' : 'border-[#E0E0E0]'}`}>
          <div className="font-mono text-xs text-[#555555] uppercase mb-1">Comms Pendentes</div>
          <div className={`font-syne font-bold text-2xl ${pendingComms > 0 ? 'text-amber-600' : 'text-[#111111]'}`}>{pendingComms}</div>
        </div>
        <div className="border border-[#E0E0E0] p-4">
          <div className="font-mono text-xs text-[#555555] uppercase mb-1">Terceiros Ativos</div>
          <div className="font-syne font-bold text-2xl text-[#111111]">{activeThird}</div>
        </div>
      </div>

      {/* Post-incident checklist */}
      {showPostChecklist && (
        <div className="border border-green-200 bg-green-50 p-5">
          <h3 className="font-syne font-bold text-green-800 uppercase text-sm mb-4">Checklist Pós-Incidente</h3>
          <div className="space-y-2">
            {POST_CHECKLIST.map(item => (
              <label key={item} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checklist.includes(item)}
                  onChange={() => toggleCheck(item)}
                  className="w-4 h-4"
                />
                <span className={`font-dm text-sm ${checklist.includes(item) ? 'line-through text-gray-400' : 'text-green-900'}`}>
                  {item}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
