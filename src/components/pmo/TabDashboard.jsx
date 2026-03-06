import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getStorage, setStorage, KEYS } from '../../utils/storage';
import { useSLATimer } from '../../hooks/useSLA';
import { businessDaysRemaining, formatCountdown } from '../../utils/businessDays';
import { AlertTriangle, ArrowRight, BriefcaseBusiness, CheckSquare, Clock3, Info, Shield, Siren } from 'lucide-react';

const NIST_PHASES = ['Detecção', 'Análise', 'Contenção', 'Erradicação', 'Recuperação'];
const STATUSES_GLOBAL = ['Crítico', 'Alto', 'Médio', 'Contido', 'Erradicado'];
const STATUS_HELPERS = {
  'Crítico': 'Exige priorização máxima, cadência curta e comunicação ativa.',
  Alto: 'Risco elevado, com impacto importante e coordenação intensa.',
  'Médio': 'Caso estabilizado, porém ainda requer acompanhamento próximo.',
  Contido: 'Vetor interrompido e foco em saneamento, comunicação e retorno.',
  Erradicado: 'Incidente neutralizado, com frentes de fechamento e aprendizado.',
};
const STATUS_COLORS = {
  Crítico: 'border-red-200 bg-red-50 text-red-700',
  Alto: 'border-orange-200 bg-orange-50 text-orange-700',
  Médio: 'border-amber-200 bg-amber-50 text-amber-700',
  Contido: 'border-blue-200 bg-blue-50 text-blue-700',
  Erradicado: 'border-green-200 bg-green-50 text-green-700',
};
const POST_CHECKLIST = ['Hotwash agendado', 'Relatório ANPD finalizado', 'POA&M criado', 'Playbooks atualizados', 'Simulação agendada'];

function MetricCard({ label, value, helper, tone = 'neutral' }) {
  const toneClass = {
    neutral: 'border-[rgba(21,38,43,0.08)] bg-white/76',
    accent: 'border-[rgba(214,255,99,0.36)] bg-[rgba(214,255,99,0.16)]',
    danger: 'border-red-200 bg-red-50',
    warning: 'border-amber-200 bg-amber-50',
  }[tone];

  return (
    <div className={`rounded-[26px] border p-4 shadow-[0_14px_30px_rgba(21,38,43,0.05)] ${toneClass}`}>
      <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--ink-soft)]">{label}</div>
      <div className="mt-3 font-syne text-3xl font-bold text-[var(--ink)]">{value}</div>
      {helper && <p className="mt-2 text-sm leading-6 text-[var(--ink-soft)]">{helper}</p>}
    </div>
  );
}

