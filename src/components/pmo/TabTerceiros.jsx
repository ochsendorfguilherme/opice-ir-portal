import { useEffect, useMemo, useState } from 'react';
import { getStorage, setStorage, KEYS } from '../../utils/storage';
import { AlertTriangle, Plus, ShieldCheck, Trash2, UserRound } from 'lucide-react';

const STATUS_OPTS = ['Aguardando', 'Notificado', 'Em análise', 'Ação em curso', 'Concluído', 'Inadimplente'];
const STATUS_STYLE = {
  Aguardando: 'border-[rgba(21,38,43,0.08)] bg-white/70 text-[var(--ink-soft)]',
  Notificado: 'border-blue-200 bg-blue-50 text-blue-700',
  'Em análise': 'border-amber-200 bg-amber-50 text-amber-700',
  'Ação em curso': 'border-violet-200 bg-violet-50 text-violet-700',
  Concluído: 'border-green-200 bg-green-50 text-green-700',
  Inadimplente: 'border-red-200 bg-red-50 text-red-700',
};
const EMPTY_FORM = { parceiro: '', poc: '', contato: '', horaNotificacao: '', protocoloSLA: '', status: 'Aguardando', descricaoAcao: '', risco: '' };

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

function getSLAStatus(item, currentTime) {
  if (!item.horaNotificacao || !item.protocoloSLA) return null;
  const elapsed = (currentTime - new Date(item.horaNotificacao)) / (1000 * 60 * 60);
  const limit = parseFloat(item.protocoloSLA);
  if (Number.isNaN(limit)) return null;
  return { elapsed: elapsed.toFixed(1), limit, overdue: elapsed > limit };
}

