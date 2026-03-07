import { ArrowRight, Building2, Fingerprint, Landmark, LogOut, ShieldAlert, ShieldCheck, Siren } from 'lucide-react';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import OpiceLogo from '../components/OpiceLogo';
import TLPBanner from '../components/TLPBanner';
import { fetchClients, getStorage, KEYS } from '../utils/storage';
import { businessDaysRemaining } from '../utils/businessDays';

const MODULES = [
  {
    id: 'incidentes',
    title: 'Gestão de Incidentes',
    description: 'Módulo para gestão, acompanhamento e resposta de incidentes, com acesso ao painel administrativo dos casos.',
    summaryShort: 'Casos, clientes e jornadas ativas em um único fluxo de resposta.',
    accent: 'from-[#173038] via-[#1f4f5d] to-[#d6ff63]',
    surface: 'bg-[linear-gradient(160deg,rgba(23,48,56,0.98)_0%,rgba(15,33,40,0.98)_100%)] text-white',
    summaryLabel: 'Casos ativos',
    route: '/admin',
    icon: Siren,
    buttonClass: 'bg-white text-[#173038]',
    badgeClass: 'border-white/12 bg-white/10 text-white/70',
    iconWrapClass: 'border-white/12 bg-white/10',
    cardGlow: 'bg-[radial-gradient(circle_at_top_right,rgba(214,255,99,0.18),transparent_40%)]',
  },
  {
    id: 'riscos',
    title: 'Módulo de Riscos',
    description: 'Leitura executiva de exposição, criticidade, marcos regulatórios e sinais de risco que exigem decisão rápida.',
    summaryShort: 'Alertas e exposições priorizados para leitura rápida da liderança.',
    accent: 'from-[#7e4d12] via-[#c57d1f] to-[#f2d47a]',
    surface: 'bg-[linear-gradient(160deg,rgba(73,46,15,0.98)_0%,rgba(132,80,20,0.98)_100%)] text-white',
    summaryLabel: 'Alertas de risco',
    route: '/admin/riscos',
    icon: ShieldAlert,
    buttonClass: 'bg-[#f2d47a] text-[#4f2f0a]',
    badgeClass: 'border-amber-200/30 bg-amber-100/12 text-amber-100',
    iconWrapClass: 'border-amber-200/30 bg-amber-100/12 text-[#f2d47a]',
    cardGlow: 'bg-[radial-gradient(circle_at_top_right,rgba(242,212,122,0.2),transparent_42%)]',
  },
  {
    id: 'terceiros',
    title: 'Módulo de Avaliação de Terceiro',
    description: 'Visão consolidada de terceiros e fornecedores em atuação, com foco em dependências, pendências e risco operacional.',
    summaryShort: 'Parceiros, fornecedores e pontos de dependência em acompanhamento.',
    accent: 'from-[#244b4b] via-[#2f7f7a] to-[#8de1cf]',
    surface: 'bg-[linear-gradient(160deg,rgba(23,55,57,0.98)_0%,rgba(36,110,106,0.97)_100%)] text-white',
    summaryLabel: 'Terceiros monitorados',
    route: '/admin/avaliacao-terceiro',
    icon: Building2,
    buttonClass: 'bg-[#8de1cf] text-[#123f3c]',
    badgeClass: 'border-teal-200/30 bg-teal-100/10 text-teal-100',
    iconWrapClass: 'border-teal-200/30 bg-teal-100/10 text-[#8de1cf]',
    cardGlow: 'bg-[radial-gradient(circle_at_top_right,rgba(141,225,207,0.2),transparent_42%)]',
  },
  {
    id: 'financeiro',
    title: 'Módulo Financeiro',
    description: 'Visão executiva de contratos, cobrança, faturamento recorrente e valores que ainda devem ser recebidos pela equipe.',
    summaryShort: 'Receitas, cobranças e valores em aberto para acompanhamento do Opice Blum.',
    accent: 'from-[#5f2345] via-[#8c3e6d] to-[#f0a9c4]',
    surface: 'bg-[linear-gradient(160deg,rgba(63,24,47,0.98)_0%,rgba(114,52,88,0.98)_100%)] text-white',
    summaryLabel: 'Frentes financeiras',
    route: '/admin/financeiro',
    icon: Landmark,
    buttonClass: 'bg-[#f6d3e2] text-[#4d1d39]',
    badgeClass: 'border-pink-200/30 bg-pink-100/12 text-pink-100',
    iconWrapClass: 'border-pink-200/30 bg-pink-100/12 text-[#ffd7e8]',
    cardGlow: 'bg-[radial-gradient(circle_at_top_right,rgba(240,169,196,0.2),transparent_42%)]',
  },
  {
    id: 'privacidade',
    title: 'Gestão de Privacidade',
    description: 'Painel executivo de tickets DPO, follow-up com clientes, comunicações e postura de privacidade no contexto ativo.',
    summaryShort: 'Solicitações de clientes, atualização direta por e-mail e gestão de atuação como encarregado.',
    accent: 'from-[#23365f] via-[#3452a4] to-[#b7c8ff]',
    surface: 'bg-[linear-gradient(160deg,rgba(24,37,72,0.98)_0%,rgba(45,68,132,0.98)_100%)] text-white',
    summaryLabel: 'Frentes de privacidade',
    route: '/admin/privacidade',
    icon: ShieldCheck,
    buttonClass: 'bg-[#dbe5ff] text-[#1f346a]',
    badgeClass: 'border-indigo-200/30 bg-indigo-100/10 text-indigo-100',
    iconWrapClass: 'border-indigo-200/30 bg-indigo-100/10 text-[#dbe5ff]',
    cardGlow: 'bg-[radial-gradient(circle_at_top_right,rgba(183,200,255,0.2),transparent_42%)]',
  },
  {
    id: 'forense',
    title: 'Módulo de Forense',
    description: 'Leitura técnica de cadeia de custódia, achados principais, logs suspeitos, IPs relevantes e estado do relatório técnico.',
    summaryShort: 'Evidências, IOC, hosts suspeitos e trilha técnica consolidados em uma frente dedicada.',
    accent: 'from-[#244362] via-[#4278a5] to-[#98d0ff]',
    surface: 'bg-[linear-gradient(160deg,rgba(23,44,66,0.98)_0%,rgba(45,87,126,0.98)_100%)] text-white',
    summaryLabel: 'Achados técnicos',
    route: '/admin/forense',
    icon: Fingerprint,
    buttonClass: 'bg-[#d5eaff] text-[#1c4267]',
    badgeClass: 'border-sky-200/30 bg-sky-100/10 text-sky-100',
    iconWrapClass: 'border-sky-200/30 bg-sky-100/10 text-[#d5eaff]',
    cardGlow: 'bg-[radial-gradient(circle_at_top_right,rgba(152,208,255,0.22),transparent_42%)]',
  },
];

