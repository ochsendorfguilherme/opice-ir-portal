import { useMemo, useState } from 'react';
import { getStorage, setStorage, KEYS } from '../../utils/storage';
import { Copy, Lock, MessageSquareText, Plus, Send, Trash2 } from 'lucide-react';

const PUBLICO_OPTS = ['Clientes', 'Reguladores', 'Imprensa', 'Colaboradores', 'ANPD', 'Parceiros', 'Diretoria', 'Outro'];
const CANAL_OPTS = ['Email', 'Site oficial', 'Press release', 'SEI! ANPD', 'WhatsApp', 'Reunião', 'Outro'];
const STATUS_OPTS = ['Rascunho', 'Pendente Jurídico', 'Aprovado', 'Enviado', 'Cancelado'];
const STATUS_STYLE = {
  Rascunho: 'border-[rgba(21,38,43,0.08)] bg-white/70 text-[var(--ink-soft)]',
  'Pendente Jurídico': 'border-amber-200 bg-amber-50 text-amber-700',
  Aprovado: 'border-blue-200 bg-blue-50 text-blue-700',
  Enviado: 'border-green-200 bg-green-50 text-green-700',
  Cancelado: 'border-red-200 bg-red-50 text-red-700',
};

const EMPTY_FORM = {
  publico: '',
  mensagem: '',
  canal: 'Email',
  statusAprovacao: 'Rascunho',
  aprovadoPor: '',
  dataEnvio: '',
  observacoes: '',
  actividadeId: '',
};

function SummaryCard({ label, value, helper, tone = 'neutral' }) {
  const toneClass = {
    neutral: 'border-[rgba(21,38,43,0.08)] bg-white/80',
    warning: 'border-amber-200 bg-amber-50',
    success: 'border-green-200 bg-green-50',
    danger: 'border-red-200 bg-red-50',
  }[tone];

  return (
    <div className={`rounded-[24px] border p-4 shadow-[0_12px_24px_rgba(21,38,43,0.04)] ${toneClass}`}>
      <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--ink-soft)]">{label}</div>
      <div className="mt-3 font-syne text-3xl font-bold text-[var(--ink)]">{value}</div>
      <p className="mt-2 text-sm leading-6 text-[var(--ink-soft)]">{helper}</p>
    </div>
  );
}

