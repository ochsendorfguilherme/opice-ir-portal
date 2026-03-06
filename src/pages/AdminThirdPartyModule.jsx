import { ArrowLeft, ArrowRight, Building2, LogOut, Network, ShieldAlert } from 'lucide-react';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import OpiceLogo from '../components/OpiceLogo';
import TLPBanner from '../components/TLPBanner';
import { fetchClients, getStorage, KEYS } from '../utils/storage';

function ModuleStat({ label, value, helper, tone = 'neutral' }) {
  const tones = {
    neutral: 'border-[rgba(21,38,43,0.08)] bg-white/72',
    active: 'border-teal-200 bg-teal-50/82',
    pending: 'border-cyan-200 bg-cyan-50/82',
    accent: 'border-[#2f7f7a]/20 bg-[rgba(141,225,207,0.24)]',
  };
  return (
    <div className={`rounded-[24px] border p-5 ${tones[tone]}`}>
      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-soft)]">{label}</div>
      <div className="mt-3 font-syne text-3xl font-bold text-[var(--ink)]">{value}</div>
      <p className="mt-2 text-sm leading-6 text-[var(--ink-soft)]">{helper}</p>
    </div>
  );
}

export default function AdminThirdPartyModule() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const summary = useMemo(() => {
    const rows = [];
    fetchClients().forEach((client) => {
      const pmo = getStorage(KEYS.pmo(client.id), {});
      (pmo.terceiros || []).forEach((item) => {
        rows.push({
          clientId: client.id,
          clientName: client.displayName || client.name || client.id,
          name: item.nome || item.fornecedor || 'Terceiro',
          status: item.status || 'Em acompanhamento',
          owner: item.responsavel || item.owner || 'PMO',
          sla: item.sla || item.prazo || null,
          dependency: item.criticidade || item.classificacao || 'Dependencia operacional',
        });
      });
    });

    return {
      rows,
      active: rows.filter((item) => item.status !== 'Concluido').length,
      pending: rows.filter((item) => String(item.status).toLowerCase().includes('pend')).length,
      critical: rows.filter((item) => String(item.status).toLowerCase().includes('crit') || String(item.status).toLowerCase().includes('atras')).length,
    };
  }, []);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(141,225,207,0.16),transparent_22%),linear-gradient(180deg,#f7f5ef_0%,#ece7dc_100%)] text-[var(--ink)]">
      <div className="mx-auto max-w-[1600px] px-5 pb-10 pt-5 md:px-8 md:pb-14 md:pt-6">
        <div className="rounded-[34px] border border-[rgba(21,38,43,0.1)] bg-[rgba(255,251,244,0.66)] px-4 py-3 shadow-[0_18px_42px_rgba(21,38,43,0.1)] backdrop-blur-[18px] md:px-5">
          <div className="flex flex-wrap items-center gap-4">
            <div className="min-w-0 flex-1"><TLPBanner /></div>
            <button onClick={() => navigate('/admin/modulos')} className="flex h-11 items-center gap-2 rounded-full border border-[rgba(21,38,43,0.12)] bg-white/78 px-4 font-dm text-xs font-semibold uppercase tracking-[0.16em] text-[#173038] shadow-[0_12px_24px_rgba(21,38,43,0.08)] transition-all hover:-translate-y-0.5 hover:bg-white"><ArrowLeft size={15} /> {'M\u00f3dulos'}</button>
            <button onClick={() => { logout(); navigate('/login'); }} className="flex h-11 items-center gap-2 rounded-full border border-[rgba(21,38,43,0.12)] bg-white/78 px-4 font-dm text-xs font-semibold uppercase tracking-[0.16em] text-[#173038] shadow-[0_12px_24px_rgba(21,38,43,0.08)] transition-all hover:-translate-y-0.5 hover:bg-white"><LogOut size={15} /> Sair</button>
          </div>
        </div>

        <section className="mt-8 overflow-hidden rounded-[38px] border border-[#2f7f7a]/16 bg-[linear-gradient(180deg,rgba(244,252,250,0.96)_0%,rgba(236,248,246,0.94)_100%)] p-7 shadow-[0_28px_64px_rgba(24,83,80,0.12)] md:p-9">
          <OpiceLogo />
          <p className="section-kicker mt-6">{'Avalia\u00e7\u00e3o de terceiro'}</p>
          <div className="mt-4 flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-4xl">
              <h1 className="font-syne text-4xl font-extrabold uppercase tracking-[-0.05em] text-[var(--ink)] md:text-6xl">{'Supply Chain Risk Management (C-SCRM)'}</h1>
              <p className="mt-4 font-dm text-base leading-7 text-[var(--ink-soft)] md:text-lg">{'Leitura consolidada de fornecedores, parceiros e depend\u00eancias cr\u00edticas, com foco em risco de supply chain, follow-up e postura de continuidade.'}</p>
            </div>
            <div className="flex h-16 w-16 items-center justify-center rounded-[22px] bg-[rgba(47,127,122,0.14)] text-[#1e6d67]"><Building2 size={30} /></div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <ModuleStat label={'Terceiros monitorados'} value={summary.rows.length} helper={'Base registrada para leitura de risco na cadeia de suprimentos.'} tone="accent" />
            <ModuleStat label={'Dependencias ativas'} value={summary.active} helper={'Itens ainda em acompanhamento operacional ou contratual.'} tone="active" />
            <ModuleStat label={'Pendencias de follow-up'} value={summary.pending} helper={'Demandas aguardando retorno, ajuste ou complemento.'} tone="pending" />
            <ModuleStat label={'Alertas criticos'} value={summary.critical} helper={'Terceiros com sinal de criticidade, atraso ou travamento.'} />
          </div>

          <div className="mt-8 rounded-[32px] border border-[#2f7f7a]/16 bg-white/78 p-5">
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-soft)]">{'Radar C-SCRM'}</div>
            <h2 className="mt-2 font-syne text-2xl font-bold text-[var(--ink)]">{'Fornecedores e parceiros acompanhados'}</h2>
            <div className="mt-5 space-y-3">
              {summary.rows.slice(0, 8).map((item, index) => (
                <div key={`${item.clientId}-${item.name}-${index}`} className="rounded-[24px] border border-[rgba(21,38,43,0.08)] bg-white px-4 py-4 shadow-[0_12px_28px_rgba(21,38,43,0.06)]">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <div className="font-syne text-xl font-bold text-[var(--ink)]">{item.name}</div>
                      <p className="mt-2 text-sm leading-6 text-[var(--ink-soft)]">{item.clientName} {'\u2022'} {'Respons\u00e1vel:'} {item.owner}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="rounded-full bg-[rgba(141,225,207,0.2)] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-[#1c6660]">{item.status}</span>
                        <span className="rounded-full bg-cyan-50 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-800">{item.dependency}</span>
                        {item.sla ? <span className="rounded-full bg-stone-100 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-stone-700">{'SLA: '}{item.sla}</span> : null}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => navigate('/admin')} className="inline-flex items-center gap-2 rounded-full bg-[#173038] px-4 py-3 font-dm text-sm font-semibold text-white shadow-[0_14px_28px_rgba(21,38,43,0.16)] transition-all hover:-translate-y-0.5">{'Abrir gest\u00e3o de incidentes'} <ArrowRight size={16} /></button>
                    </div>
                  </div>
                </div>
              ))}
              {summary.rows.length === 0 && (
                <div className="rounded-[24px] border border-[rgba(21,38,43,0.08)] bg-white px-4 py-8 text-center text-[var(--ink-soft)]">{'Nenhum terceiro registrado ainda no acompanhamento C-SCRM.'}</div>
              )}
            </div>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <div className="rounded-[28px] border border-[#2f7f7a]/16 bg-white/76 p-5">
              <div className="flex items-center gap-3 text-[#1e6d67]"><Network size={18} /><span className="font-mono text-[11px] uppercase tracking-[0.22em]">{'Leitura sugerida'}</span></div>
              <p className="mt-3 text-sm leading-6 text-[var(--ink-soft)]">{'Use este m\u00f3dulo para entender depend\u00eancias externas, risco de supply chain e pontos de falha que exigem refor\u00e7o operacional ou contratual.'}</p>
            </div>
            <div className="rounded-[28px] border border-[#2f7f7a]/16 bg-white/76 p-5">
              <div className="flex items-center gap-3 text-[#1e6d67]"><ShieldAlert size={18} /><span className="font-mono text-[11px] uppercase tracking-[0.22em]">{'A\u00e7\u00e3o r\u00e1pida'}</span></div>
              <p className="mt-3 text-sm leading-6 text-[var(--ink-soft)]">{'Ao identificar um terceiro cr\u00edtico, entre no caso para alinhar depend\u00eancias, pend\u00eancias e medidas de continuidade sem perder o contexto operacional.'}</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}