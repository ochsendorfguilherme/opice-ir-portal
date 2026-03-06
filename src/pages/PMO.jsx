import { useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import TabDashboard from '../components/pmo/TabDashboard';
import TabCLevel from '../components/pmo/TabCLevel';
import TabTimeline from '../components/pmo/TabTimeline';
import TabMatriz from '../components/pmo/TabMatriz';
import TabComms from '../components/pmo/TabComms';
import TabTerceiros from '../components/pmo/TabTerceiros';
import TabSLA from '../components/pmo/TabSLA';
import { getStorage, KEYS } from '../utils/storage';
import { AlertTriangle, BriefcaseBusiness, CalendarRange, LayoutDashboard, MessageSquareText, Network, ShieldAlert, TimerReset } from 'lucide-react';

const TABS = [
  {
    id: 'dashboard',
    label: 'Dashboard Executivo',
    description: 'Pulso geral do caso, contexto e atalhos do PMO.',
    icon: LayoutDashboard,
  },
  {
    id: 'clevel',
    label: 'Briefing executivo',
    description: 'Briefing executivo para diretoria e stakeholders.',
    icon: BriefcaseBusiness,
  },
  {
    id: 'timeline',
    label: 'Timeline Mestre',
    description: 'Registro cronológico das decisões e evidências.',
    icon: CalendarRange,
  },
  {
    id: 'matriz',
    label: 'Matriz de Ações',
    description: 'Execução operacional, bloqueios e próximos responsáveis.',
    icon: ShieldAlert,
  },
  {
    id: 'comms',
    label: 'Comms Log',
    description: 'Comunicações externas, aprovações e publicações.',
    icon: MessageSquareText,
  },
  {
    id: 'terceiros',
    label: 'Terceiros',
    description: 'Monitoramento de parceiros, POCs e SLAs combinados.',
    icon: Network,
  },
  {
    id: 'sla',
    label: 'SLA & Prazos',
    description: 'Marcos regulatórios, deadlines internos e alertas.',
    icon: TimerReset,
  },
];

const WORK_TABS = TABS.filter((tab) => tab.id !== 'clevel');

function StatPill({ label, value, tone = 'neutral' }) {
  const toneClass = {
    neutral: 'border-[rgba(21,38,43,0.1)] bg-white/70 text-[var(--ink)]',
    accent: 'border-[rgba(214,255,99,0.35)] bg-[rgba(214,255,99,0.16)] text-[var(--ink)]',
    danger: 'border-red-200 bg-red-50 text-red-700',
    warning: 'border-amber-200 bg-amber-50 text-amber-700',
  }[tone];

  return (
    <div className={`rounded-full border px-3 py-2 ${toneClass}`}>
      <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--ink-soft)]">{label}</div>
      <div className="font-syne text-lg font-bold leading-none">{value}</div>
    </div>
  );
}

