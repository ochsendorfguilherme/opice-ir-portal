import { ArrowLeft, ArrowRight, Mail, Plus, ShieldCheck, Ticket, UserRoundCheck, LogOut } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import OpiceLogo from '../components/OpiceLogo';
import TLPBanner from '../components/TLPBanner';
import { fetchClients, getStorage, KEYS, setStorage } from '../utils/storage';

const STATUS_OPTIONS = [
  'Novo',
  'Em tratamento',
  'Aguardando cliente',
  'Respondido',
  'Encerrado',
];

const CHANNEL_OPTIONS = ['E-mail', 'Portal', 'Telefone', 'Reuni\u00e3o'];

function saveClientPrivacy(clientId, updater) {
  const current = getStorage(KEYS.privacyRequests(clientId), []);
  setStorage(KEYS.privacyRequests(clientId), updater(current));
}

function loadPrivacyTickets() {
  return fetchClients().flatMap((client) => {
    const entries = getStorage(KEYS.privacyRequests(client.id), []);
    return entries.map((item) => ({
      ...item,
      clientId: client.id,
      clientName: client.displayName || client.name || client.id,
    }));
  });
}

function dateLabel(value) {
  if (!value) return '\u2014';
  const [year, month, day] = value.split('-');
  return year && month && day ? `${day}/${month}/${year}` : value;
}

function StatCard({ label, value, helper, tone = 'neutral' }) {
  const tones = {
    neutral: 'border-[rgba(21,38,43,0.08)] bg-white/72',
    accent: 'border-[#3452a4]/20 bg-[rgba(183,200,255,0.22)]',
    alert: 'border-indigo-200 bg-indigo-50/86',
  };
  return (
    <div className={`rounded-[24px] border p-5 ${tones[tone]}`}>
      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-soft)]">{label}</div>
      <div className="mt-3 font-syne text-3xl font-bold text-[var(--ink)]">{value}</div>
      <p className="mt-2 text-sm leading-6 text-[var(--ink-soft)]">{helper}</p>
    </div>
  );
}

