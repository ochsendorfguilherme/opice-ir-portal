import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import { getStorage, setStorage, KEYS } from '../utils/storage';
import { DEFAULT_ACTIVITIES } from '../data/activities';
import { useSLATimer } from '../hooks/useSLA';
import { businessDaysRemaining, formatCountdown } from '../utils/businessDays';
import { Clock, Shield, Zap, Scale, ExternalLink } from 'lucide-react';
import WelcomeModal from '../components/WelcomeModal';

const STATUS_MAP = {
  Feito: { badge: 'bg-emerald-100 text-emerald-700 border-emerald-200', accent: 'text-emerald-700' },
  'Em andamento': { badge: 'bg-amber-100 text-amber-700 border-amber-200', accent: 'text-amber-700' },
  Planejado: { badge: 'bg-sky-100 text-sky-700 border-sky-200', accent: 'text-sky-700' },
  'Não se aplica': { badge: 'bg-stone-100 text-stone-600 border-stone-200', accent: 'text-stone-600' },
};

function StatusCard({ label, count, pct, tone, isHighlight = false }) {
  const tones = {
    success: { count: 'text-emerald-700', pill: 'bg-emerald-100 text-emerald-700' },
    warning: { count: 'text-amber-700', pill: 'bg-amber-100 text-amber-700' },
    info: { count: 'text-sky-700', pill: 'bg-sky-100 text-sky-700' },
    muted: { count: 'text-stone-600', pill: 'bg-stone-100 text-stone-600' },
  };
  const currentTone = tones[tone] || tones.muted;

  return (
    <article className={`metric-card rounded-[28px] p-5 ${isHighlight ? 'highlight' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className={`font-mono text-[11px] uppercase tracking-[0.24em] ${isHighlight ? 'text-white/62' : 'text-[var(--ink-soft)]'}`}>
            {label}
          </p>
          <div className={`mt-3 text-4xl font-bold ${isHighlight ? 'text-white' : currentTone.count}`}>
            {count}
          </div>
        </div>
        {pct !== undefined && (
          <span className={`rounded-full px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] ${isHighlight ? 'bg-white/12 text-white/78' : currentTone.pill}`}>
            {pct}%
          </span>
        )}
      </div>
      <p className={`mt-4 text-sm ${isHighlight ? 'text-white/72' : 'text-[var(--ink-soft)]'}`}>
        {isHighlight ? 'Total monitorado no incidente.' : 'Participação no conjunto de atividades.'}
      </p>
    </article>
  );
}

function ProgressMeter({ label, pct, subtext }) {
  return (
    <div className="rounded-[24px] border border-[rgba(21,38,43,0.08)] bg-white/68 p-4">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--ink-soft)]">{label}</span>
        <span className="font-mono text-xs font-semibold text-[var(--ink)]">{pct}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[rgba(21,38,43,0.08)]">
        <div
          className={`h-2 rounded-full transition-all duration-700 ${pct < 40 ? 'bg-[#d45a58]' : pct < 70 ? 'bg-[#d59b32]' : 'bg-[var(--accent-deep)]'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-2 text-sm text-[var(--ink-soft)]">{subtext}</p>
    </div>
  );
}

function ANPDCountdown({ dataConhecimento }) {
  const [countdown, setCountdown] = useState('');
  const [status, setStatus] = useState('ok');

  useEffect(() => {
    if (!dataConhecimento) return;

    const update = () => {
      const result = businessDaysRemaining(new Date(dataConhecimento), 3);
      setCountdown(formatCountdown(result.diffHours));

      if (result.overdue) setStatus('overdue');
      else if (result.diffHours < 24) setStatus('critical');
      else if (result.diffHours < 48) setStatus('warning');
      else setStatus('ok');
    };

    update();
    const iv = setInterval(update, 60000);
    return () => clearInterval(iv);
  }, [dataConhecimento]);

  const styles = {
    ok: {
      frame: 'border-emerald-200 bg-emerald-50/80',
      icon: 'text-emerald-700',
      tag: 'bg-emerald-100 text-emerald-700',
      label: 'No prazo',
    },
    warning: {
      frame: 'border-amber-200 bg-amber-50/80',
      icon: 'text-amber-700',
      tag: 'bg-amber-100 text-amber-700',
      label: 'Atenção',
    },
    critical: {
      frame: 'border-red-200 bg-red-50/85',
      icon: 'text-red-700',
      tag: 'bg-red-100 text-red-700',
      label: 'Crítico',
    },
    overdue: {
      frame: 'border-red-300 bg-red-100/90',
      icon: 'text-red-800',
      tag: 'bg-red-600 text-white',
      label: 'Vencido',
    },
  };

  const current = styles[status];

  return (
    <section className={`app-panel rounded-[30px] border ${current.frame} p-6`}>
      <div className="mb-4 flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-2xl bg-white/75 ${current.icon}`}>
          <Shield size={18} />
        </div>
        <div>
          <p className="section-kicker">Prazo regulatório</p>
          <h2 className="text-xl font-bold text-[var(--ink)]">Countdown ANPD</h2>
        </div>
        <span className={`ml-auto rounded-full px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] ${current.tag}`}>
          {current.label}
        </span>
      </div>
      <div className={`font-mono text-4xl font-semibold ${current.icon}`}>
        {countdown || '--'}
      </div>
      <p className="mt-3 text-sm text-[var(--ink-soft)]">
        Resolução 15/2024. Prazo de comunicação considerado: 3 dias úteis.
      </p>
    </section>
  );
}

export default function Dashboard({ clientId: propClientId, isAdmin = false, adminClientName, onAdminBack }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const effectiveClientId = propClientId || user?.clientId;

  const [activities] = useState(() => {
    const stored = getStorage(KEYS.activities(effectiveClientId));
    if (stored) return stored;
    setStorage(KEYS.activities(effectiveClientId), DEFAULT_ACTIVITIES);
    return DEFAULT_ACTIVITIES;
  });
  const [info] = useState(() => getStorage(KEYS.info(effectiveClientId), {}));
  const [crisis] = useState(() => {
    const currentCrisis = getStorage(KEYS.crisis(effectiveClientId, 'active'));
    return currentCrisis?.crisisActive === true && currentCrisis?.crisisStatus !== 'closed' ? currentCrisis : null;
  });
  const [showWelcome, setShowWelcome] = useState(() => (
    user?.role === 'client' && !getStorage(KEYS.welcomeShown(effectiveClientId))
  ));

  const sla = useSLATimer(info.dataConhecimento || null);

  const total = activities.length;
  const counts = {};
  activities.forEach((activity) => {
    counts[activity.status] = (counts[activity.status] || 0) + 1;
  });
  const pct = (status) => (total ? Math.round(((counts[status] || 0) / total) * 100) : 0);

  const etapas = ['Etapa 1', 'Etapa 2', 'Etapa 3'];
  const stageStats = etapas.map((etapa) => {
    const stageActivities = activities.filter((activity) => activity.etapa === etapa);
    const done = stageActivities.filter((activity) => activity.status === 'Feito').length;
    return {
      label: etapa,
      pct: stageActivities.length ? Math.round((done / stageActivities.length) * 100) : 0,
      total: stageActivities.length,
    };
  });

  const recent = [...activities].slice(-5).reverse();

  const pmoData = getStorage(KEYS.pmo(effectiveClientId), {});
  const pmoActions = pmoData.actions || [];
  const openActions = pmoActions.filter((action) => action.status !== 'Feito').length;
  const upcoming = pmoActions
    .filter((action) => action.prazo && action.status !== 'Feito')
    .sort((a, b) => new Date(a.prazo) - new Date(b.prazo))[0];

  const nistPhase = pmoData.nistPhase || 'Detecção';

  const jornadaPct = total ? Math.round(((counts.Feito || 0) / total) * 100) : 0;
  const answersData = getStorage(KEYS.answers(effectiveClientId), {});
  const TOTAL_QUESTIONS = 29;
  const answeredQs = Object.values(answersData).flatMap((section) => Object.values(section).filter((value) => value?.trim())).length;
  const perguntasPct = Math.round((Math.min(answeredQs, TOTAL_QUESTIONS) / TOTAL_QUESTIONS) * 100);
  const pmoDone = pmoActions.filter((action) => action.status === 'Feito').length;
  const pmoPct = pmoActions.length ? Math.round((pmoDone / pmoActions.length) * 100) : 0;
  const prazosPct = sla.status === 'critical' ? 0 : sla.status === 'warning' ? 50 : 100;
  const globalScore = Math.round((jornadaPct + perguntasPct + pmoPct + prazosPct) / 4);
  const scoreLabel = globalScore < 40 ? 'Zona crítica' : globalScore < 70 ? 'Atenção' : 'Saudável';
  const scoreTone = globalScore < 40 ? 'bg-red-100 text-red-700' : globalScore < 70 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700';

  const metaItems = [
    { label: 'Cliente', value: info.nomeCliente || 'Não informado' },
    { label: 'Data do incidente', value: info.dataIncidente || '--' },
    { label: 'Agente', value: info.agente || '--' },
    { label: 'Código', value: info.codigoCliente || '--' },
  ];

  const anpdData = getStorage(KEYS.anpd(effectiveClientId), {});
  const processo = anpdData.processo || {};
  const hasProcess = !!processo.numeroProcesso;
  const hasAnpdData = Object.keys(processo).length > 0;
  const nextDeadline = info.dataConhecimento ? businessDaysRemaining(new Date(info.dataConhecimento), 3) : null;

  return (
    <Layout clientId={propClientId} isAdmin={isAdmin} adminClientName={adminClientName} onAdminBack={onAdminBack}>
      <div className="px-6 pb-8 pt-6 md:px-10 md:pt-10">
        <div className="mb-8 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <section className="app-panel relative overflow-hidden rounded-[32px] px-6 py-6 md:px-8 md:py-8">
            <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#173038_0%,#d6ff63_100%)]" />
            <p className="section-kicker mb-4">Incident command view</p>
            <div className="flex flex-wrap items-start gap-4">
              <div className="min-w-0 flex-1">
                <h1 className="text-4xl font-bold text-[var(--ink)] md:text-5xl">Dashboard de Incidente</h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--ink-soft)] md:text-base">
                  Visão consolidada da jornada, prazos regulatórios, PMO e sinais de escalada do caso.
                </p>
              </div>
              {info.nomeCliente && (
                <div className="soft-ribbon rounded-[26px] px-5 py-4">
                  <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/60">Cliente ativo</p>
                  <div className="mt-2 text-xl font-bold text-white">{info.nomeCliente}</div>
                  {isAdmin && adminClientName && (
                    <div className="mt-1 text-sm text-white/70">Acesso administrativo contextual</div>
                  )}
                </div>
              )}
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {metaItems.map((item) => (
                <div key={item.label} className="rounded-[24px] border border-[rgba(21,38,43,0.08)] bg-white/68 px-4 py-4">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-soft)]">{item.label}</p>
                  <p className="mt-2 text-sm font-semibold text-[var(--ink)] md:text-base">{item.value}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="metric-card highlight rounded-[32px] px-6 py-6 md:px-7 md:py-7">
            <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-white/62">Pulso geral</p>
            <div className="mt-4 flex items-start justify-between gap-4">
              <div>
                <div className="text-5xl font-bold text-white">{globalScore}%</div>
                <p className="mt-2 max-w-xs text-sm leading-6 text-white/72">
                  Combinação de jornada, perguntas respondidas, entregas PMO e pressão de prazo.
                </p>
              </div>
              <span className={`rounded-full px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] ${scoreTone}`}>
                {scoreLabel}
              </span>
            </div>
            <div className="mt-6 h-3 overflow-hidden rounded-full bg-white/12">
              <div
                className={`h-3 rounded-full transition-all duration-700 ${globalScore < 40 ? 'bg-[#d45a58]' : globalScore < 70 ? 'bg-[#f0bd59]' : 'bg-[var(--accent)]'}`}
                style={{ width: `${globalScore}%` }}
              />
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-[22px] border border-white/10 bg-white/6 p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/54">Perguntas</p>
                <div className="mt-2 text-2xl font-bold text-white">{perguntasPct}%</div>
              </div>
              <div className="rounded-[22px] border border-white/10 bg-white/6 p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/54">PMO</p>
                <div className="mt-2 text-2xl font-bold text-white">{pmoPct}%</div>
              </div>
              <div className="rounded-[22px] border border-white/10 bg-white/6 p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/54">Jornada</p>
                <div className="mt-2 text-2xl font-bold text-white">{jornadaPct}%</div>
              </div>
              <div className="rounded-[22px] border border-white/10 bg-white/6 p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/54">Prazos</p>
                <div className="mt-2 text-2xl font-bold text-white">{prazosPct}%</div>
              </div>
            </div>
          </section>
        </div>

        {crisis && (
          <section className="app-panel mb-8 rounded-[30px] border border-red-200 bg-red-50/85 p-5 shadow-[0_18px_34px_rgba(212,90,88,0.12)]">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-600 text-white animate-pulse-red">
                <Zap size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-red-700">War Room ativa</p>
                <h2 className="mt-1 text-xl font-bold text-red-800">
                  {crisis.crisisId} desde {new Date(crisis.crisisTimestamp).toLocaleString('pt-BR')}
                </h2>
                <p className="mt-1 text-sm text-red-700/85">O fluxo de crise está ativo e o SLA operacional está pausado enquanto a War Room permanece aberta.</p>
              </div>
              <button
                onClick={() => navigate(isAdmin ? `/admin/cliente/${effectiveClientId}/pmo/warroom` : '/pmo/warroom')}
                className="btn-primary flex items-center gap-2 rounded-full"
              >
                Ver War Room
              </button>
            </div>
          </section>
        )}

        <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <StatusCard label="Feito" count={counts.Feito || 0} pct={pct('Feito')} tone="success" />
          <StatusCard label="Em andamento" count={counts['Em andamento'] || 0} pct={pct('Em andamento')} tone="warning" />
          <StatusCard label="Planejado" count={counts.Planejado || 0} pct={pct('Planejado')} tone="info" />
          <StatusCard label="Não se aplica" count={counts["Não se aplica"] || 0} pct={pct("Não se aplica")} tone="muted" />
          <StatusCard label="Total de atividades" count={total} isHighlight />
        </div>

        <div className="mb-8 grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <section className="app-panel rounded-[30px] p-6 md:p-7">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <p className="section-kicker">Jornada</p>
                <h2 className="text-2xl font-bold text-[var(--ink)]">Progresso por etapa</h2>
              </div>
              <span className="rounded-full bg-[var(--accent-glow)] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink)]">
                {total} atividades
              </span>
            </div>
            <div className="space-y-5">
              {stageStats.map(({ label, pct: stagePct, total: stageTotal }) => (
                <div key={label} className="rounded-[24px] border border-[rgba(21,38,43,0.08)] bg-white/68 p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-[var(--ink)]">{label}</div>
                      <div className="text-sm text-[var(--ink-soft)]">{stageTotal} atividades no fluxo</div>
                    </div>
                    <span className="font-mono text-sm font-semibold text-[var(--ink)]">{stagePct}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-[rgba(21,38,43,0.08)]">
                    <div className="h-2 rounded-full bg-[linear-gradient(90deg,#173038_0%,#d6ff63_100%)] transition-all duration-700" style={{ width: `${stagePct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <div className="grid gap-4">
            <ANPDCountdown dataConhecimento={info.dataConhecimento} />

            <section className={`app-panel rounded-[30px] p-6 ${sla.status === 'critical' ? 'border border-red-200 bg-red-50/85' : sla.status === 'warning' ? 'border border-amber-200 bg-amber-50/80' : ''}`}>
              <div className="mb-4 flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-2xl bg-white/75 ${sla.status === 'critical' ? 'text-red-700' : sla.status === 'warning' ? 'text-amber-700' : 'text-[var(--ink)]'}`}>
                  <Clock size={18} />
                </div>
                <div>
                  <p className="section-kicker">SLA operacional</p>
                  <h2 className="text-xl font-bold text-[var(--ink)]">Tempo decorrido</h2>
                </div>
                {crisis && (
                  <span className="ml-auto rounded-full bg-amber-100 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-amber-700">
                    Pausado
                  </span>
                )}
              </div>
              <div className={`font-mono text-4xl font-semibold ${sla.status === 'critical' ? 'text-red-700 animate-pulse-red' : sla.status === 'warning' ? 'text-amber-700 animate-pulse-amber' : 'text-[var(--ink)]'}`}>
                {info.dataConhecimento ? sla.label : '--'}
              </div>
              <p className="mt-3 text-sm text-[var(--ink-soft)]">
                Contagem a partir da data de conhecimento registrada para o incidente.
              </p>
            </section>
          </div>
        </div>

        <div className="mb-8 grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <section className="app-panel rounded-[30px] p-6 md:p-7">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <p className="section-kicker">PMO snapshot</p>
                <h2 className="text-2xl font-bold text-[var(--ink)]">Resumo PMO</h2>
              </div>
              <span className="rounded-full bg-[rgba(21,38,43,0.06)] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-soft)]">
                {openActions} abertas
              </span>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-[24px] border border-[rgba(21,38,43,0.08)] bg-white/72 p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-soft)]">Fase NIST</p>
                <div className="mt-3 inline-flex rounded-full bg-[#173038] px-3 py-1 font-mono text-xs uppercase tracking-[0.18em] text-white">
                  {nistPhase}
                </div>
              </div>
              <div className="rounded-[24px] border border-[rgba(21,38,43,0.08)] bg-white/72 p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-soft)]">Ações abertas</p>
                <div className="mt-3 text-3xl font-bold text-[var(--ink)]">{openActions}</div>
              </div>
              <div className="rounded-[24px] border border-[rgba(21,38,43,0.08)] bg-white/72 p-4 md:col-span-2">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-soft)]">Proximo prazo</p>
                {upcoming ? (
                  <>
                    <div className="mt-3 text-base font-semibold text-[var(--ink)]">{upcoming.descricao}</div>
                    <div className="mt-2 inline-flex rounded-full bg-amber-100 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-amber-700">
                      {new Date(upcoming.prazo).toLocaleDateString('pt-BR')}
                    </div>
                  </>
                ) : (
                  <div className="mt-3 text-sm text-[var(--ink-soft)]">Nenhum prazo definido no momento.</div>
                )}
              </div>
            </div>
          </section>

          <section className={`app-panel rounded-[30px] p-6 md:p-7 ${!hasProcess && hasAnpdData ? 'border border-amber-200 bg-amber-50/80' : ''}`}>
            <div className="mb-5 flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-2xl bg-white/75 ${!hasProcess && hasAnpdData ? 'text-amber-700' : 'text-[var(--ink)]'}`}>
                <Scale size={18} />
              </div>
              <div>
                <p className="section-kicker">Regulatório</p>
                <h2 className="text-2xl font-bold text-[var(--ink)]">Status ANPD</h2>
              </div>
            </div>
            {hasProcess ? (
              <div className="space-y-4">
                <div className="rounded-[24px] border border-[rgba(21,38,43,0.08)] bg-white/72 p-4">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-soft)]">Número do processo</p>
                  <div className="mt-2 text-lg font-bold text-[var(--ink)]">{processo.numeroProcesso}</div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className={`rounded-full px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] ${processo.statusComunicacao === "Arquivado" ? "bg-emerald-100 text-emerald-700" : processo.statusComunicacao === "Em análise pela ANPD" ? "bg-sky-100 text-sky-700" : "bg-amber-100 text-amber-700"}`}>
                    {processo.statusComunicacao || "Não comunicado"}
                  </span>
                  {nextDeadline && !nextDeadline.overdue && (
                    <span className="rounded-full bg-stone-100 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-stone-700">
                      Prazo restante: {formatCountdown(nextDeadline.diffHours)}
                    </span>
                  )}
                  {nextDeadline?.overdue && (
                    <span className="rounded-full bg-red-100 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-red-700">
                      Prazo vencido
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-[24px] border border-dashed border-[rgba(21,38,43,0.16)] bg-white/55 p-5">
                <p className="text-base font-semibold text-[var(--ink)]">
                  {hasAnpdData ? "Existe um processo ANPD iniciado, mas o número SEI ainda não foi preenchido." : "O processo ANPD ainda não foi iniciado neste ambiente de teste."}
                </p>
                <p className="mt-2 text-sm text-[var(--ink-soft)]">
                  A tela regulatória concentra o preenchimento do processo, status de comunicação e evidências relacionadas.
                </p>
              </div>
            )}
            <button
              onClick={() => navigate(isAdmin ? `/admin/cliente/${effectiveClientId}/anpd` : '/anpd')}
              className="btn-outline mt-5 flex items-center gap-2 rounded-full"
            >
              <ExternalLink size={14} /> Ver ANPD
            </button>
          </section>
        </div>

        <section className="app-panel mb-8 rounded-[30px] p-6 md:p-7">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="section-kicker">Scoreboard</p>
              <h2 className="text-2xl font-bold text-[var(--ink)]">Progresso geral do incidente</h2>
            </div>
            <span className={`rounded-full px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] ${scoreTone}`}>
              {globalScore}% consolidado
            </span>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <ProgressMeter label="Jornada" pct={jornadaPct} subtext="Atividades concluídas no fluxo principal." />
            <ProgressMeter label="Perguntas" pct={perguntasPct} subtext="Questionário preenchido com dados do incidente." />
            <ProgressMeter label="PMO" pct={pmoPct} subtext="Ações operacionais concluídas no acompanhamento." />
            <ProgressMeter label="Prazos" pct={prazosPct} subtext={sla.status === "critical" ? "SLA em estado crítico." : sla.status === "warning" ? "SLA pede acompanhamento." : "Sem alerta de prazo."} />
          </div>
        </section>

        <section className="app-panel overflow-hidden rounded-[30px]">
          <div className="soft-ribbon flex items-center justify-between gap-4 px-6 py-4">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/60">Timeline</p>
              <h2 className="text-xl font-bold text-white">Atividades recentes</h2>
            </div>
            <span className="rounded-full bg-white/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-white/72">
              Últimas {recent.length}
            </span>
          </div>
          <div className="divide-y divide-[rgba(21,38,43,0.08)]">
            {recent.map((activity) => {
              const style = STATUS_MAP[activity.status] || STATUS_MAP.Planejado;
              return (
                <div key={activity.id} className="flex flex-wrap items-center gap-4 px-6 py-4 transition-colors hover:bg-white/55">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-[var(--ink)]">{activity.nome}</div>
                    <div className="mt-1 font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--ink-soft)]">{activity.etapa}</div>
                  </div>
                  <span className={`rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] ${style.badge}`}>
                    {activity.status}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {showWelcome && !isAdmin && (
        <WelcomeModal clientId={effectiveClientId} clientName={info.nomeCliente} onClose={() => setShowWelcome(false)} />
      )}
    </Layout>
  );
}