export default function PMO({ clientId: propClientId, isAdmin = false, adminClientName, onAdminBack, initialTab }) {
  const { user } = useAuth();
  const effectiveClientId = propClientId || user?.clientId;
  const [activeTab, setActiveTab] = useState(initialTab || 'dashboard');

  const pmoData = getStorage(KEYS.pmo(effectiveClientId), {});
  const info = getStorage(KEYS.info(effectiveClientId), {});

  const summary = useMemo(() => {
    const actions = pmoData.actions || [];
    const comms = pmoData.commsLog || [];
    const terceiros = pmoData.terceiros || [];
    const timeline = pmoData.timeline || [];
    const now = new Date();
    const blocked = actions.filter((item) => item.status === 'Bloqueado').length;
    const overdue = actions.filter((item) => item.prazo && new Date(item.prazo) < now && item.status !== 'Feito').length;
    const briefingFilled = [pmoData.oQueHouve, pmoData.impacto, pmoData.oQueFazendo].filter((value) => String(value || '').trim()).length;
    const pendingLegal = comms.filter((item) => item.statusAprovacao === 'Pendente Jurídico').length;
    const activeThirdParties = terceiros.filter((item) => item.status !== 'Concluído').length;

    return {
      actionsOpen: actions.filter((item) => item.status !== 'Feito').length,
      blocked,
      overdue,
      briefingFilled,
      pendingLegal,
      activeThirdParties,
      timelineCount: timeline.length,
    };
  }, [pmoData]);

  const activeTabMeta = TABS.find((tab) => tab.id === activeTab) || TABS[0];
  const isBriefingRoute = activeTab === 'clevel';
  const heroTitle = isBriefingRoute ? 'Resumo C-Level' : 'Central de coordena\u00e7\u00e3o do caso';
  const heroDescription = isBriefingRoute
    ? 'Briefing executivo dedicado para diretoria e stakeholders, acessado diretamente pelo item lateral do PMO.'
    : 'Painel de PMO para coordenar execu\u00e7\u00e3o, narrativa executiva, marcos regulat\u00f3rios e parceiros no mesmo contexto operacional.';

  return (
    <Layout clientId={propClientId} isAdmin={isAdmin} adminClientName={adminClientName} onAdminBack={onAdminBack}>
      <div className="px-6 pb-10 pt-6 md:px-10 md:pt-10">
        {!isBriefingRoute && (
          <section className="mt-8">
            <div className="mb-3 flex items-center justify-between gap-4">
              <div>
                <div className="font-mono text-[11px] uppercase tracking-[0.26em] text-[var(--ink-soft)]">{'Navega\u00e7\u00e3o PMO'}</div>
                <h2 className="mt-2 font-syne text-2xl font-bold text-[var(--ink)]">Blocos de trabalho</h2>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6">
              {WORK_TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                const badge = tab.id === 'matriz'
                  ? summary.blocked + summary.overdue
                  : null;

                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`group rounded-[28px] border p-4 text-left transition-all ${isActive
                      ? 'border-[rgba(214,255,99,0.55)] bg-[linear-gradient(135deg,rgba(214,255,99,0.16),rgba(20,54,62,0.08))] shadow-[0_18px_36px_rgba(21,38,43,0.08)]'
                      : 'border-[rgba(21,38,43,0.08)] bg-white/72 hover:border-[rgba(21,38,43,0.16)] hover:bg-white'
                      }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl border ${isActive ? 'border-[rgba(214,255,99,0.4)] bg-[#173038] text-[var(--accent)]' : 'border-[rgba(21,38,43,0.08)] bg-white text-[var(--ink)]'}`}>
                        <Icon size={18} />
                      </div>
                      {badge !== null && (
                        <span className={`inline-flex min-w-7 items-center justify-center rounded-full px-2 py-1 font-mono text-[10px] uppercase tracking-[0.2em] ${tab.id === 'matriz' && badge > 0
                          ? 'bg-red-50 text-red-700'
                          : 'bg-[rgba(214,255,99,0.18)] text-[var(--ink)]'
                          }`}>
                          {badge}
                        </span>
                      )}
                    </div>
                    <div className="mt-4 font-syne text-lg font-bold text-[var(--ink)]">{tab.label}</div>
                    <p className="mt-2 line-clamp-3 text-sm leading-6 text-[var(--ink-soft)]">{tab.description}</p>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        <section className="app-panel relative overflow-hidden rounded-[36px] p-6 shadow-[0_24px_48px_rgba(21,38,43,0.08)] md:p-8">
          <div className="absolute inset-y-0 right-0 hidden w-1/3 bg-[radial-gradient(circle_at_top_right,rgba(214,255,99,0.22),transparent_62%)] lg:block" />
          <div className="relative grid gap-6 2xl:grid-cols-[minmax(0,1.5fr)_minmax(360px,0.9fr)]">
            <div>
              <div className="section-kicker mb-4">{isBriefingRoute ? 'Resumo executivo' : 'IR-PMO'}</div>
              <div className="flex flex-wrap items-end gap-4">
                <div>
                  <h1 className="font-syne text-4xl font-extrabold uppercase text-[var(--ink)] md:text-5xl">{heroTitle}</h1>
                  <p className="mt-3 max-w-3xl font-dm text-base leading-7 text-[var(--ink-soft)]">{heroDescription}</p>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <StatPill label="Cliente" value={info.nomeCliente || adminClientName || effectiveClientId || 'Caso ativo'} tone="accent" />
                <StatPill label="Ações abertas" value={summary.actionsOpen} tone={summary.actionsOpen > 0 ? 'warning' : 'neutral'} />
                <StatPill label="Bloqueios" value={summary.blocked} tone={summary.blocked > 0 ? 'danger' : 'neutral'} />
                <StatPill label="Marcos na timeline" value={summary.timelineCount} tone="neutral" />
              </div>
            </div>

            <div className="app-panel-dark rounded-[30px] p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-mono text-[11px] uppercase tracking-[0.28em] text-[var(--accent)]">{isBriefingRoute ? "Painel dedicado" : "Janela ativa"}</div>
                  <div className="mt-2 font-syne text-2xl font-bold text-white">{isBriefingRoute ? "Resumo executivo para diretoria" : activeTabMeta.label}</div>
                </div>
                {(summary.blocked > 0 || summary.overdue > 0) && (
                  <div className="inline-flex items-center gap-2 rounded-full border border-red-400/40 bg-red-500/15 px-3 py-1 text-red-200">
                    <AlertTriangle size={14} />
                    <span className="font-mono text-[11px] uppercase tracking-[0.18em]">{summary.blocked + summary.overdue} alertas</span>
                  </div>
                )}
              </div>

              <p className="mt-3 text-sm leading-6 text-[#d8e1e4]">{isBriefingRoute ? "Concentre narrativa, impacto, medidas em andamento e o encaminhamento executivo em um único ponto de leitura." : activeTabMeta.description}</p>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-[24px] border border-white/10 bg-white/6 p-4">
                  <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--ink-soft)]">{isBriefingRoute ? 'Completude do briefing' : 'Resumo executivo'}</div>
                  <div className="mt-2 font-syne text-3xl font-bold text-white">{summary.briefingFilled}/3</div>
                  <p className="mt-2 text-xs leading-5 text-[#c6d1d5]">{isBriefingRoute ? "Blocos prontos para leitura executiva e envio do resumo por e-mail." : "Blocos do briefing preenchidos para atualização de diretoria."}</p>
                </div>
                <div className="rounded-[24px] border border-white/10 bg-white/6 p-4">
                  <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--ink-soft)]">{isBriefingRoute ? 'Timeline mestre' : 'Comms pendentes'}</div>
                  <div className="mt-2 font-syne text-3xl font-bold text-white">{isBriefingRoute ? summary.timelineCount : summary.pendingLegal}</div>
                  <p className="mt-2 text-xs leading-5 text-[#c6d1d5]">{isBriefingRoute ? "Marcos já registrados para sustentar a narrativa cronológica do caso." : "Itens em validação jurídica ou aguardando disparo."}</p>
                </div>
                <div className="rounded-[24px] border border-white/10 bg-white/6 p-4">
                  <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--ink-soft)]">{isBriefingRoute ? "Comunicações pendentes" : "Terceiros ativos"}</div>
                  <div className="mt-2 font-syne text-3xl font-bold text-white">{isBriefingRoute ? summary.pendingLegal : summary.activeThirdParties}</div>
                  <p className="mt-2 text-xs leading-5 text-[#c6d1d5]">{isBriefingRoute ? "Itens em validação jurídica ou aguardando disparo externo." : "Parceiros ou forense ainda em acompanhamento."}</p>
                </div>
                <div className="rounded-[24px] border border-white/10 bg-white/6 p-4">
                  <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--ink-soft)]">{isBriefingRoute ? "Ações abertas" : "Ações vencidas"}</div>
                  <div className="mt-2 font-syne text-3xl font-bold text-white">{isBriefingRoute ? summary.actionsOpen : summary.overdue}</div>
                  <p className="mt-2 text-xs leading-5 text-[#c6d1d5]">{isBriefingRoute ? "Demandas operacionais ainda em curso que podem impactar o resumo executivo." : "Itens que exigem redistribuição ou reforço imediato."}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-8 app-panel rounded-[34px] p-5 shadow-[0_22px_44px_rgba(21,38,43,0.07)] md:p-6">
          {activeTab === 'dashboard' && <TabDashboard effectiveClientId={effectiveClientId} onNavigateTab={setActiveTab} />}
          {activeTab === 'clevel' && <TabCLevel effectiveClientId={effectiveClientId} />}
          {activeTab === 'timeline' && <TabTimeline effectiveClientId={effectiveClientId} />}
          {activeTab === 'matriz' && <TabMatriz effectiveClientId={effectiveClientId} />}
          {activeTab === 'comms' && <TabComms effectiveClientId={effectiveClientId} />}
          {activeTab === 'terceiros' && <TabTerceiros effectiveClientId={effectiveClientId} />}
          {activeTab === 'sla' && <TabSLA effectiveClientId={effectiveClientId} />}
        </section>
      </div>
    </Layout>
  );
}