function StatPill({ label, value }) {
  return (
    <div className="rounded-[22px] border border-[rgba(21,38,43,0.08)] bg-white/74 px-4 py-3 shadow-[0_10px_24px_rgba(21,38,43,0.05)]">
      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-soft)]">{label}</div>
      <div className="mt-1 font-syne text-xl font-bold text-[var(--ink)]">{value}</div>
    </div>
  );
}

function FlowStep({ step, title, description }) {
  return (
    <div className="rounded-[24px] border border-[rgba(21,38,43,0.08)] bg-white/72 p-4 shadow-[0_10px_24px_rgba(21,38,43,0.05)]">
      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-soft)]">Etapa {step}</div>
      <h3 className="mt-2 font-syne text-xl font-bold text-[var(--ink)]">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-[var(--ink-soft)]">{description}</p>
    </div>
  );
}

export default function AdminModulesHub() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const metrics = useMemo(() => {
    const clients = fetchClients();
    const now = new Date();
    let riskAlerts = 0;
    let monitoredThirdParties = 0;
    let financeFronts = 0;
    let privacyFronts = 0;
    let forensicFronts = 0;

    clients.forEach((client) => {
      const info = getStorage(KEYS.info(client.id), {});
      const pmo = getStorage(KEYS.pmo(client.id), {});
      const anpd = getStorage(KEYS.anpd(client.id), {});
      const archives = getStorage(KEYS.anpdFormArchives(client.id), []);
      const finance = getStorage(KEYS.finance(client.id), []);
      const privacyTickets = getStorage(KEYS.privacyRequests(client.id), []);
      const answers = getStorage(KEYS.answers(client.id), {});
      const actions = pmo.actions || [];
      const blocked = actions.some((item) => item.status === 'Bloqueado');
      const overdue = actions.some((item) => item.prazo && new Date(item.prazo) < now && item.status !== 'Feito');
      const anpdDeadline = info.dataConhecimento ? businessDaysRemaining(new Date(info.dataConhecimento), 3) : null;
      const thirdCount = (pmo.terceiros || []).length;
      const process = anpd.processo || {};

      if (blocked || overdue || anpdDeadline?.overdue || (anpdDeadline && anpdDeadline.diffHours < 48)) riskAlerts += 1;
      monitoredThirdParties += thirdCount;
      if (finance.length > 0) financeFronts += 1;
      if ((process.statusComunicacao && process.statusComunicacao !== 'Não comunicado') || archives.length > 0 || anpdDeadline || privacyTickets.length > 0) privacyFronts += 1;
      if (info?.ipSuspeito || answers?.sec2?.q4 || answers?.sec3?.q2 || answers?.sec4?.q1) forensicFronts += 1;
    });

    return {
      incidents: clients.length,
      risks: riskAlerts,
      third: monitoredThirdParties,
      finance: financeFronts,
      privacy: privacyFronts,
      forensic: forensicFronts,
    };
  }, []);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(214,255,99,0.14),transparent_24%),linear-gradient(180deg,#f7f5ef_0%,#ece7dc_100%)] text-[var(--ink)]">
      <div className="mx-auto max-w-[1560px] px-4 pb-10 pt-4 sm:px-6 md:px-8 md:pb-14 md:pt-5">
        <div className="rounded-[30px] border border-[rgba(21,38,43,0.1)] bg-[rgba(255,251,244,0.72)] px-4 py-3 shadow-[0_18px_42px_rgba(21,38,43,0.1)] backdrop-blur-[18px] sm:px-5">
          <div className="flex flex-wrap items-center gap-4">
            <div className="min-w-0 flex-1">
              <TLPBanner />
            </div>
            <button
              onClick={() => { logout(); navigate('/login'); }}
              className="flex h-11 items-center gap-2 rounded-full border border-[rgba(21,38,43,0.12)] bg-white/82 px-4 font-dm text-xs font-semibold uppercase tracking-[0.16em] text-[#173038] shadow-[0_12px_24px_rgba(21,38,43,0.08)] transition-all hover:-translate-y-0.5 hover:bg-white"
            >
              <LogOut size={15} /> Sair
            </button>
          </div>
        </div>

        <section className="mt-6 rounded-[34px] border border-[rgba(21,38,43,0.08)] bg-[rgba(255,251,244,0.8)] p-5 shadow-[0_28px_64px_rgba(21,38,43,0.12)] backdrop-blur-[8px] md:p-7 xl:p-8">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(300px,0.8fr)] xl:items-start">
            <div className="min-w-0">
              <OpiceLogo />
              <p className="section-kicker mt-5">Portal executivo</p>
              <h1 className="mt-3 max-w-4xl font-syne text-4xl font-extrabold uppercase tracking-[-0.05em] text-[var(--ink)] sm:text-5xl xl:text-[4.1rem] xl:leading-[0.94]">
                Escolha o módulo
                <br />
                de entrada
              </h1>
              <p className="mt-4 max-w-3xl font-dm text-base leading-7 text-[var(--ink-soft)] md:text-lg">
                Selecione por qual frente deseja começar. O conteúdo interno só é carregado depois da escolha do módulo.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <StatPill label="Administrador" value={user?.name || 'Admin'} />
              <StatPill label="Módulos" value="6 disponíveis" />
              <div className="rounded-[24px] border border-[rgba(21,38,43,0.08)] bg-white/72 p-4 shadow-[0_10px_24px_rgba(21,38,43,0.05)] sm:col-span-2 xl:col-span-1">
                <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-soft)]">Modo de uso</div>
                <p className="mt-3 text-sm leading-6 text-[var(--ink-soft)]">
                  Entre primeiro no módulo correto e carregue a operação detalhada somente quando precisar atuar naquela frente.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-7 grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {MODULES.map((module) => {
              const Icon = module.icon;
              const value = module.id === 'incidentes'
                ? metrics.incidents
                : module.id === 'riscos'
                  ? metrics.risks
                  : module.id === 'terceiros'
                    ? metrics.third
                    : module.id === 'financeiro'
                      ? metrics.finance
                      : module.id === 'forense'
                        ? metrics.forensic
                        : metrics.privacy;

              return (
                <article key={module.id} className={`relative flex min-h-[320px] flex-col overflow-hidden rounded-[30px] border border-white/10 p-5 shadow-[0_24px_48px_rgba(21,38,43,0.12)] ${module.surface}`}>
                  <div className={`pointer-events-none absolute inset-0 ${module.cardGlow}`} />
                  <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${module.accent}`} />

                  <div className="relative flex items-start justify-between gap-4">
                    <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] border ${module.iconWrapClass}`}>
                      <Icon size={24} />
                    </div>
                    <div className={`rounded-full border px-3 py-2 text-right font-mono text-[10px] uppercase tracking-[0.18em] ${module.badgeClass}`}>
                      {module.summaryLabel}
                    </div>
                  </div>

                  <div className="relative mt-5 min-w-0">
                    <h2 className="max-w-[18ch] font-syne text-[2rem] font-bold leading-[1.04] text-white">
                      {module.title}
                    </h2>
                    <p className="mt-4 text-sm leading-7 text-white/76">
                      {module.description}
                    </p>
                  </div>

                  <div className="relative mt-5 grid gap-3 sm:grid-cols-[140px_minmax(0,1fr)]">
                    <div className="rounded-[22px] border border-white/10 bg-white/8 p-4">
                      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/60">Indicador</div>
                      <div className="mt-2 font-syne text-4xl font-bold text-white">{value}</div>
                    </div>
                    <div className="rounded-[22px] border border-white/8 bg-white/6 p-4">
                      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/55">Leitura rápida</div>
                      <p className="mt-2 text-sm leading-6 text-white/72">
                        {module.summaryShort}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => navigate(module.route)}
                    className={`relative mt-5 inline-flex items-center justify-center gap-2 self-start rounded-full px-5 py-3 font-dm text-sm font-semibold shadow-[0_14px_28px_rgba(0,0,0,0.18)] transition-all hover:-translate-y-0.5 ${module.buttonClass}`}
                  >
                    Entrar no módulo
                    <ArrowRight size={16} />
                  </button>
                </article>
              );
            })}
          </div>
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-3">
          <FlowStep step="1" title="Escolha a frente" description="Selecione o módulo que melhor representa a sua próxima decisão ou análise executiva." />
          <FlowStep step="2" title="Entre no detalhe" description="O sistema só carrega os dados operacionais completos depois da escolha da frente certa." />
          <FlowStep step="3" title="Atue com contexto" description="Cada módulo preserva o comportamento atual e mantém navegação dedicada para aquela visão." />
        </section>
      </div>
    </div>
  );
}
