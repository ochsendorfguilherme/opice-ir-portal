import { ArrowLeft, ArrowRight, LogOut, ShieldAlert, TriangleAlert } from 'lucide-react';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import OpiceLogo from '../components/OpiceLogo';
import TLPBanner from '../components/TLPBanner';
import { fetchClients, getStorage, KEYS } from '../utils/storage';
import { businessDaysRemaining, formatCountdown } from '../utils/businessDays';

function ModuleStat({ label, value, helper, tone = 'neutral' }) {
  const tones = {
    neutral: 'border-[rgba(21,38,43,0.08)] bg-white/72',
    critical: 'border-red-200 bg-red-50/88',
    warning: 'border-amber-200 bg-amber-50/88',
    accent: 'border-[#c57d1f]/24 bg-[rgba(242,212,122,0.24)]',
  };
  return (
    <div className={`rounded-[24px] border p-5 ${tones[tone]}`}>
      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-soft)]">{label}</div>
      <div className="mt-3 font-syne text-3xl font-bold text-[var(--ink)]">{value}</div>
      <p className="mt-2 text-sm leading-6 text-[var(--ink-soft)]">{helper}</p>
    </div>
  );
}

export default function AdminRiskModule() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const summary = useMemo(() => {
    const clients = fetchClients();
    const now = new Date();
    const rows = clients.map((client) => {
      const info = getStorage(KEYS.info(client.id), {});
      const pmo = getStorage(KEYS.pmo(client.id), {});
      const actions = pmo.actions || [];
      const blocked = actions.filter((item) => item.status === 'Bloqueado').length;
      const overdue = actions.filter((item) => item.prazo && new Date(item.prazo) < now && item.status !== 'Feito').length;
      const anpd = info.dataConhecimento ? businessDaysRemaining(new Date(info.dataConhecimento), 3) : null;
      const riskLevel = blocked > 0 || overdue > 0 || anpd?.overdue ? 'Crítico' : anpd && anpd.diffHours < 48 ? 'Atenção' : 'Estável';
      return {
        id: client.id,
        name: client.displayName || client.name || client.id,
        blocked,
        overdue,
        anpd,
        riskLevel,
      };
    }).sort((a, b) => {
      const score = (item) => (item.riskLevel === 'Crítico' ? 3 : item.riskLevel === 'Atenção' ? 2 : 1);
      return score(b) - score(a);
    });

    return {
      rows,
      critical: rows.filter((item) => item.riskLevel === 'Crítico').length,
      attention: rows.filter((item) => item.riskLevel === 'Atenção').length,
      total: rows.length,
    };
  }, []);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(242,212,122,0.16),transparent_22%),linear-gradient(180deg,#f7f5ef_0%,#ece7dc_100%)] text-[var(--ink)]">
      <div className="mx-auto max-w-[1600px] px-5 pb-10 pt-5 md:px-8 md:pb-14 md:pt-6">
        <div className="rounded-[34px] border border-[rgba(21,38,43,0.1)] bg-[rgba(255,251,244,0.66)] px-4 py-3 shadow-[0_18px_42px_rgba(21,38,43,0.1)] backdrop-blur-[18px] md:px-5">
          <div className="flex flex-wrap items-center gap-4">
            <div className="min-w-0 flex-1"><TLPBanner /></div>
            <button onClick={() => navigate('/admin/modulos')} className="flex h-11 items-center gap-2 rounded-full border border-[rgba(21,38,43,0.12)] bg-white/78 px-4 font-dm text-xs font-semibold uppercase tracking-[0.16em] text-[#173038] shadow-[0_12px_24px_rgba(21,38,43,0.08)] transition-all hover:-translate-y-0.5 hover:bg-white"><ArrowLeft size={15} /> Módulos</button>
            <button onClick={() => { logout(); navigate('/login'); }} className="flex h-11 items-center gap-2 rounded-full border border-[rgba(21,38,43,0.12)] bg-white/78 px-4 font-dm text-xs font-semibold uppercase tracking-[0.16em] text-[#173038] shadow-[0_12px_24px_rgba(21,38,43,0.08)] transition-all hover:-translate-y-0.5 hover:bg-white"><LogOut size={15} /> Sair</button>
          </div>
        </div>

        <section className="mt-8 overflow-hidden rounded-[38px] border border-[#c57d1f]/18 bg-[linear-gradient(180deg,rgba(255,249,239,0.96)_0%,rgba(252,244,226,0.92)_100%)] p-7 shadow-[0_28px_64px_rgba(115,73,19,0.12)] md:p-9">
          <OpiceLogo />
          <p className="section-kicker mt-6">Módulo de riscos</p>
          <div className="mt-4 flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-4xl">
              <h1 className="font-syne text-4xl font-extrabold uppercase tracking-[-0.05em] text-[var(--ink)] md:text-6xl">Leitura executiva de exposição</h1>
              <p className="mt-4 font-dm text-base leading-7 text-[var(--ink-soft)] md:text-lg">Visão rápida dos casos que exigem intervenção por bloqueio, prazo regulatório ou concentração de pendências críticas.</p>
            </div>
            <div className="flex h-16 w-16 items-center justify-center rounded-[22px] bg-[rgba(197,125,31,0.14)] text-[#9f6618]"><ShieldAlert size={30} /></div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <ModuleStat label="Casos monitorados" value={summary.total} helper="Base ativa disponível para leitura de risco." />
            <ModuleStat label="Críticos" value={summary.critical} helper="Casos com bloqueio, atraso relevante ou ANPD vencida." />
            <ModuleStat label="Atenção" value={summary.attention} helper="Casos próximos do limite regulatório ou exigindo reforço." />
            <ModuleStat label="Ação recomendada" value={summary.rows[0]?.name || '—'} helper="Caso mais sensível no momento para revisão imediata." />
          </div>

          <div className="mt-8 rounded-[32px] border border-[#c57d1f]/16 bg-white/76 p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-soft)]">Fila prioritária</div>
                <h2 className="mt-2 font-syne text-2xl font-bold text-[var(--ink)]">Casos com maior exposição</h2>
              </div>
            </div>
            <div className="mt-5 space-y-3">
              {summary.rows.slice(0, 6).map((item) => (
                <div key={item.id} className="rounded-[24px] border border-[rgba(21,38,43,0.08)] bg-white px-4 py-4 shadow-[0_12px_28px_rgba(21,38,43,0.06)]">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <div className="font-syne text-xl font-bold text-[var(--ink)]">{item.name}</div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <span className={`rounded-full px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] ${item.riskLevel === 'Crítico' ? 'bg-red-50 text-red-700' : item.riskLevel === 'Atenção' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>{item.riskLevel}</span>
                        <span className="rounded-full bg-stone-100 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-stone-700">Bloqueios: {item.blocked}</span>
                        <span className="rounded-full bg-stone-100 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-stone-700">Atrasos: {item.overdue}</span>
                        {item.anpd && <span className={`rounded-full px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] ${item.anpd.overdue ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>ANPD: {item.anpd.overdue ? 'Vencido' : formatCountdown(item.anpd.diffHours)}</span>}
                      </div>
                    </div>
                    <button onClick={() => navigate('/admin')} className="inline-flex items-center gap-2 rounded-full bg-[#173038] px-4 py-3 font-dm text-sm font-semibold text-white shadow-[0_14px_28px_rgba(21,38,43,0.16)] transition-all hover:-translate-y-0.5">Abrir gestão de incidentes <ArrowRight size={16} /></button>
                  </div>
                </div>
              ))}
              {summary.rows.length === 0 && (
                <div className="rounded-[24px] border border-[rgba(21,38,43,0.08)] bg-white px-4 py-8 text-center text-[var(--ink-soft)]">Nenhum caso encontrado para leitura de risco.</div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