export default function AdminPrivacyModule() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const clients = useMemo(() => fetchClients(), []);
  const [tickets, setTickets] = useState(() => loadPrivacyTickets());
  const [form, setForm] = useState({
    clientId: clients[0]?.id || '',
    requesterName: '',
    requesterEmail: '',
    subject: '',
    status: 'Novo',
    channel: 'E-mail',
    dueDate: '',
    update: '',
  });

  const summary = useMemo(() => {
    const open = tickets.filter((item) => item.status !== 'Encerrado').length;
    const waiting = tickets.filter((item) => item.status === 'Aguardando cliente').length;
    const responded = tickets.filter((item) => item.status === 'Respondido').length;
    const followUp = tickets.filter((item) => item.dueDate && item.status !== 'Encerrado').length;
    return { open, waiting, responded, followUp };
  }, [tickets]);

  function handleSubmit(event) {
    event.preventDefault();
    if (!form.clientId || !form.subject || !form.requesterEmail) return;
    const ticket = {
      id: `DPO_${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      requesterName: form.requesterName,
      requesterEmail: form.requesterEmail,
      subject: form.subject,
      status: form.status,
      channel: form.channel,
      dueDate: form.dueDate,
      update: form.update,
      createdAt: new Date().toISOString(),
    };
    saveClientPrivacy(form.clientId, (current) => [ticket, ...current]);
    setForm({
      clientId: form.clientId,
      requesterName: '',
      requesterEmail: '',
      subject: '',
      status: 'Novo',
      channel: 'E-mail',
      dueDate: '',
      update: '',
    });
    setTickets(loadPrivacyTickets());
  }

  function sendUpdate(ticket) {
    const subject = encodeURIComponent(`Atualiza\u00e7\u00e3o DPO - ${ticket.clientName} - ${ticket.subject}`);
    const body = encodeURIComponent(
      `Ol\u00e1,\n\n` +
      `Seguimos com a solicita\u00e7\u00e3o de privacidade em acompanhamento.\n\n` +
      `Cliente: ${ticket.clientName}\n` +
      `Chamado: ${ticket.subject}\n` +
      `Status: ${ticket.status}\n` +
      `Canal: ${ticket.channel}\n` +
      `Prazo de retorno: ${ticket.dueDate ? dateLabel(ticket.dueDate) : 'N\u00e3o informado'}\n\n` +
      `Atualiza\u00e7\u00e3o:\n${ticket.update || 'Sem observa\u00e7\u00e3o adicional no momento.'}\n\n` +
      `Atenciosamente,\nEquipe Opice Blum`
    );
    window.open(`mailto:${ticket.requesterEmail}?subject=${subject}&body=${body}`, '_self');
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(183,200,255,0.18),transparent_22%),linear-gradient(180deg,#f7f5ef_0%,#ece7dc_100%)] text-[var(--ink)]">
      <div className="mx-auto max-w-[1600px] px-5 pb-10 pt-5 md:px-8 md:pb-14 md:pt-6">
        <div className="rounded-[34px] border border-[rgba(21,38,43,0.1)] bg-[rgba(255,251,244,0.66)] px-4 py-3 shadow-[0_18px_42px_rgba(21,38,43,0.1)] backdrop-blur-[18px] md:px-5">
          <div className="flex flex-wrap items-center gap-4">
            <div className="min-w-0 flex-1"><TLPBanner /></div>
            <button onClick={() => navigate('/admin/modulos')} className="flex h-11 items-center gap-2 rounded-full border border-[rgba(21,38,43,0.12)] bg-white/78 px-4 font-dm text-xs font-semibold uppercase tracking-[0.16em] text-[#173038] shadow-[0_12px_24px_rgba(21,38,43,0.08)] transition-all hover:-translate-y-0.5 hover:bg-white"><ArrowLeft size={15} /> {'Módulos'}</button>
            <button onClick={() => { logout(); navigate('/login'); }} className="flex h-11 items-center gap-2 rounded-full border border-[rgba(21,38,43,0.12)] bg-white/78 px-4 font-dm text-xs font-semibold uppercase tracking-[0.16em] text-[#173038] shadow-[0_12px_24px_rgba(21,38,43,0.08)] transition-all hover:-translate-y-0.5 hover:bg-white"><LogOut size={15} /> Sair</button>
          </div>
        </div>

        <section className="mt-8 overflow-hidden rounded-[38px] border border-[#3452a4]/18 bg-[linear-gradient(180deg,rgba(246,248,255,0.97)_0%,rgba(236,241,255,0.95)_100%)] p-7 shadow-[0_28px_64px_rgba(45,68,132,0.12)] md:p-9">
          <OpiceLogo />
          <p className="section-kicker mt-6">{'Gestão de privacidade'}</p>
          <div className="mt-4 flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-4xl">
              <h1 className="font-syne text-4xl font-extrabold uppercase tracking-[-0.05em] text-[var(--ink)] md:text-6xl">{'Atuação como DPO e acompanhamento de solicitações'}</h1>
              <p className="mt-4 font-dm text-base leading-7 text-[var(--ink-soft)] md:text-lg">{'Painel para abrir tickets de privacidade, fazer follow-up, acompanhar retornos e enviar atualizações diretamente ao cliente quando o Opice Blum atua como encarregado de dados.'}</p>
            </div>
            <div className="flex h-16 w-16 items-center justify-center rounded-[22px] bg-[rgba(52,82,164,0.14)] text-[#3452a4]"><ShieldCheck size={30} /></div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard label={'Tickets abertos'} value={summary.open} helper={'Chamados DPO ativos no acompanhamento atual.'} tone="accent" />
            <StatCard label={'Aguardando cliente'} value={summary.waiting} helper={'Demandas pendentes de retorno ou confirmação do cliente.'} tone="alert" />
            <StatCard label={'Respondidos'} value={summary.responded} helper={'Tickets já respondidos com atualização registrada.'} />
            <StatCard label={'Com FUP previsto'} value={summary.followUp} helper={'Tickets com prazo de acompanhamento definido.'} />
          </div>

          <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
            <form onSubmit={handleSubmit} className="rounded-[32px] border border-[#3452a4]/16 bg-white/80 p-5 shadow-[0_12px_28px_rgba(21,38,43,0.06)]">
              <div className="flex items-center gap-3 text-[#3452a4]"><Plus size={18} /><span className="font-mono text-[11px] uppercase tracking-[0.22em]">{'Novo ticket DPO'}</span></div>
              <h2 className="mt-2 font-syne text-2xl font-bold text-[var(--ink)]">{'Registrar solicitação do cliente'}</h2>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <label className="space-y-1.5 text-sm text-[var(--ink-soft)]">
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em]">Cliente</span>
                  <select value={form.clientId} onChange={(event) => setForm((current) => ({ ...current, clientId: event.target.value }))} className="w-full rounded-[18px] border border-[rgba(21,38,43,0.12)] bg-white px-4 py-3 text-[var(--ink)] outline-none">
                    {clients.map((client) => <option key={client.id} value={client.id}>{client.displayName || client.name || client.id}</option>)}
                  </select>
                </label>
                <label className="space-y-1.5 text-sm text-[var(--ink-soft)]">
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em]">Solicitante</span>
                  <input value={form.requesterName} onChange={(event) => setForm((current) => ({ ...current, requesterName: event.target.value }))} className="w-full rounded-[18px] border border-[rgba(21,38,43,0.12)] bg-white px-4 py-3 text-[var(--ink)] outline-none" placeholder={'Nome do ponto focal'} />
                </label>
                <label className="space-y-1.5 text-sm text-[var(--ink-soft)]">
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em]">E-mail</span>
                  <input type="email" value={form.requesterEmail} onChange={(event) => setForm((current) => ({ ...current, requesterEmail: event.target.value }))} className="w-full rounded-[18px] border border-[rgba(21,38,43,0.12)] bg-white px-4 py-3 text-[var(--ink)] outline-none" placeholder={'cliente@empresa.com.br'} />
                </label>
                <label className="space-y-1.5 text-sm text-[var(--ink-soft)]">
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em]">Canal</span>
                  <select value={form.channel} onChange={(event) => setForm((current) => ({ ...current, channel: event.target.value }))} className="w-full rounded-[18px] border border-[rgba(21,38,43,0.12)] bg-white px-4 py-3 text-[var(--ink)] outline-none">
                    {CHANNEL_OPTIONS.map((channel) => <option key={channel} value={channel}>{channel}</option>)}
                  </select>
                </label>
                <label className="space-y-1.5 text-sm text-[var(--ink-soft)] md:col-span-2">
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em]">Assunto</span>
                  <input value={form.subject} onChange={(event) => setForm((current) => ({ ...current, subject: event.target.value }))} className="w-full rounded-[18px] border border-[rgba(21,38,43,0.12)] bg-white px-4 py-3 text-[var(--ink)] outline-none" placeholder={'Ex: Pedido de informação sobre tratamento de dados'} />
                </label>
                <label className="space-y-1.5 text-sm text-[var(--ink-soft)]">
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em]">Status</span>
                  <select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))} className="w-full rounded-[18px] border border-[rgba(21,38,43,0.12)] bg-white px-4 py-3 text-[var(--ink)] outline-none">
                    {STATUS_OPTIONS.map((status) => <option key={status} value={status}>{status}</option>)}
                  </select>
                </label>
                <label className="space-y-1.5 text-sm text-[var(--ink-soft)]">
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em]">{'Próximo FUP'}</span>
                  <input type="date" value={form.dueDate} onChange={(event) => setForm((current) => ({ ...current, dueDate: event.target.value }))} className="w-full rounded-[18px] border border-[rgba(21,38,43,0.12)] bg-white px-4 py-3 text-[var(--ink)] outline-none" />
                </label>
                <label className="space-y-1.5 text-sm text-[var(--ink-soft)] md:col-span-2">
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em]">{'Atualização / contexto'}</span>
                  <textarea rows={4} value={form.update} onChange={(event) => setForm((current) => ({ ...current, update: event.target.value }))} className="w-full rounded-[18px] border border-[rgba(21,38,43,0.12)] bg-white px-4 py-3 text-[var(--ink)] outline-none" placeholder={'Descreva o pedido, o andamento atual e o próximo passo combinado com o cliente.'} />
                </label>
              </div>
              <button type="submit" className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#3452a4] px-5 py-3 font-dm text-sm font-semibold text-white shadow-[0_14px_28px_rgba(45,68,132,0.18)] transition-all hover:-translate-y-0.5"><Plus size={16} /> {'Abrir ticket'}</button>
            </form>

            <div className="rounded-[32px] border border-[#3452a4]/16 bg-white/80 p-5 shadow-[0_12px_28px_rgba(21,38,43,0.06)]">
              <div className="flex items-center gap-3 text-[#3452a4]"><Ticket size={18} /><span className="font-mono text-[11px] uppercase tracking-[0.22em]">{'Fila DPO'}</span></div>
              <h2 className="mt-2 font-syne text-2xl font-bold text-[var(--ink)]">{'Solicitações em acompanhamento'}</h2>
              <div className="mt-5 space-y-3">
                {tickets.slice(0, 8).map((ticket) => (
                  <div key={ticket.id} className="rounded-[24px] border border-[rgba(21,38,43,0.08)] bg-white px-4 py-4 shadow-[0_12px_28px_rgba(21,38,43,0.06)]">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <div className="font-syne text-xl font-bold text-[var(--ink)]">{ticket.subject}</div>
                        <p className="mt-2 text-sm leading-6 text-[var(--ink-soft)]">{ticket.clientName} {'•'} {ticket.requesterName || ticket.requesterEmail}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <span className="rounded-full bg-indigo-50 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-indigo-700">{ticket.status}</span>
                          <span className="rounded-full bg-stone-100 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-stone-700">{ticket.channel}</span>
                          <span className="rounded-full bg-stone-100 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-stone-700">{'FUP: '}{dateLabel(ticket.dueDate)}</span>
                        </div>
                        {ticket.update ? <p className="mt-3 text-sm leading-6 text-[var(--ink-soft)]">{ticket.update}</p> : null}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button onClick={() => sendUpdate(ticket)} className="inline-flex items-center gap-2 rounded-full bg-[#3452a4] px-4 py-3 font-dm text-sm font-semibold text-white shadow-[0_14px_28px_rgba(45,68,132,0.18)] transition-all hover:-translate-y-0.5"><Mail size={16} /> {'Enviar e-mail'}</button>
                        <button onClick={() => navigate(`/admin/cliente/${ticket.clientId}/anpd`)} className="inline-flex items-center gap-2 rounded-full bg-[#173038] px-4 py-3 font-dm text-sm font-semibold text-white shadow-[0_14px_28px_rgba(21,38,43,0.16)] transition-all hover:-translate-y-0.5">{'Abrir cliente'} <ArrowRight size={16} /></button>
                      </div>
                    </div>
                  </div>
                ))}
                {tickets.length === 0 && (
                  <div className="rounded-[24px] border border-[rgba(21,38,43,0.08)] bg-white px-4 py-8 text-center text-[var(--ink-soft)]">{'Nenhum ticket DPO registrado ainda.'}</div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <div className="rounded-[28px] border border-[#3452a4]/16 bg-white/76 p-5">
              <div className="flex items-center gap-3 text-[#3452a4]"><ShieldCheck size={18} /><span className="font-mono text-[11px] uppercase tracking-[0.22em]">{'Leitura sugerida'}</span></div>
              <p className="mt-3 text-sm leading-6 text-[var(--ink-soft)]">{'Use esta frente quando o Opice Blum atuar como encarregado. Aqui ficam os pedidos do cliente, o follow-up e a comunicação direta de andamento.'}</p>
            </div>
            <div className="rounded-[28px] border border-[#3452a4]/16 bg-white/76 p-5">
              <div className="flex items-center gap-3 text-[#3452a4]"><UserRoundCheck size={18} /><span className="font-mono text-[11px] uppercase tracking-[0.22em]">{'Ação rápida'}</span></div>
              <p className="mt-3 text-sm leading-6 text-[var(--ink-soft)]">{'Abra o ticket, defina o próximo FUP e use o envio direto por e-mail para manter o cliente atualizado sem sair do módulo.'}</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}