export default function TabDashboard({ effectiveClientId, onNavigateTab }) {
  const navigate = useNavigate();
  const [data, setData] = useState(() => getStorage(KEYS.pmo(effectiveClientId), {}));
  const [info] = useState(() => getStorage(KEYS.info(effectiveClientId), {}));
  const [anpdDays, setAnpdDays] = useState(() => getStorage(KEYS.pmo(effectiveClientId), {}).anpdDays || 3);
  const [checklist, setChecklist] = useState(() => getStorage(KEYS.pmo(effectiveClientId), {}).postChecklist || []);

  const save = (update) => {
    const updated = { ...data, ...update };
    setData(updated);
    setStorage(KEYS.pmo(effectiveClientId), updated);
  };

  const sla = useSLATimer(info.dataConhecimento || null);
  const anpd = info.dataConhecimento ? businessDaysRemaining(new Date(info.dataConhecimento), anpdDays) : null;
  const status = data.globalStatus || 'Crítico';
  const nistPhase = data.nistPhase || 'Detecção';
  const isBriefingFilled = !!(data.oQueHouve && data.impacto && data.oQueFazendo);
  const briefingPreview = data.oQueHouve ? data.oQueHouve.slice(0, 160) : '';
  const actions = data.actions || [];
  const comms = data.commsLog || [];
  const terceiros = data.terceiros || [];
  const timeline = data.timeline || [];
  const now = new Date();

  const openActions = actions.filter((item) => item.status !== 'Feito');
  const blockedActions = actions.filter((item) => item.status === 'Bloqueado');
  const overdueActions = actions.filter((item) => item.prazo && new Date(item.prazo) < now && item.status !== 'Feito');
  const pendingComms = comms.filter((item) => item.statusAprovacao === 'Pendente Jurídico');
  const activeThird = terceiros.filter((item) => item.status !== 'Concluído');

  const summary = {
    openActions: openActions.length,
    blockedActions: blockedActions.length,
    overdueActions: overdueActions.length,
    pendingComms: pendingComms.length,
    activeThird: activeThird.length,
    timelineCount: timeline.length,
  };

  const completionStages = [
    { label: 'Informações', done: !!info.nomeCliente },
    { label: 'Resumo C-Level', done: isBriefingFilled },
    { label: 'Timeline', done: timeline.length > 0 },
    { label: 'Ações', done: actions.length > 0 },
    { label: 'Comms', done: comms.length > 0 },
    { label: 'Terceiros', done: terceiros.length > 0 },
  ];
  const completion = {
    stages: completionStages,
    done: completionStages.filter((stage) => stage.done).length,
    total: completionStages.length,
  };

  const quickActions = [
    {
      label: 'Atualizar resumo executivo',
      helper: isBriefingFilled ? 'Revisar briefing antes de nova rodada de reporte.' : 'Ainda faltam campos do briefing C-Level.',
      tab: 'clevel',
      tone: isBriefingFilled ? 'neutral' : 'warning',
    },
    {
      label: 'Registrar marco na timeline',
      helper: 'Anexe o próximo evento relevante para manter a narrativa consolidada.',
      tab: 'timeline',
      tone: 'neutral',
    },
    {
      label: 'Tratar bloqueios da matriz',
      helper: summary.blockedActions > 0 ? `${summary.blockedActions} item(ns) aguardando destravamento.` : 'Sem bloqueios abertos no momento.',
      tab: 'matriz',
      tone: summary.blockedActions > 0 ? 'danger' : 'neutral',
    },
    {
      label: 'Preparar comunicação',
      helper: summary.pendingComms > 0 ? `${summary.pendingComms} comunicação(ões) pendentes de jurídico.` : 'Nenhum gargalo crítico em comunicações.',
      tab: 'comms',
      tone: summary.pendingComms > 0 ? 'warning' : 'neutral',
    },
  ];

  const infoPath = effectiveClientId ? `/admin/cliente/${effectiveClientId}/informacoes` : '/informacoes';
  const nistIndex = NIST_PHASES.indexOf(nistPhase);
  const showPostChecklist = status === 'Contido' || status === 'Erradicado';
  const executiveSummary = data.executiveSummary
    || [data.oQueHouve, data.impacto, data.oQueFazendo].filter(Boolean).join(' ');

  const toggleCheck = (item) => {
    const updated = checklist.includes(item) ? checklist.filter((entry) => entry !== item) : [...checklist, item];
    setChecklist(updated);
    save({ postChecklist: updated });
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 2xl:grid-cols-[minmax(0,1.45fr)_minmax(340px,0.85fr)]">
        <section className="app-panel-dark rounded-[32px] p-6 shadow-[0_24px_50px_rgba(21,38,43,0.12)]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="font-mono text-[11px] uppercase tracking-[0.28em] text-[var(--accent)]">Painel executivo</div>
              <h2 className="mt-3 font-syne text-3xl font-bold text-white md:text-4xl">Situação operacional do caso</h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-[#d7e0e3]">
                Visão consolidada do incidente para dar ritmo às frentes de resposta, comunicação e governança.
              </p>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/6 p-4 sm:min-w-[240px]">
              <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--accent)]">Situação operacional</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {STATUSES_GLOBAL.map((option) => (
                  <button
                    key={option}
                    onClick={() => save({ globalStatus: option })}
                    className={`rounded-full border px-3 py-2 font-mono text-[11px] uppercase tracking-[0.18em] transition-all ${status === option ? STATUS_COLORS[option] : 'border-white/10 bg-white/8 text-white hover:bg-white/14'}`}
                  >
                    {option}
                  </button>
                ))}
              </div>
              <p className="mt-3 text-sm leading-6 text-[#d7e0e3]">{STATUS_HELPERS[status]}</p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div className="rounded-[24px] border border-white/10 bg-white/6 p-4">
              <div className="flex items-center gap-2 text-[var(--accent)]"><Clock3 size={14} /><span className="font-mono text-[11px] uppercase tracking-[0.24em]">Tempo decorrido</span></div>
              <div className="mt-3 font-syne text-3xl font-bold text-white">{info.dataConhecimento ? sla.label : '—'}</div>
              <p className="mt-2 text-sm text-[#c6d0d4]">Contado a partir da ciência do incidente.</p>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/6 p-4">
              <div className="flex items-center gap-2 text-[var(--accent)]"><Shield size={14} /><span className="font-mono text-[11px] uppercase tracking-[0.24em]">Prazo ANPD</span></div>
              <div className={`mt-3 font-syne text-3xl font-bold ${anpd?.overdue ? 'text-red-300' : anpd && anpd.diffHours < 24 ? 'text-red-300' : anpd && anpd.diffHours < 48 ? 'text-amber-300' : 'text-white'}`}>
                {anpd ? formatCountdown(anpd.diffHours) : '—'}
              </div>
              <div className="mt-3 flex items-center gap-2">
                <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#c6d0d4]">Meta</span>
                <input
                  type="number"
                  value={anpdDays}
                  min={1}
                  max={60}
                  onChange={(event) => {
                    const next = Number(event.target.value) || 3;
                    setAnpdDays(next);
                    save({ anpdDays: next });
                  }}
                  className="w-16 rounded-full border border-white/10 bg-white/10 px-3 py-1 font-mono text-xs text-white focus:outline-none"
                />
                <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#c6d0d4]">dias úteis</span>
              </div>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/6 p-4">
              <div className="flex items-center gap-2 text-[var(--accent)]"><BriefcaseBusiness size={14} /><span className="font-mono text-[11px] uppercase tracking-[0.24em]">Resumo C-Level</span></div>
              <div className="mt-3 font-syne text-3xl font-bold text-white">{completion.done}/{completion.total}</div>
              <p className="mt-2 text-sm text-[#c6d0d4]">Blocos essenciais já preenchidos para conduzir reporte.</p>
            </div>
          </div>

          <div className="mt-6 rounded-[28px] border border-white/10 bg-white/6 p-5">
            <div className="flex items-center gap-2 text-white"><Info size={14} className="text-[var(--accent)]" /><span className="font-syne text-lg font-bold">Contexto do incidente</span></div>
            {info.nomeCliente ? (
              <div className="mt-4 grid gap-4 md:grid-cols-4">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-[#c6d0d4]">Cliente</div>
                  <div className="mt-2 text-sm font-medium text-white">{info.nomeCliente || '—'}</div>
                </div>
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-[#c6d0d4]">Incidente</div>
                  <div className="mt-2 text-sm font-medium text-white">{info.dataIncidente || '—'}</div>
                </div>
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-[#c6d0d4]">Ciência (UTC)</div>
                  <div className="mt-2 text-sm font-medium text-white">{info.dataConhecimento ? new Date(info.dataConhecimento).toLocaleString('pt-BR') : '—'}</div>
                </div>
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-[#c6d0d4]">Agente</div>
                  <div className="mt-2 text-sm font-medium text-white">{info.agente || '—'}</div>
                </div>
              </div>
            ) : (
              <div className="mt-4 flex flex-wrap items-center gap-3 rounded-[22px] border border-amber-400/30 bg-amber-500/10 p-4 text-amber-100">
                <AlertTriangle size={16} />
                <span className="text-sm">As informações do incidente ainda não foram preenchidas.</span>
                <button onClick={() => navigate(infoPath)} className="ml-auto inline-flex items-center gap-2 rounded-full border border-amber-300/30 px-3 py-2 font-mono text-[11px] uppercase tracking-[0.18em] hover:bg-white/10">
                  Preencher agora <ArrowRight size={13} />
                </button>
              </div>
            )}
          </div>

          <div className="mt-6 rounded-[28px] border border-white/10 bg-white/6 p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-white">
                  <BriefcaseBusiness size={14} className="text-[var(--accent)]" />
                  <span className="font-syne text-lg font-bold">{'Resumo executivo do incidente'}</span>
                </div>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-[#c6d0d4]">
                  {'Use este bloco para consolidar a leitura executiva do caso em poucas linhas, sem precisar sair do dashboard.'}
                </p>
              </div>
              <button
                onClick={() => onNavigateTab?.('clevel')}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/8 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-white transition-all hover:bg-white/14"
              >
                {'Abrir Resumo C-Level'}
                <ArrowRight size={13} />
              </button>
            </div>

            <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(220px,0.8fr)]">
              <div>
                <textarea
                  value={executiveSummary}
                  onChange={(event) => save({ executiveSummary: event.target.value })}
                  rows={6}
                  placeholder={'Descreva, em linguagem executiva, o que aconteceu, o impacto atual e o foco das proximas acoes.'}
                  className="w-full rounded-[24px] border border-white/10 bg-[#102a31] px-4 py-4 text-sm leading-7 text-white placeholder:text-[#8ea1a8] focus:border-[rgba(214,255,99,0.45)] focus:outline-none"
                />
                <p className="mt-3 text-xs leading-5 text-[#9fb1b7]">
                  {'Este resumo fica salvo no PMO e pode ser reaproveitado como base para reportes rapidos.'}
                </p>
              </div>

              <div className="space-y-3">
                <div className="rounded-[24px] border border-white/10 bg-white/6 p-4">
                  <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--accent)]">{'Leitura sugerida'}</div>
                  <p className="mt-3 text-sm leading-6 text-[#d7e0e3]">
                    {'Estruture em tres partes: evento, impacto atual e proxima decisao necessaria.'}
                  </p>
                </div>
                <div className="rounded-[24px] border border-white/10 bg-white/6 p-4">
                  <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--accent)]">{'Uso recomendado'}</div>
                  <p className="mt-3 text-sm leading-6 text-[#d7e0e3]">
                    {'Ideal para update de diretoria, kick-off de war room e alinhamento rapido com juridico ou lideranca.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="app-panel rounded-[30px] p-5 shadow-[0_18px_36px_rgba(21,38,43,0.06)]">
            <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--ink-soft)]">Ritmo de resposta</div>
            <h3 className="mt-3 font-syne text-2xl font-bold text-[var(--ink)]">Próximos movimentos</h3>
            <div className="mt-4 space-y-3">
              {quickActions.map((action) => (
                <button
                  key={action.label}
                  onClick={() => onNavigateTab?.(action.tab)}
                  className={`w-full rounded-[24px] border p-4 text-left transition-all ${action.tone === 'danger'
                    ? 'border-red-200 bg-red-50 hover:bg-red-100/60'
                    : action.tone === 'warning'
                      ? 'border-amber-200 bg-amber-50 hover:bg-amber-100/60'
                      : 'border-[rgba(21,38,43,0.08)] bg-white/72 hover:bg-white'
                    }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-syne text-lg font-bold text-[var(--ink)]">{action.label}</span>
                    <ArrowRight size={16} className="text-[var(--ink-soft)]" />
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[var(--ink-soft)]">{action.helper}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="app-panel rounded-[30px] p-5 shadow-[0_18px_36px_rgba(21,38,43,0.06)]">
            <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--ink-soft)]">Cobertura do PMO</div>
            <h3 className="mt-3 font-syne text-2xl font-bold text-[var(--ink)]">Completude por frente</h3>
            <div className="mt-5 space-y-3">
              {completion.stages.map((stage) => (
                <div key={stage.label} className="flex items-center justify-between gap-4 rounded-[20px] border border-[rgba(21,38,43,0.08)] bg-white/80 px-4 py-3">
                  <span className="text-sm font-medium text-[var(--ink)]">{stage.label}</span>
                  <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 font-mono text-[11px] uppercase tracking-[0.2em] ${stage.done ? 'bg-[rgba(214,255,99,0.18)] text-[var(--ink)]' : 'bg-white/70 text-[var(--ink-soft)]'}`}>
                    {stage.done ? 'Completo' : 'Pendente'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Ações abertas" value={summary.openActions} helper="Itens ainda em execução na matriz." tone={summary.openActions > 0 ? 'warning' : 'neutral'} />
        <MetricCard label="Bloqueadas" value={summary.blockedActions} helper="Precisam de decisão, fornecedor ou destravamento." tone={summary.blockedActions > 0 ? 'danger' : 'neutral'} />
        <MetricCard label="Comms pendentes" value={summary.pendingComms} helper="Peças em revisão jurídica ou aguardando disparo." tone={summary.pendingComms > 0 ? 'warning' : 'neutral'} />
        <MetricCard label="Terceiros ativos" value={summary.activeThird} helper="Parceiros em atuação, retorno ou validação." tone="neutral" />
      </section>

      <section className="app-panel rounded-[30px] p-5 shadow-[0_18px_36px_rgba(21,38,43,0.06)]">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--ink-soft)]">Fase NIST</div>
            <h3 className="mt-2 font-syne text-2xl font-bold text-[var(--ink)]">Jornada técnica da resposta</h3>
          </div>
          <div className="rounded-full border border-[rgba(21,38,43,0.08)] bg-white/72 px-3 py-2 font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--ink-soft)]">
            Fase atual: {nistPhase}
          </div>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {NIST_PHASES.map((phase, index) => {
            const isActive = phase === nistPhase;
            const isDone = index < nistIndex;
            return (
              <button
                key={phase}
                onClick={() => save({ nistPhase: phase })}
                className={`rounded-[24px] border p-4 text-left transition-all ${isActive
                  ? 'border-[rgba(214,255,99,0.55)] bg-[linear-gradient(135deg,rgba(214,255,99,0.16),rgba(20,54,62,0.08))]'
                  : isDone
                    ? 'border-[rgba(21,38,43,0.08)] bg-white'
                    : 'border-[rgba(21,38,43,0.08)] bg-white/72 hover:bg-white'
                  }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--ink-soft)]">Etapa {index + 1}</span>
                  {isDone ? <CheckSquare size={15} className="text-green-600" /> : isActive ? <Siren size={15} className="text-[var(--ink)]" /> : null}
                </div>
                <div className="mt-4 font-syne text-xl font-bold text-[var(--ink)]">{phase}</div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="grid gap-6 2xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.8fr)]">
        <div className={`rounded-[30px] border p-5 shadow-[0_18px_36px_rgba(21,38,43,0.06)] ${isBriefingFilled ? 'app-panel-dark border-[rgba(21,38,43,0.14)]' : 'border-amber-200 bg-amber-50'}`}>
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className={`font-mono text-[11px] uppercase tracking-[0.24em] ${isBriefingFilled ? 'text-[var(--accent)]' : 'text-amber-700'}`}>Narrativa executiva</div>
              <h3 className={`mt-3 font-syne text-2xl font-bold ${isBriefingFilled ? 'text-white' : 'text-amber-900'}`}>Resumo C-Level</h3>
            </div>
            <button
              onClick={() => onNavigateTab?.('clevel')}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 font-mono text-[11px] uppercase tracking-[0.18em] ${isBriefingFilled ? 'border border-white/10 text-white hover:bg-white/10' : 'bg-amber-600 text-white hover:bg-amber-700'}`}
            >
              Abrir briefing <ArrowRight size={13} />
            </button>
          </div>
          {!isBriefingFilled ? (
            <div className="mt-4 rounded-[22px] border border-amber-200 bg-white/70 p-4 text-sm leading-7 text-amber-900">
              O resumo executivo ainda não está completo. Preencha o que aconteceu, impacto e ações em andamento para manter a comunicação com diretoria pronta.
            </div>
          ) : (
            <div className="mt-5 rounded-[24px] border border-white/10 bg-white/6 p-5">
              <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--ink-soft)]">Prévia do briefing</div>
              <p className="mt-3 text-sm leading-7 text-[#edf3f5]">{briefingPreview}...</p>
            </div>
          )}
        </div>

        {showPostChecklist && (
          <div className="rounded-[30px] border border-green-200 bg-green-50 p-5 shadow-[0_18px_36px_rgba(52,130,73,0.08)]">
            <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-green-700">Encerramento</div>
            <h3 className="mt-3 font-syne text-2xl font-bold text-green-900">Checklist pós-incidente</h3>
            <div className="mt-5 space-y-3">
              {POST_CHECKLIST.map((item) => (
                <label key={item} className="flex items-center gap-3 rounded-[20px] border border-green-200 bg-white/75 px-4 py-3">
                  <input type="checkbox" checked={checklist.includes(item)} onChange={() => toggleCheck(item)} className="h-4 w-4 accent-[var(--accent-deep)]" />
                  <span className={`text-sm ${checklist.includes(item) ? 'text-[var(--ink-soft)] line-through' : 'text-green-900'}`}>{item}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
