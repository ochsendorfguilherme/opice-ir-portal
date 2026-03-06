import { useMemo, useState } from 'react';
import { getStorage, setStorage, KEYS } from '../../utils/storage';
import { businessDaysRemaining, formatCountdown } from '../../utils/businessDays';
import { AlertTriangle, CalendarClock, Plus, ShieldCheck, Trash2 } from 'lucide-react';

const DEFAULT_ACTIVITIES = [
  { id: 1, nome: 'Notificação preliminar ANPD' },
  { id: 2, nome: 'Comunicação aos titulares' },
  { id: 3, nome: 'Coleta de evidências' },
  { id: 4, nome: 'Análise de impacto' },
  { id: 5, nome: 'Elaboração de relatório' },
  { id: 6, nome: 'Revisão jurídica' },
];

function DeadlineCard({ title, base, result, linked }) {
  const tone = result?.overdue ? 'border-red-200 bg-red-50' : result && result.diffHours < 24 ? 'border-red-200 bg-red-50' : result && result.diffHours < 48 ? 'border-amber-200 bg-amber-50' : 'border-[rgba(21,38,43,0.08)] bg-white/82';
  const valueTone = result?.overdue ? 'text-red-700' : result && result.diffHours < 24 ? 'text-red-700' : result && result.diffHours < 48 ? 'text-amber-700' : 'text-[var(--ink)]';
  return (
    <div className={`rounded-[28px] border p-5 shadow-[0_14px_28px_rgba(21,38,43,0.05)] ${tone}`}>
      <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--ink-soft)]">{title}</div>
      <p className="mt-3 text-sm leading-6 text-[var(--ink-soft)]">{base}</p>
      <div className={`mt-4 font-syne text-3xl font-bold ${valueTone}`}>{result ? formatCountdown(result.diffHours) : 'Aguardando data-base'}</div>
      {linked?.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {linked.map((item) => (
            <span key={item} className="rounded-full border border-[rgba(21,38,43,0.08)] bg-white px-3 py-1 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--ink-soft)]">#{item}</span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function TabSLA({ effectiveClientId }) {
  const [config, setConfig] = useState(() => getStorage(KEYS.slaConfig(effectiveClientId), { warnThreshold: 36, critThreshold: 48 }));
  const [info] = useState(() => getStorage(KEYS.info(effectiveClientId), {}));
  const [customDeadlines, setCustomDeadlines] = useState(() => getStorage(KEYS.pmo(effectiveClientId), {}).customDeadlines || []);
  const [prelDate, setPrelDate] = useState(() => getStorage(KEYS.pmo(effectiveClientId), {}).prelDate || '');
  const [titularEndDate, setTitularEndDate] = useState(() => getStorage(KEYS.pmo(effectiveClientId), {}).titularEndDate || '');
  const [customSLADays, setCustomSLADays] = useState(() => getStorage(KEYS.pmo(effectiveClientId), {}).customSLADays || 5);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customForm, setCustomForm] = useState({ nome: '', baseLegal: '', dataInicio: '', dias: 3, tipo: 'uteis', atividade: '', responsavel: '' });

  const saveConfig = (nextConfig) => {
    setConfig(nextConfig);
    setStorage(KEYS.slaConfig(effectiveClientId), nextConfig);
  };

  const savePmoField = (field, value) => {
    const pmoData = getStorage(KEYS.pmo(effectiveClientId), {});
    setStorage(KEYS.pmo(effectiveClientId), { ...pmoData, [field]: value });
  };

  const dataRef = info.dataConhecimento ? new Date(info.dataConhecimento) : null;
  const prazo1 = dataRef ? businessDaysRemaining(dataRef, 3) : null;
  const prazo2 = prelDate ? businessDaysRemaining(new Date(prelDate), 20) : null;
  const prazo3 = titularEndDate ? businessDaysRemaining(new Date(titularEndDate), 3) : null;
  const prazo4 = dataRef ? businessDaysRemaining(dataRef, customSLADays) : null;
  const activities = DEFAULT_ACTIVITIES;

  const summary = useMemo(() => {
    const results = [prazo1, prazo2, prazo3, prazo4].filter(Boolean);
    const overdue = results.filter((item) => item.overdue).length;
    const warning = results.filter((item) => !item.overdue && item.diffHours < 48).length;
    return { overdue, warning, custom: customDeadlines.length };
  }, [customDeadlines.length, prazo1, prazo2, prazo3, prazo4]);

  const inputClass = 'w-full rounded-[20px] border border-[rgba(21,38,43,0.08)] bg-white px-4 py-3 text-sm text-[var(--ink)] focus:border-[rgba(21,38,43,0.18)] focus:outline-none';

  const addCustom = () => {
    if (!customForm.nome || !customForm.dataInicio) return;
    const updated = [{ id: Date.now(), ...customForm }, ...customDeadlines];
    setCustomDeadlines(updated);
    savePmoField('customDeadlines', updated);
    setCustomForm({ nome: '', baseLegal: '', dataInicio: '', dias: 3, tipo: 'uteis', atividade: '', responsavel: '' });
    setShowCustomForm(false);
  };

  return (
    <div className="space-y-6">
      <section className="grid gap-6 2xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.95fr)]">
        <div className="app-panel-dark rounded-[32px] p-6 shadow-[0_22px_44px_rgba(21,38,43,0.12)]">
          <div className="flex items-center gap-2 text-[var(--accent)]"><ShieldCheck size={14} /><span className="font-mono text-[11px] uppercase tracking-[0.28em]">Relógio regulatório</span></div>
          <h2 className="mt-3 font-syne text-3xl font-bold text-white md:text-4xl">SLA, ANPD e marcos internos</h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-[#d7e0e3]">
            Consolide datas-base, protocolos internos e obrigações de resposta para reduzir risco de perda de prazo crítico.
          </p>
          <div className="mt-6 grid gap-3 md:grid-cols-3">
            <div className="rounded-[24px] border border-white/10 bg-white/6 p-4">
              <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--ink-soft)]">Vencidos</div>
              <div className="mt-2 font-syne text-3xl font-bold text-white">{summary.overdue}</div>
              <p className="mt-2 text-xs leading-5 text-[#c6d0d4]">Marcos que já saíram da janela aceitável.</p>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/6 p-4">
              <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--ink-soft)]">Em atenção</div>
              <div className="mt-2 font-syne text-3xl font-bold text-white">{summary.warning}</div>
              <p className="mt-2 text-xs leading-5 text-[#c6d0d4]">Deadlines que já merecem acompanhamento de perto.</p>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/6 p-4">
              <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--ink-soft)]">Customizados</div>
              <div className="mt-2 font-syne text-3xl font-bold text-white">{summary.custom}</div>
              <p className="mt-2 text-xs leading-5 text-[#c6d0d4]">Marcos internos ou setoriais criados pelo time.</p>
            </div>
          </div>
        </div>

        <div className="app-panel rounded-[30px] p-5 shadow-[0_18px_36px_rgba(21,38,43,0.06)]">
          <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--ink-soft)]">Configuração</div>
          <h3 className="mt-2 font-syne text-2xl font-bold text-[var(--ink)]">Sensibilidade do relógio</h3>
          <div className="mt-5 grid gap-4">
            <div>
              <label className="mb-2 block font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--ink-soft)]">Aviso (horas)</label>
              <input type="number" value={config.warnThreshold} onChange={(event) => setConfig((current) => ({ ...current, warnThreshold: Number(event.target.value) }))} className={inputClass} />
            </div>
            <div>
              <label className="mb-2 block font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--ink-soft)]">Crítico (horas)</label>
              <input type="number" value={config.critThreshold} onChange={(event) => setConfig((current) => ({ ...current, critThreshold: Number(event.target.value) }))} className={inputClass} />
            </div>
            <div>
              <label className="mb-2 block font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--ink-soft)]">Ciência do incidente</label>
              <input type="datetime-local" value={info.dataConhecimento || ''} className={`${inputClass} cursor-not-allowed text-[var(--ink-soft)]`} disabled title="Edite em Informações do Incidente" />
            </div>
            <button onClick={() => saveConfig(config)} className="btn-primary px-4 py-2 text-[11px] uppercase tracking-[0.18em]">Salvar configuração</button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <DeadlineCard title="Prazo 1 · Comunicação à ANPD" base="3 dias úteis contados da ciência do incidente." result={prazo1} linked={[13, 14, 15]} />
        <div className="rounded-[28px] border border-[rgba(21,38,43,0.08)] bg-white/82 p-5 shadow-[0_14px_28px_rgba(21,38,43,0.05)]">
          <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--ink-soft)]">Prazo 2 · Comunicação complementar</div>
          <p className="mt-3 text-sm leading-6 text-[var(--ink-soft)]">20 dias úteis contados da comunicação preliminar.</p>
          <div className="mt-4">
            <label className="mb-2 block font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--ink-soft)]">Data da preliminar</label>
            <input type="datetime-local" value={prelDate} onChange={(event) => { setPrelDate(event.target.value); savePmoField('prelDate', event.target.value); }} className={inputClass} />
          </div>
          <div className="mt-4 font-syne text-3xl font-bold text-[var(--ink)]">{prazo2 ? formatCountdown(prazo2.diffHours) : 'Aguardando data-base'}</div>
          <div className="mt-4 flex flex-wrap gap-2"><span className="rounded-full border border-[rgba(21,38,43,0.08)] bg-white px-3 py-1 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--ink-soft)]">#16</span></div>
        </div>
        <div className="rounded-[28px] border border-[rgba(21,38,43,0.08)] bg-white/82 p-5 shadow-[0_14px_28px_rgba(21,38,43,0.05)]">
          <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--ink-soft)]">Prazo 3 · Declaração do DPO</div>
          <p className="mt-3 text-sm leading-6 text-[var(--ink-soft)]">3 dias úteis após o encerramento da comunicação aos titulares.</p>
          <div className="mt-4">
            <label className="mb-2 block font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--ink-soft)]">Encerramento da comunicação</label>
            <input type="datetime-local" value={titularEndDate} onChange={(event) => { setTitularEndDate(event.target.value); savePmoField('titularEndDate', event.target.value); }} className={inputClass} />
          </div>
          <div className="mt-4 font-syne text-3xl font-bold text-[var(--ink)]">{prazo3 ? formatCountdown(prazo3.diffHours) : 'Aguardando data-base'}</div>
          <div className="mt-4 flex flex-wrap gap-2"><span className="rounded-full border border-[rgba(21,38,43,0.08)] bg-white px-3 py-1 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--ink-soft)]">#23</span></div>
        </div>
        <div className="rounded-[28px] border border-[rgba(21,38,43,0.08)] bg-white/82 p-5 shadow-[0_14px_28px_rgba(21,38,43,0.05)]">
          <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--ink-soft)]">Prazo 4 · Complementar SEI!</div>
          <p className="mt-3 text-sm leading-6 text-[var(--ink-soft)]">Janela interna customizável com base na ciência do incidente.</p>
          <div className="mt-4 flex items-center gap-3">
            <input type="number" value={customSLADays} min={1} onChange={(event) => { const next = Number(event.target.value) || 1; setCustomSLADays(next); savePmoField('customSLADays', next); }} className="w-24 rounded-full border border-[rgba(21,38,43,0.08)] bg-white px-4 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--ink)] focus:outline-none" />
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--ink-soft)]">dias úteis</span>
          </div>
          <div className="mt-4 font-syne text-3xl font-bold text-[var(--ink)]">{prazo4 ? formatCountdown(prazo4.diffHours) : 'Aguardando data-base'}</div>
          <div className="mt-4 flex flex-wrap gap-2"><span className="rounded-full border border-[rgba(21,38,43,0.08)] bg-white px-3 py-1 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--ink-soft)]">#24</span></div>
        </div>
      </section>

      <section className="app-panel rounded-[30px] p-5 shadow-[0_18px_36px_rgba(21,38,43,0.06)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--ink-soft)]">Planejamento adicional</div>
            <h3 className="mt-2 font-syne text-2xl font-bold text-[var(--ink)]">Prazos customizados</h3>
          </div>
          <button onClick={() => setShowCustomForm((current) => !current)} className="btn-primary inline-flex items-center gap-2 px-4 py-2 text-[11px] uppercase tracking-[0.18em]">
            Adicionar prazo <Plus size={13} />
          </button>
        </div>

        {showCustomForm && (
          <div className="mt-5 rounded-[28px] border border-[rgba(21,38,43,0.08)] bg-white/78 p-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--ink-soft)]">Nome</label>
                <input type="text" value={customForm.nome} onChange={(event) => setCustomForm((current) => ({ ...current, nome: event.target.value }))} className={inputClass} />
              </div>
              <div>
                <label className="mb-2 block font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--ink-soft)]">Base legal</label>
                <input type="text" value={customForm.baseLegal} onChange={(event) => setCustomForm((current) => ({ ...current, baseLegal: event.target.value }))} className={inputClass} />
              </div>
              <div>
                <label className="mb-2 block font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--ink-soft)]">Data de início</label>
                <input type="datetime-local" value={customForm.dataInicio} onChange={(event) => setCustomForm((current) => ({ ...current, dataInicio: event.target.value }))} className={inputClass} />
              </div>
              <div className="grid grid-cols-[minmax(0,1fr)_120px] gap-3">
                <div>
                  <label className="mb-2 block font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--ink-soft)]">Quantidade</label>
                  <input type="number" value={customForm.dias} min={1} onChange={(event) => setCustomForm((current) => ({ ...current, dias: Number(event.target.value) }))} className={inputClass} />
                </div>
                <div>
                  <label className="mb-2 block font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--ink-soft)]">Tipo</label>
                  <select value={customForm.tipo} onChange={(event) => setCustomForm((current) => ({ ...current, tipo: event.target.value }))} className={inputClass}>
                    <option value="uteis">Úteis</option>
                    <option value="corridos">Corridos</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-2 block font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--ink-soft)]">Atividade vinculada</label>
                <select value={customForm.atividade} onChange={(event) => setCustomForm((current) => ({ ...current, atividade: event.target.value }))} className={inputClass}>
                  <option value="">Nenhuma</option>
                  {activities.map((activity) => <option key={activity.id} value={activity.id}>#{activity.id} {activity.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-2 block font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--ink-soft)]">Responsável</label>
                <input type="text" value={customForm.responsavel} onChange={(event) => setCustomForm((current) => ({ ...current, responsavel: event.target.value }))} className={inputClass} />
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <button onClick={() => setShowCustomForm(false)} className="btn-outline px-4 py-2 text-[11px] uppercase tracking-[0.18em]">Cancelar</button>
              <button onClick={addCustom} className="btn-primary px-4 py-2 text-[11px] uppercase tracking-[0.18em]">Salvar prazo</button>
            </div>
          </div>
        )}

        <div className="mt-5 space-y-3">
          {customDeadlines.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-[rgba(21,38,43,0.12)] bg-white/76 p-8 text-center text-sm leading-7 text-[var(--ink-soft)]">
              Nenhum prazo customizado criado ainda.
            </div>
          ) : (
            customDeadlines.map((deadline) => {
              const result = deadline.dataInicio ? (deadline.tipo === 'uteis'
                ? businessDaysRemaining(new Date(deadline.dataInicio), deadline.dias)
                : (() => {
                    const now = new Date();
                    const end = new Date(new Date(deadline.dataInicio).getTime() + deadline.dias * 24 * 60 * 60 * 1000);
                    const diffHours = (end - now) / (1000 * 60 * 60);
                    return { diffHours, overdue: diffHours < 0 };
                  })()) : null;
              return (
                <article key={deadline.id} className={`rounded-[28px] border p-5 shadow-[0_14px_28px_rgba(21,38,43,0.05)] ${result?.overdue ? 'border-red-200 bg-red-50/60' : 'border-[rgba(21,38,43,0.08)] bg-white/82'}`}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="font-syne text-2xl font-bold text-[var(--ink)]">{deadline.nome}</div>
                      {deadline.baseLegal && <p className="mt-2 text-sm leading-6 text-[var(--ink-soft)]">{deadline.baseLegal}</p>}
                    </div>
                    <button onClick={() => { const updated = customDeadlines.filter((item) => item.id !== deadline.id); setCustomDeadlines(updated); savePmoField('customDeadlines', updated); }} className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-red-700 hover:bg-red-100">
                      Excluir <Trash2 size={13} />
                    </button>
                  </div>
                  <div className="mt-4 grid gap-4 2xl:grid-cols-[minmax(0,1fr)_minmax(260px,0.8fr)]">
                    <div className="space-y-2 text-sm text-[var(--ink)]">
                      <div><strong>Responsável:</strong> {deadline.responsavel || 'Não informado'}</div>
                      <div><strong>Tipo:</strong> {deadline.dias} dias {deadline.tipo}</div>
                      <div><strong>Início:</strong> {deadline.dataInicio ? deadline.dataInicio.replace('T', ' ') : 'Não informado'}</div>
                      {deadline.atividade && <div><strong>Atividade:</strong> #{deadline.atividade}</div>}
                    </div>
                    <div className="rounded-[24px] border border-[rgba(21,38,43,0.08)] bg-[#f9faf6] p-4">
                      <div className="flex items-center gap-2 text-[var(--ink-soft)]"><CalendarClock size={14} /><span className="font-mono text-[11px] uppercase tracking-[0.22em]">Contagem</span></div>
                      <div className={`mt-3 font-syne text-3xl font-bold ${result?.overdue ? 'text-red-700' : 'text-[var(--ink)]'}`}>{result ? formatCountdown(result.diffHours) : 'Aguardando data-base'}</div>
                      {result?.overdue && <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.18em] text-red-700"><AlertTriangle size={13} /> prazo vencido</div>}
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