export default function TabComms({ effectiveClientId }) {
  const [comms, setComms] = useState(() => getStorage(KEYS.pmo(effectiveClientId), {}).commsLog || []);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [activities] = useState(() => getStorage(KEYS.activities(effectiveClientId), []));
  const [copiedId, setCopiedId] = useState(null);

  const saveComms = (next) => {
    const pmoData = getStorage(KEYS.pmo(effectiveClientId), {});
    setStorage(KEYS.pmo(effectiveClientId), { ...pmoData, commsLog: next });
    setComms(next);
  };

  const addComm = () => {
    if (!form.mensagem.trim()) return;
    saveComms([{ id: Date.now(), createdAt: new Date().toISOString(), ...form }, ...comms]);
    setForm(EMPTY_FORM);
    setShowForm(false);
  };

  const updateStatus = (id, statusAprovacao) => saveComms(comms.map((entry) => (entry.id === id ? { ...entry, statusAprovacao } : entry)));
  const deleteComm = (id) => saveComms(comms.filter((entry) => entry.id !== id));

  const summary = useMemo(() => ({
    drafts: comms.filter((entry) => entry.statusAprovacao === 'Rascunho').length,
    pending: comms.filter((entry) => entry.statusAprovacao === 'Pendente Jurídico').length,
    approved: comms.filter((entry) => entry.statusAprovacao === 'Aprovado').length,
    sent: comms.filter((entry) => entry.statusAprovacao === 'Enviado').length,
  }), [comms]);

  const inputClass = 'w-full rounded-[20px] border border-[rgba(21,38,43,0.08)] bg-white px-4 py-3 text-sm text-[var(--ink)] focus:border-[rgba(21,38,43,0.18)] focus:outline-none';

  const copyMessage = async (id, message) => {
    await navigator.clipboard.writeText(message || '');
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <div className="space-y-6">
      <section className="grid gap-6 2xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.95fr)]">
        <div className="app-panel-dark rounded-[32px] p-6 shadow-[0_22px_44px_rgba(21,38,43,0.12)]">
          <div className="flex items-center gap-2 text-[var(--accent)]"><Lock size={14} /><span className="font-mono text-[11px] uppercase tracking-[0.28em]">Governança de comunicação</span></div>
          <h2 className="mt-3 font-syne text-3xl font-bold text-white md:text-4xl">Ponto único de comunicação externa</h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-[#d7e0e3]">
            Centralize rascunhos, aprovação jurídica e disparos para reduzir ruído operacional e manter trilha de auditoria.
          </p>
          <div className="mt-6 rounded-[24px] border border-white/10 bg-white/6 p-4 text-sm leading-7 text-[#e8eff1]">
            Nenhuma comunicação externa deve sair sem alinhamento mínimo entre jurídico, liderança do incidente e responsável pelo canal.
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-1">
          <SummaryCard label="Rascunhos" value={summary.drafts} helper="Mensagens em construção ou aguardando refinamento." />
          <SummaryCard label="Pendente jurídico" value={summary.pending} helper="Peças que precisam de validação antes do envio." tone={summary.pending > 0 ? 'warning' : 'neutral'} />
          <SummaryCard label="Aprovado e enviado" value={summary.sent} helper="Comunicações já distribuídas ou protocoladas." tone={summary.sent > 0 ? 'success' : 'neutral'} />
        </div>
      </section>

      <section className="app-panel rounded-[30px] p-5 shadow-[0_18px_36px_rgba(21,38,43,0.06)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--ink-soft)]">Console</div>
            <h3 className="mt-2 font-syne text-2xl font-bold text-[var(--ink)]">Operação de mensagens</h3>
          </div>
          <button onClick={() => setShowForm((current) => !current)} className="btn-primary inline-flex items-center gap-2 px-4 py-2 text-[11px] uppercase tracking-[0.18em]">
            Registrar comunicação <Plus size={13} />
          </button>
        </div>

        {showForm && (
          <div className="mt-5 rounded-[28px] border border-[rgba(21,38,43,0.08)] bg-white/78 p-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--ink-soft)]">Público</label>
                <input list="publico-list" value={form.publico} onChange={(event) => setForm((current) => ({ ...current, publico: event.target.value }))} className={inputClass} placeholder="Selecione ou escreva um público" />
                <datalist id="publico-list">{PUBLICO_OPTS.map((publico) => <option key={publico} value={publico} />)}</datalist>
              </div>
              <div>
                <label className="mb-2 block font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--ink-soft)]">Canal</label>
                <select value={form.canal} onChange={(event) => setForm((current) => ({ ...current, canal: event.target.value }))} className={inputClass}>
                  {CANAL_OPTS.map((channel) => <option key={channel}>{channel}</option>)}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="mb-2 block font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--ink-soft)]">Mensagem aprovada</label>
                <textarea value={form.mensagem} onChange={(event) => setForm((current) => ({ ...current, mensagem: event.target.value }))} rows={4} className={`${inputClass} min-h-[130px]`} placeholder="Descreva a mensagem aprovada ou o texto em revisão." />
              </div>
              <div>
                <label className="mb-2 block font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--ink-soft)]">Status</label>
                <select value={form.statusAprovacao} onChange={(event) => setForm((current) => ({ ...current, statusAprovacao: event.target.value }))} className={inputClass}>
                  {STATUS_OPTS.map((status) => <option key={status}>{status}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-2 block font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--ink-soft)]">Aprovado por</label>
                <input type="text" value={form.aprovadoPor} onChange={(event) => setForm((current) => ({ ...current, aprovadoPor: event.target.value }))} className={inputClass} placeholder="Nome ou área responsável" />
              </div>
              {form.statusAprovacao === 'Enviado' && (
                <div>
                  <label className="mb-2 block font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--ink-soft)]">Data e hora de envio</label>
                  <input type="datetime-local" value={form.dataEnvio} onChange={(event) => setForm((current) => ({ ...current, dataEnvio: event.target.value }))} className={inputClass} />
                </div>
              )}
              <div>
                <label className="mb-2 block font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--ink-soft)]">Atividade associada</label>
                <select value={form.actividadeId} onChange={(event) => setForm((current) => ({ ...current, actividadeId: event.target.value ? Number(event.target.value) : '' }))} className={inputClass}>
                  <option value="">Nenhuma</option>
                  {activities.map((activity) => <option key={activity.id} value={activity.id}>#{activity.id} {activity.nome}</option>)}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="mb-2 block font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--ink-soft)]">Observações</label>
                <input type="text" value={form.observacoes} onChange={(event) => setForm((current) => ({ ...current, observacoes: event.target.value }))} className={inputClass} placeholder="Notas de contexto, aprovação ou próximos passos" />
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <button onClick={() => setShowForm(false)} className="btn-outline px-4 py-2 text-[11px] uppercase tracking-[0.18em]">Cancelar</button>
              <button onClick={addComm} className="btn-primary inline-flex items-center gap-2 px-4 py-2 text-[11px] uppercase tracking-[0.18em]">Salvar mensagem <Send size={13} /></button>
            </div>
          </div>
        )}
      </section>

      <section className="space-y-4">
        {comms.length === 0 ? (
          <div className="rounded-[30px] border border-dashed border-[rgba(21,38,43,0.12)] bg-white/76 p-10 text-center text-sm leading-7 text-[var(--ink-soft)]">
            Nenhuma comunicação registrada ainda.
          </div>
        ) : (
          comms.map((entry) => {
            const relatedActivity = entry.actividadeId ? activities.find((activity) => activity.id === entry.actividadeId) : null;
            return (
              <article key={entry.id} className="rounded-[30px] border border-[rgba(21,38,43,0.08)] bg-white/82 p-5 shadow-[0_14px_28px_rgba(21,38,43,0.05)]">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full border px-3 py-1 font-mono text-[11px] uppercase tracking-[0.18em] ${STATUS_STYLE[entry.statusAprovacao]}`}>{entry.statusAprovacao}</span>
                    <span className="rounded-full border border-[rgba(21,38,43,0.08)] bg-white px-3 py-1 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--ink-soft)]">{entry.publico || 'Público não informado'}</span>
                    <span className="rounded-full border border-[rgba(21,38,43,0.08)] bg-[#f7f8f2] px-3 py-1 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--ink)]">via {entry.canal}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => copyMessage(entry.id, entry.mensagem)} className="btn-outline inline-flex items-center gap-2 px-4 py-2 text-[11px] uppercase tracking-[0.18em]">{copiedId === entry.id ? 'Copiado' : 'Copiar'} <Copy size={13} /></button>
                    <button onClick={() => deleteComm(entry.id)} className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-red-700 hover:bg-red-100">Excluir <Trash2 size={13} /></button>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 2xl:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
                  <div>
                    <h3 className="font-syne text-2xl font-bold text-[var(--ink)]">Mensagem registrada</h3>
                    <p className="mt-3 whitespace-pre-line text-sm leading-7 text-[var(--ink)]">{entry.mensagem}</p>
                  </div>
                  <div className="rounded-[24px] border border-[rgba(21,38,43,0.08)] bg-[#f9faf6] p-4">
                    <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--ink-soft)]">Controle</div>
                    <div className="mt-4 space-y-3 text-sm text-[var(--ink)]">
                      <div><strong>Status:</strong> <select value={entry.statusAprovacao} onChange={(event) => updateStatus(entry.id, event.target.value)} className="ml-2 rounded-full border border-[rgba(21,38,43,0.08)] bg-white px-3 py-1 font-mono text-[11px] uppercase tracking-[0.18em] focus:outline-none">{STATUS_OPTS.map((status) => <option key={status}>{status}</option>)}</select></div>
                      <div><strong>Aprovado por:</strong> {entry.aprovadoPor || 'Não informado'}</div>
                      <div><strong>Criado em:</strong> {entry.createdAt ? new Date(entry.createdAt).toLocaleString('pt-BR') : 'Não informado'}</div>
                      <div><strong>Enviado em:</strong> {entry.dataEnvio ? entry.dataEnvio.replace('T', ' ') : 'Ainda não enviado'}</div>
                      {relatedActivity && <div><strong>Jornada:</strong> #{relatedActivity.id} {relatedActivity.nome}</div>}
                      {entry.observacoes && <div><strong>Observações:</strong> {entry.observacoes}</div>}
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