export default function TabTerceiros({ effectiveClientId }) {
  const [terceiros, setTerceiros] = useState(() => getStorage(KEYS.pmo(effectiveClientId), {}).terceiros || []);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [currentTime, setCurrentTime] = useState(() => 0);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);


  const saveTerceiros = (next) => {
    const pmoData = getStorage(KEYS.pmo(effectiveClientId), {});
    setStorage(KEYS.pmo(effectiveClientId), { ...pmoData, terceiros: next });
    setTerceiros(next);
  };

  const add = () => {
    if (!form.parceiro.trim()) return;
    saveTerceiros([{ id: Date.now(), ...form }, ...terceiros]);
    setForm(EMPTY_FORM);
    setShowForm(false);
  };

  const summary = useMemo(() => {
    const active = terceiros.filter((item) => item.status !== 'Concluído').length;
    const overdue = terceiros.filter((item) => getSLAStatus(item, currentTime)?.overdue).length;
    const notified = terceiros.filter((item) => item.status === 'Notificado' || item.status === 'Ação em curso').length;
    const riskHigh = terceiros.filter((item) => String(item.risco || '').trim()).length;
    return { active, overdue, notified, riskHigh };
  }, [currentTime, terceiros]);

  const inputClass = 'w-full rounded-[20px] border border-[rgba(21,38,43,0.08)] bg-white px-4 py-3 text-sm text-[var(--ink)] focus:border-[rgba(21,38,43,0.18)] focus:outline-none';

  return (
    <div className="space-y-6">
      <section className="grid gap-6 2xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.95fr)]">
        <div className="app-panel-dark rounded-[32px] p-6 shadow-[0_22px_44px_rgba(21,38,43,0.12)]">
          <div className="flex items-center gap-2 text-[var(--accent)]"><ShieldCheck size={14} /><span className="font-mono text-[11px] uppercase tracking-[0.28em]">Dependências externas</span></div>
          <h2 className="mt-3 font-syne text-3xl font-bold text-white md:text-4xl">Monitoramento de terceiros</h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-[#d7e0e3]">
            Acompanhe fornecedores, POCs e protocolos de SLA em um único lugar para reduzir gargalos de resposta e cobrança.
          </p>
          <div className="mt-6 rounded-[24px] border border-amber-400/30 bg-amber-500/10 p-4 text-sm leading-7 text-amber-100">
            Correspondentes com protocolo de 1 hora ou obrigação crítica devem ficar em observação contínua até confirmação formal.
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-1">
          <SummaryCard label="Ativos" value={summary.active} helper="Parceiros ainda sem conclusão formal." />
          <SummaryCard label="SLA vencido" value={summary.overdue} helper="Itens ultrapassando o protocolo combinado." tone={summary.overdue > 0 ? 'danger' : 'neutral'} />
          <SummaryCard label="Em contato" value={summary.notified} helper="Terceiros já notificados ou em execução." tone={summary.notified > 0 ? 'warning' : 'neutral'} />
        </div>
      </section>

      <section className="app-panel rounded-[30px] p-5 shadow-[0_18px_36px_rgba(21,38,43,0.06)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--ink-soft)]">Console</div>
            <h3 className="mt-2 font-syne text-2xl font-bold text-[var(--ink)]">Cadastro e cobrança</h3>
          </div>
          <button onClick={() => setShowForm((current) => !current)} className="btn-primary inline-flex items-center gap-2 px-4 py-2 text-[11px] uppercase tracking-[0.18em]">
            Adicionar terceiro <Plus size={13} />
          </button>
        </div>

        {showForm && (
          <div className="mt-5 rounded-[28px] border border-[rgba(21,38,43,0.08)] bg-white/78 p-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--ink-soft)]">Parceiro</label>
                <input type="text" value={form.parceiro} onChange={(event) => setForm((current) => ({ ...current, parceiro: event.target.value }))} className={inputClass} />
              </div>
              <div>
                <label className="mb-2 block font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--ink-soft)]">POC</label>
                <input type="text" value={form.poc} onChange={(event) => setForm((current) => ({ ...current, poc: event.target.value }))} className={inputClass} />
              </div>
              <div>
                <label className="mb-2 block font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--ink-soft)]">Contato</label>
                <input type="text" value={form.contato} onChange={(event) => setForm((current) => ({ ...current, contato: event.target.value }))} className={inputClass} />
              </div>
              <div>
                <label className="mb-2 block font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--ink-soft)]">Hora de notificação</label>
                <input type="datetime-local" value={form.horaNotificacao} onChange={(event) => setForm((current) => ({ ...current, horaNotificacao: event.target.value }))} className={inputClass} />
              </div>
              <div>
                <label className="mb-2 block font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--ink-soft)]">Protocolo SLA (horas)</label>
                <input type="number" value={form.protocoloSLA} onChange={(event) => setForm((current) => ({ ...current, protocoloSLA: event.target.value }))} className={inputClass} placeholder="Ex.: 1" />
              </div>
              <div>
                <label className="mb-2 block font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--ink-soft)]">Status</label>
                <select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))} className={inputClass}>
                  {STATUS_OPTS.map((status) => <option key={status}>{status}</option>)}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="mb-2 block font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--ink-soft)]">Ação em curso</label>
                <input type="text" value={form.descricaoAcao} onChange={(event) => setForm((current) => ({ ...current, descricaoAcao: event.target.value }))} className={inputClass} placeholder="Descreva a cobrança, coleta ou ação combinada" />
              </div>
              <div className="md:col-span-2">
                <label className="mb-2 block font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--ink-soft)]">Risco ou impacto</label>
                <input type="text" value={form.risco} onChange={(event) => setForm((current) => ({ ...current, risco: event.target.value }))} className={inputClass} placeholder="Ex.: fornecedor crítico para restauração, risco de atraso jurídico" />
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <button onClick={() => setShowForm(false)} className="btn-outline px-4 py-2 text-[11px] uppercase tracking-[0.18em]">Cancelar</button>
              <button onClick={add} className="btn-primary px-4 py-2 text-[11px] uppercase tracking-[0.18em]">Salvar parceiro</button>
            </div>
          </div>
        )}
      </section>

      <section className="space-y-4">
        {terceiros.length === 0 ? (
          <div className="rounded-[30px] border border-dashed border-[rgba(21,38,43,0.12)] bg-white/76 p-10 text-center text-sm leading-7 text-[var(--ink-soft)]">
            Nenhum terceiro registrado ainda.
          </div>
        ) : (
          terceiros.map((item) => {
            const sla = getSLAStatus(item, currentTime);
            return (
              <article key={item.id} className={`rounded-[30px] border p-5 shadow-[0_14px_28px_rgba(21,38,43,0.05)] ${sla?.overdue || item.status === 'Inadimplente' ? 'border-red-200 bg-red-50/60' : 'border-[rgba(21,38,43,0.08)] bg-white/82'}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-syne text-2xl font-bold text-[var(--ink)]">{item.parceiro}</h3>
                      <span className={`rounded-full border px-3 py-1 font-mono text-[11px] uppercase tracking-[0.18em] ${STATUS_STYLE[item.status]}`}>{item.status}</span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-4 text-sm text-[var(--ink-soft)]">
                      <span className="inline-flex items-center gap-2"><UserRound size={14} /> {item.poc || 'POC não informado'}</span>
                      <span>{item.contato || 'Contato não informado'}</span>
                    </div>
                  </div>
                  <button onClick={() => saveTerceiros(terceiros.filter((entry) => entry.id !== item.id))} className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-red-700 hover:bg-red-100">
                    Excluir <Trash2 size={13} />
                  </button>
                </div>

                <div className="mt-5 grid gap-4 2xl:grid-cols-[minmax(0,1.15fr)_minmax(300px,0.85fr)]">
                  <div>
                    {item.descricaoAcao && <p className="text-sm leading-7 text-[var(--ink)]">{item.descricaoAcao}</p>}
                    {item.risco && <div className="mt-4 rounded-[22px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-7 text-amber-800">Risco/impacto: {item.risco}</div>}
                  </div>

                  <div className="rounded-[24px] border border-[rgba(21,38,43,0.08)] bg-[#f9faf6] p-4">
                    <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--ink-soft)]">Monitoramento</div>
                    <div className="mt-4 space-y-3 text-sm text-[var(--ink)]">
                      <div><strong>Hora da notificação:</strong> {item.horaNotificacao ? item.horaNotificacao.replace('T', ' ') : 'Não registrada'}</div>
                      <div><strong>Protocolo:</strong> {item.protocoloSLA ? `${item.protocoloSLA}h` : 'Não definido'}</div>
                      {sla ? (
                        <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-[11px] uppercase tracking-[0.18em] ${sla.overdue ? 'border-red-200 bg-red-50 text-red-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>
                          {sla.overdue && <AlertTriangle size={13} />}
                          SLA {sla.elapsed}h / {sla.limit}h
                        </div>
                      ) : (
                        <div className="text-[var(--ink-soft)]">Defina notificação e SLA para acompanhar a contagem.</div>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            );
          })
        )}
      </section>
    </div>
  );
}
