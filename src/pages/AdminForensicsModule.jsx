import { ArrowLeft, ArrowRight, Fingerprint, FileSearch, LogOut, Shield, Waypoints } from 'lucide-react';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import OpiceLogo from '../components/OpiceLogo';
import TLPBanner from '../components/TLPBanner';
import { fetchClients, getStorage, KEYS } from '../utils/storage';

function ModuleStat({ label, value, helper, tone = 'neutral' }) {
  const tones = {
    neutral: 'border-[rgba(21,38,43,0.08)] bg-white/72',
    accent: 'border-[#467fb3]/20 bg-[rgba(152,208,255,0.22)]',
    active: 'border-sky-200 bg-sky-50/82',
    pending: 'border-indigo-200 bg-indigo-50/82',
  };

  return (
    <div className={`rounded-[24px] border p-5 ${tones[tone]}`}>
      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-soft)]">{label}</div>
      <div className="mt-3 font-syne text-3xl font-bold text-[var(--ink)]">{value}</div>
      <p className="mt-2 text-sm leading-6 text-[var(--ink-soft)]">{helper}</p>
    </div>
  );
}

export default function AdminForensicsModule() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const summary = useMemo(() => {
    const rows = [];
    fetchClients().forEach((client) => {
      const info = getStorage(KEYS.info(client.id), {});
      const pmo = getStorage(KEYS.pmo(client.id), {});
      const questions = getStorage(KEYS.answers(client.id), {});
      const crisis = getStorage(KEYS.crisis(client.id, 'active'));
      const logs = [
        info?.ipSuspeito,
        questions?.sec2?.q4,
        questions?.sec3?.q2,
        questions?.sec4?.q1,
      ].filter(Boolean);

      rows.push({
        clientId: client.id,
        clientName: info?.nomeCliente || client.displayName || client.name || client.id,
        status: crisis?.crisisActive ? 'Coleta ativa' : 'Em análise',
        chain: Boolean(pmo?.executiveSummary || logs.length),
        suspicious: logs.flatMap((value) => String(value).match(/\b\d{1,3}(?:\.\d{1,3}){3}\b/g) || []).slice(0, 4),
        reportState: pmo?.executiveSummary ? 'Rascunho técnico disponível' : 'Aguardando consolidação',
      });
    });

    const active = rows.filter((item) => item.status === 'Coleta ativa').length;
    const withChain = rows.filter((item) => item.chain).length;
    const suspiciousIps = rows.reduce((sum, item) => sum + item.suspicious.length, 0);
    return { rows, active, withChain, suspiciousIps };
  }, []);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(152,208,255,0.18),transparent_22%),linear-gradient(180deg,#f7f5ef_0%,#ece7dc_100%)] text-[var(--ink)]">
      <div className="mx-auto max-w-[1600px] px-4 pb-10 pt-4 sm:px-6 md:px-8 md:pb-14 md:pt-6">
        <div className="rounded-[34px] border border-[rgba(21,38,43,0.1)] bg-[rgba(255,251,244,0.66)] px-4 py-3 shadow-[0_18px_42px_rgba(21,38,43,0.1)] backdrop-blur-[18px] md:px-5">
          <div className="flex flex-wrap items-center gap-4">
            <div className="min-w-0 flex-1"><TLPBanner /></div>
            <button onClick={() => navigate('/admin/modulos')} className="flex h-11 items-center gap-2 rounded-full border border-[rgba(21,38,43,0.12)] bg-white/78 px-4 font-dm text-xs font-semibold uppercase tracking-[0.16em] text-[#173038] shadow-[0_12px_24px_rgba(21,38,43,0.08)] transition-all hover:-translate-y-0.5 hover:bg-white"><ArrowLeft size={15} /> Módulos</button>
            <button onClick={() => { logout(); navigate('/login'); }} className="flex h-11 items-center gap-2 rounded-full border border-[rgba(21,38,43,0.12)] bg-white/78 px-4 font-dm text-xs font-semibold uppercase tracking-[0.16em] text-[#173038] shadow-[0_12px_24px_rgba(21,38,43,0.08)] transition-all hover:-translate-y-0.5 hover:bg-white"><LogOut size={15} /> Sair</button>
          </div>
        </div>

        <section className="mt-8 overflow-hidden rounded-[38px] border border-[#467fb3]/16 bg-[linear-gradient(180deg,rgba(244,249,255,0.96)_0%,rgba(235,244,252,0.94)_100%)] p-7 shadow-[0_28px_64px_rgba(33,81,122,0.12)] md:p-9">
          <OpiceLogo />
          <p className="section-kicker mt-6">Módulo de forense</p>
          <div className="mt-4 flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-4xl">
              <h1 className="font-syne text-4xl font-extrabold uppercase tracking-[-0.05em] text-[var(--ink)] md:text-6xl">Forense e evidências</h1>
              <p className="mt-4 font-dm text-base leading-7 text-[var(--ink-soft)] md:text-lg">Painel executivo para cadeia de custódia, achados técnicos, logs suspeitos, principais IPs e consolidação do relatório técnico do incidente.</p>
            </div>
            <div className="flex h-16 w-16 items-center justify-center rounded-[22px] bg-[rgba(70,127,179,0.14)] text-[#2d5f8b]"><Fingerprint size={30} /></div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <ModuleStat label="Casos forenses" value={summary.rows.length} helper="Clientes com contexto pericial disponível para leitura executiva." tone="accent" />
            <ModuleStat label="Coleta ativa" value={summary.active} helper="Casos em preservação e captura de evidências neste momento." tone="active" />
            <ModuleStat label="Cadeia registrada" value={summary.withChain} helper="Casos com rastreabilidade mínima de custódia ou briefing técnico." tone="pending" />
            <ModuleStat label="IPs suspeitos" value={summary.suspiciousIps} helper="Ocorrências destacadas a partir de respostas, logs e registros já existentes." />
          </div>

          <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <div className="rounded-[32px] border border-[#467fb3]/16 bg-white/80 p-5 shadow-[0_12px_28px_rgba(21,38,43,0.06)]">
              <div className="flex items-center gap-3 text-[#2d5f8b]"><Shield size={18} /><span className="font-mono text-[11px] uppercase tracking-[0.22em]">Cadeia de custódia</span></div>
              <h2 className="mt-2 font-syne text-2xl font-bold text-[var(--ink)]">Boas práticas e checkpoints</h2>
              <div className="mt-5 space-y-3">
                {[
                  'Registrar origem, coleta e guarda da evidência.',
                  'Relacionar artefatos, hashes, horários e responsáveis.',
                  'Manter vínculo entre achado técnico e impacto do caso.',
                ].map((item) => (
                  <div key={item} className="rounded-[22px] border border-[rgba(21,38,43,0.08)] bg-white px-4 py-4 text-sm leading-6 text-[var(--ink-soft)] shadow-[0_10px_24px_rgba(21,38,43,0.05)]">
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[32px] border border-[#467fb3]/16 bg-white/80 p-5 shadow-[0_12px_28px_rgba(21,38,43,0.06)]">
              <div className="flex items-center gap-3 text-[#2d5f8b]"><FileSearch size={18} /><span className="font-mono text-[11px] uppercase tracking-[0.22em]">Achados principais</span></div>
              <h2 className="mt-2 font-syne text-2xl font-bold text-[var(--ink)]">Logs e evidências suspeitas</h2>
              <div className="mt-5 space-y-3">
                {summary.rows.slice(0, 8).map((item, index) => (
                  <div key={`${item.clientId}-${index}`} className="rounded-[24px] border border-[rgba(21,38,43,0.08)] bg-white px-4 py-4 shadow-[0_12px_28px_rgba(21,38,43,0.06)]">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <div className="font-syne text-xl font-bold text-[var(--ink)]">{item.clientName}</div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <span className="rounded-full bg-sky-50 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-sky-700">{item.status}</span>
                          <span className="rounded-full bg-stone-100 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-stone-700">{item.reportState}</span>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {item.suspicious.length > 0 ? item.suspicious.map((ip) => (
                            <span key={ip} className="rounded-full bg-[rgba(152,208,255,0.22)] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-[#2d5f8b]">
                              {ip}
                            </span>
                          )) : <span className="text-sm text-[var(--ink-soft)]">Nenhum IP suspeito destacado ainda.</span>}
                        </div>
                      </div>
                      <button onClick={() => navigate(`/admin/cliente/${item.clientId}/dashboard`)} className="inline-flex items-center gap-2 rounded-full bg-[#173038] px-4 py-3 font-dm text-sm font-semibold text-white shadow-[0_14px_28px_rgba(21,38,43,0.16)] transition-all hover:-translate-y-0.5">Abrir caso <ArrowRight size={16} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <div className="rounded-[28px] border border-[#467fb3]/16 bg-white/76 p-5">
              <div className="flex items-center gap-3 text-[#2d5f8b]"><Waypoints size={18} /><span className="font-mono text-[11px] uppercase tracking-[0.22em]">Leitura sugerida</span></div>
              <p className="mt-3 text-sm leading-6 text-[var(--ink-soft)]">Use este módulo para consolidar cadeia de custódia, logs relevantes, hosts suspeitos, principais evidências e o estado do relatório técnico que sustenta a conclusão pericial.</p>
            </div>
            <div className="rounded-[28px] border border-[#467fb3]/16 bg-white/76 p-5">
              <div className="flex items-center gap-3 text-[#2d5f8b]"><FileSearch size={18} /><span className="font-mono text-[11px] uppercase tracking-[0.22em]">Ação rápida</span></div>
              <p className="mt-3 text-sm leading-6 text-[var(--ink-soft)]">Ao identificar um novo IOC, entre no caso para registrar o achado, amarrar a evidência ao contexto da reunião e alinhar o relatório técnico com PMO, ANPD e War Room.</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
