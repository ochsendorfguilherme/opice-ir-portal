import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  Bug,
  ChevronRight,
  ExternalLink,
  HelpCircle,
  Inbox,
  LifeBuoy,
  Lightbulb,
  Mail,
  MessageSquareMore,
  Send,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { addNotification } from '../utils/storage';
import {
  SUPPORT_CHANNELS,
  SUPPORT_TYPES,
  buildSupportMailto,
  buildSupportTeamsUrl,
  createSupportTicket,
  getMySupportTickets,
  getPageContext,
  getSupportStatusTone,
  getSupportTypeTone,
  resolveSupportDestination,
} from '../utils/support';

const BUG_SEVERITIES = ['Baixa', 'Média', 'Alta', 'Crítica'];

function formatDateTime(value) {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function Field({ label, children, hint }) {
  return (
    <label className="block space-y-1.5">
      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-soft)]">{label}</span>
      {children}
      {hint ? <span className="block text-xs text-[var(--ink-soft)]">{hint}</span> : null}
    </label>
  );
}

function ActionCard({ icon, title, description, onClick, tone = 'default' }) {
  const IconComponent = icon;
  const tones = {
    default: 'border-[rgba(21,38,43,0.08)] bg-white/78 text-[var(--ink)]',
    alert: 'border-rose-200 bg-rose-50/78 text-rose-800',
    accent: 'border-[rgba(214,255,99,0.3)] bg-[rgba(214,255,99,0.18)] text-[var(--ink)]',
  };
  return (
    <button
      onClick={onClick}
      className={`w-full rounded-[24px] border p-4 text-left shadow-[0_10px_22px_rgba(21,38,43,0.06)] transition-all hover:-translate-y-0.5 ${tones[tone]}`}
    >
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[16px] bg-[rgba(21,38,43,0.06)]">
          <IconComponent size={19} />
        </span>
        <div className="min-w-0">
          <p className="font-syne text-lg font-bold">{title}</p>
          <p className="mt-2 text-sm leading-6 text-[var(--ink-soft)]">{description}</p>
        </div>
        <ChevronRight size={18} className="ml-auto mt-1 text-[var(--ink-soft)]" />
      </div>
    </button>
  );
}

function TicketRow({ ticket, onOpen }) {
  return (
    <button
      onClick={() => onOpen(ticket)}
      className="w-full rounded-[22px] border border-[rgba(21,38,43,0.08)] bg-white/82 px-4 py-4 text-left shadow-[0_10px_24px_rgba(21,38,43,0.05)] transition-all hover:bg-white"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-syne text-lg font-bold text-[var(--ink)]">{ticket.title}</p>
          <p className="mt-1 text-sm text-[var(--ink-soft)]">{ticket.protocol}</p>
        </div>
        <span className={`rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.16em] ${getSupportStatusTone(ticket.status)}`}>
          {ticket.status}
        </span>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <span className={`rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.16em] ${getSupportTypeTone(ticket.type)}`}>
          {SUPPORT_TYPES[ticket.type]?.label}
        </span>
        <span className="rounded-full bg-[rgba(21,38,43,0.06)] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--ink-soft)]">
          {formatDateTime(ticket.createdAt)}
        </span>
      </div>
    </button>
  );
}

export default function SupportDock() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState('menu');
  const [feedback, setFeedback] = useState(null);
  const [activeTicket, setActiveTicket] = useState(null);
  const [bugForm, setBugForm] = useState({
    title: '',
    description: '',
    severity: 'Média',
    channel: 'E-mail',
    evidence: '',
  });
  const [legalForm, setLegalForm] = useState({
    title: '',
    message: '',
    channel: 'E-mail',
  });
  const [suggestionForm, setSuggestionForm] = useState({
    title: '',
    description: '',
    benefit: '',
    channel: 'E-mail',
  });

  const context = getPageContext(location.pathname, user);
  const myTickets = getMySupportTickets(user?.email).slice(0, 12);
  const openCount = myTickets.filter((ticket) => !['Fechado', 'Resolvido', 'Implementada'].includes(ticket.status)).length;
  const legalDestination = resolveSupportDestination('legal', context);

  function resetForms() {
    setBugForm({ title: '', description: '', severity: 'Média', channel: 'E-mail', evidence: '' });
    setLegalForm({ title: '', message: '', channel: 'E-mail' });
    setSuggestionForm({ title: '', description: '', benefit: '', channel: 'E-mail' });
  }

  function goToMenu() {
    setFeedback(null);
    setActiveTicket(null);
    setView('menu');
  }

  function notifyByChannel(ticket) {
    if (ticket.channel.includes('E-mail')) {
      window.open(buildSupportMailto(ticket), '_self');
    }
    if (ticket.channel.includes('Teams')) {
      window.open(buildSupportTeamsUrl(ticket), '_blank', 'noopener,noreferrer');
    }
  }

  function handleCreateTicket(type, data) {
    const destination = resolveSupportDestination(type, context);
    const result = createSupportTicket({
      type,
      title: data.title,
      message: data.message,
      channel: data.channel,
      requester: {
        email: user?.email || 'usuario@portal.local',
        name: user?.name || 'Usuário do portal',
        role: user?.role || 'client',
        clientId: context.clientId,
      },
      context,
      destination,
      extras: data.extras,
    });

    if (context.clientId) {
      addNotification(context.clientId, {
        type: type === 'bug' ? 'warning' : type === 'legal' ? 'info' : 'done',
        message: result.duplicate
          ? `Envio já existente localizado: ${result.ticket.protocol}`
          : `Novo envio registrado: ${result.ticket.protocol}`,
        link: location.pathname,
      });
    }

    notifyByChannel(result.ticket);
    setFeedback({
      type: result.duplicate ? 'duplicate' : 'success',
      ticket: result.ticket,
      message: result.duplicate
        ? 'Um envio igual já foi localizado e mantido em acompanhamento.'
        : 'Envio registrado e encaminhado ao destino responsável.',
    });
    setView('done');
  }

  function renderMenu() {
    return (
      <div className="space-y-3">
        <ActionCard
          icon={Bug}
          title="Reportar bug"
          description="Relate erro, comportamento inesperado ou problema de navegação com contexto automático da tela."
          onClick={() => setView('bug')}
          tone="alert"
        />
        <ActionCard
          icon={ShieldCheck}
          title="Falar com o Advogado responsável"
          description="Envie uma dúvida por e-mail ou Teams ao responsável jurídico do contexto atual, com fallback seguro."
          onClick={() => setView('legal')}
          tone="accent"
        />
        <ActionCard
          icon={Lightbulb}
          title="Enviar sugestão de melhoria"
          description="Registre melhorias no sistema de forma rápida, com contexto de página e benefício esperado."
          onClick={() => setView('suggestion')}
        />
        <ActionCard
          icon={Inbox}
          title="Meus envios"
          description="Acompanhe status, destino, resposta e histórico básico das mensagens que você já abriu."
          onClick={() => setView('my')}
        />

        {user?.role === 'admin' && (
          <button
            onClick={() => { setOpen(false); navigate('/admin/suporte'); }}
            className="mt-3 flex w-full items-center justify-between rounded-[22px] border border-[rgba(21,38,43,0.08)] bg-[rgba(23,48,56,0.08)] px-4 py-3 text-left text-sm font-semibold text-[var(--ink)] transition-colors hover:bg-[rgba(23,48,56,0.12)]"
          >
            <span className="flex items-center gap-2"><LifeBuoy size={16} /> Abrir central interna</span>
            <ExternalLink size={16} />
          </button>
        )}
      </div>
    );
  }

  function renderBugForm() {
    return (
      <div className="space-y-4">
        <Field label="Assunto">
          <input value={bugForm.title} onChange={(event) => setBugForm((current) => ({ ...current, title: event.target.value }))} className="w-full rounded-[18px] border border-[rgba(21,38,43,0.12)] bg-white px-4 py-3 outline-none" placeholder="Resumo curto do problema" />
        </Field>
        <Field label="Descrição do bug">
          <textarea value={bugForm.description} onChange={(event) => setBugForm((current) => ({ ...current, description: event.target.value }))} rows={5} className="w-full rounded-[18px] border border-[rgba(21,38,43,0.12)] bg-white px-4 py-3 outline-none" placeholder="Descreva o que aconteceu, o resultado esperado e qualquer detalhe útil." />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Severidade">
            <select value={bugForm.severity} onChange={(event) => setBugForm((current) => ({ ...current, severity: event.target.value }))} className="w-full rounded-[18px] border border-[rgba(21,38,43,0.12)] bg-white px-4 py-3 outline-none">
              {BUG_SEVERITIES.map((severity) => <option key={severity} value={severity}>{severity}</option>)}
            </select>
          </Field>
          <Field label="Canal de notificação">
            <select value={bugForm.channel} onChange={(event) => setBugForm((current) => ({ ...current, channel: event.target.value }))} className="w-full rounded-[18px] border border-[rgba(21,38,43,0.12)] bg-white px-4 py-3 outline-none">
              {SUPPORT_CHANNELS.map((channel) => <option key={channel} value={channel}>{channel}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Screenshot ou evidência (opcional)" hint="Cole um link, caminho local ou observação adicional para acelerar a triagem.">
          <input value={bugForm.evidence} onChange={(event) => setBugForm((current) => ({ ...current, evidence: event.target.value }))} className="w-full rounded-[18px] border border-[rgba(21,38,43,0.12)] bg-white px-4 py-3 outline-none" placeholder="Ex: print do erro, link ou referência visual" />
        </Field>
        <div className="rounded-[20px] border border-[rgba(21,38,43,0.08)] bg-[rgba(248,251,255,0.7)] px-4 py-3 text-sm text-[var(--ink-soft)]">
          Contexto automático: {context.module} / {context.page} {context.clientName ? `• ${context.clientName}` : ''}
        </div>
        <button
          onClick={() => handleCreateTicket('bug', {
            title: bugForm.title,
            message: bugForm.description,
            channel: bugForm.channel,
            extras: { severity: bugForm.severity, evidence: bugForm.evidence },
          })}
          disabled={!bugForm.title.trim() || !bugForm.description.trim()}
          className="btn-primary flex w-full items-center justify-center gap-2 rounded-full py-3 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Bug size={16} /> Registrar bug
        </button>
      </div>
    );
  }

  function renderLegalForm() {
    return (
      <div className="space-y-4">
        <div className="rounded-[20px] border border-[rgba(214,255,99,0.24)] bg-[rgba(214,255,99,0.14)] px-4 py-3 text-sm text-[var(--ink)]">
          <p className="font-semibold">Destino atual: {legalDestination.name}</p>
          <p className="mt-1 text-[var(--ink-soft)]">{legalDestination.email}</p>
          {legalDestination.note ? <p className="mt-2 text-xs text-[var(--ink-soft)]">{legalDestination.note}</p> : null}
        </div>
        <Field label="Assunto">
          <input value={legalForm.title} onChange={(event) => setLegalForm((current) => ({ ...current, title: event.target.value }))} className="w-full rounded-[18px] border border-[rgba(21,38,43,0.12)] bg-white px-4 py-3 outline-none" placeholder="Resumo da dúvida jurídica" />
        </Field>
        <Field label="Mensagem">
          <textarea value={legalForm.message} onChange={(event) => setLegalForm((current) => ({ ...current, message: event.target.value }))} rows={5} className="w-full rounded-[18px] border border-[rgba(21,38,43,0.12)] bg-white px-4 py-3 outline-none" placeholder="Explique a dúvida, o contexto e o que precisa ser esclarecido." />
        </Field>
        <Field label="Canal de contato">
          <select value={legalForm.channel} onChange={(event) => setLegalForm((current) => ({ ...current, channel: event.target.value }))} className="w-full rounded-[18px] border border-[rgba(21,38,43,0.12)] bg-white px-4 py-3 outline-none">
            {SUPPORT_CHANNELS.map((channel) => <option key={channel} value={channel}>{channel}</option>)}
          </select>
        </Field>
        <div className="rounded-[20px] border border-[rgba(21,38,43,0.08)] bg-[rgba(248,251,255,0.7)] px-4 py-3 text-sm text-[var(--ink-soft)]">
          Contexto automático: {context.module} / {context.page} {context.clientName ? `• ${context.clientName}` : ''}
        </div>
        <button
          onClick={() => handleCreateTicket('legal', {
            title: legalForm.title,
            message: legalForm.message,
            channel: legalForm.channel,
            extras: { destinationNote: legalDestination.note },
          })}
          disabled={!legalForm.title.trim() || !legalForm.message.trim()}
          className="btn-primary flex w-full items-center justify-center gap-2 rounded-full py-3 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ShieldCheck size={16} /> Enviar dúvida
        </button>
      </div>
    );
  }

  function renderSuggestionForm() {
    return (
      <div className="space-y-4">
        <Field label="Título da sugestão">
          <input value={suggestionForm.title} onChange={(event) => setSuggestionForm((current) => ({ ...current, title: event.target.value }))} className="w-full rounded-[18px] border border-[rgba(21,38,43,0.12)] bg-white px-4 py-3 outline-none" placeholder="Resumo da melhoria desejada" />
        </Field>
        <Field label="Sugestão">
          <textarea value={suggestionForm.description} onChange={(event) => setSuggestionForm((current) => ({ ...current, description: event.target.value }))} rows={5} className="w-full rounded-[18px] border border-[rgba(21,38,43,0.12)] bg-white px-4 py-3 outline-none" placeholder="Descreva a melhoria e em que parte do sistema ela ajudaria." />
        </Field>
        <Field label="Benefício esperado">
          <textarea value={suggestionForm.benefit} onChange={(event) => setSuggestionForm((current) => ({ ...current, benefit: event.target.value }))} rows={3} className="w-full rounded-[18px] border border-[rgba(21,38,43,0.12)] bg-white px-4 py-3 outline-none" placeholder="Ex: reduzir cliques, melhorar clareza, evitar erro operacional." />
        </Field>
        <Field label="Canal de notificação">
          <select value={suggestionForm.channel} onChange={(event) => setSuggestionForm((current) => ({ ...current, channel: event.target.value }))} className="w-full rounded-[18px] border border-[rgba(21,38,43,0.12)] bg-white px-4 py-3 outline-none">
            {SUPPORT_CHANNELS.map((channel) => <option key={channel} value={channel}>{channel}</option>)}
          </select>
        </Field>
        <div className="rounded-[20px] border border-[rgba(21,38,43,0.08)] bg-[rgba(248,251,255,0.7)] px-4 py-3 text-sm text-[var(--ink-soft)]">
          Contexto automático: {context.module} / {context.page} {context.clientName ? `• ${context.clientName}` : ''}
        </div>
        <button
          onClick={() => handleCreateTicket('suggestion', {
            title: suggestionForm.title,
            message: suggestionForm.description,
            channel: suggestionForm.channel,
            extras: { benefit: suggestionForm.benefit },
          })}
          disabled={!suggestionForm.title.trim() || !suggestionForm.description.trim()}
          className="btn-primary flex w-full items-center justify-center gap-2 rounded-full py-3 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Lightbulb size={16} /> Enviar sugestão
        </button>
      </div>
    );
  }

  function renderMyTickets() {
    if (activeTicket) {
      return (
        <div className="space-y-4">
          <div className="rounded-[24px] border border-[rgba(21,38,43,0.08)] bg-white/82 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-syne text-xl font-bold text-[var(--ink)]">{activeTicket.title}</p>
                <p className="mt-1 text-sm text-[var(--ink-soft)]">{activeTicket.protocol}</p>
              </div>
              <span className={`rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.16em] ${getSupportStatusTone(activeTicket.status)}`}>{activeTicket.status}</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className={`rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.16em] ${getSupportTypeTone(activeTicket.type)}`}>{SUPPORT_TYPES[activeTicket.type]?.label}</span>
              <span className="rounded-full bg-[rgba(21,38,43,0.06)] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--ink-soft)]">{formatDateTime(activeTicket.createdAt)}</span>
            </div>
          </div>
          <div className="rounded-[20px] border border-[rgba(21,38,43,0.08)] bg-white/82 p-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--ink-soft)]">Mensagem enviada</p>
            <p className="mt-2 text-sm leading-6 text-[var(--ink)]">{activeTicket.message}</p>
          </div>
          <div className="rounded-[20px] border border-[rgba(21,38,43,0.08)] bg-white/82 p-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--ink-soft)]">Destino</p>
            <p className="mt-2 text-sm font-semibold text-[var(--ink)]">{activeTicket.destination?.name}</p>
            <p className="mt-1 text-sm text-[var(--ink-soft)]">{activeTicket.destination?.email}</p>
          </div>
          <div className="rounded-[20px] border border-[rgba(21,38,43,0.08)] bg-white/82 p-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--ink-soft)]">Resposta</p>
            <p className="mt-2 text-sm leading-6 text-[var(--ink)]">{activeTicket.response || 'Ainda sem resposta registrada.'}</p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {myTickets.length === 0 ? (
          <div className="rounded-[24px] border border-dashed border-[rgba(21,38,43,0.12)] bg-white/70 px-4 py-10 text-center text-[var(--ink-soft)]">
            Nenhum envio registrado ainda.
          </div>
        ) : myTickets.map((ticket) => <TicketRow key={ticket.id} ticket={ticket} onOpen={setActiveTicket} />)}
      </div>
    );
  }

  function renderDone() {
    if (!feedback?.ticket) return null;
    return (
      <div className="space-y-4">
        <div className="rounded-[24px] border border-[rgba(214,255,99,0.28)] bg-[rgba(214,255,99,0.18)] p-5">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-[16px] bg-[#173038] text-[#d6ff63]">
              <ShieldCheck size={18} />
            </span>
            <div>
              <p className="font-syne text-xl font-bold text-[var(--ink)]">Envio registrado</p>
              <p className="mt-1 text-sm text-[var(--ink-soft)]">{feedback.message}</p>
            </div>
          </div>
        </div>
        <div className="rounded-[24px] border border-[rgba(21,38,43,0.08)] bg-white/82 p-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--ink-soft)]">Protocolo</p>
          <p className="mt-2 font-syne text-2xl font-bold text-[var(--ink)]">{feedback.ticket.protocol}</p>
          <p className="mt-2 text-sm text-[var(--ink-soft)]">Destino: {feedback.ticket.destination?.name}</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <button onClick={() => { setView('my'); setActiveTicket(feedback.ticket); }} className="rounded-full border border-[rgba(21,38,43,0.12)] bg-white px-4 py-3 text-sm font-semibold text-[var(--ink)] transition-colors hover:bg-[rgba(248,251,255,0.9)]">
            Abrir em Meus envios
          </button>
          <button onClick={() => { resetForms(); goToMenu(); }} className="btn-primary rounded-full py-3 text-sm font-semibold">
            Fechar
          </button>
        </div>
      </div>
    );
  }

  const titles = {
    menu: { eyebrow: 'Ajuda e suporte', title: 'Como posso ajudar?', description: 'Use um atalho rápido para registrar bug, falar com o jurídico ou acompanhar o que você já enviou.' },
    bug: { eyebrow: 'Reportar bug', title: 'Registrar problema', description: 'Salva o relato internamente, notifica a central de bugs e mantém protocolo para acompanhamento.' },
    legal: { eyebrow: 'Advogado responsável', title: 'Enviar dúvida jurídica', description: 'Registra a dúvida no sistema e aciona o responsável por e-mail, Teams ou ambos.' },
    suggestion: { eyebrow: 'Sugestão de melhoria', title: 'Enviar ideia', description: 'Registre melhorias de produto e mantenha visibilidade sobre análise e priorização.' },
    my: { eyebrow: 'Meus envios', title: activeTicket ? 'Detalhe do envio' : 'Acompanhar solicitações', description: activeTicket ? 'Veja status, destino e eventual resposta registrada.' : 'Acompanhe bugs, dúvidas e sugestões já abertas por você.' },
    done: { eyebrow: 'Confirmação', title: 'Solicitação registrada', description: 'O envio foi salvo no portal e encaminhado para a fila ou responsável correto.' },
  };

  const currentHeader = titles[view];

  return (
    <>
      <div className="fixed bottom-5 right-5 z-[70] md:bottom-6 md:right-6">
        <button
          onClick={() => setOpen((current) => !current)}
          className="group flex h-14 items-center gap-3 rounded-full border border-[rgba(21,38,43,0.12)] bg-[#173038] px-4 text-white shadow-[0_18px_40px_rgba(21,38,43,0.22)] transition-all hover:-translate-y-0.5 hover:bg-[#10252d]"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10">
            <LifeBuoy size={18} />
          </span>
          <div className="hidden text-left sm:block">
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#d6ff63]">Ajuda</div>
            <div className="text-sm font-semibold">Suporte rápido</div>
          </div>
          {openCount > 0 && (
            <span className="flex h-6 min-w-[24px] items-center justify-center rounded-full bg-[#d6ff63] px-1.5 text-[11px] font-bold text-[#15262b]">
              {openCount}
            </span>
          )}
        </button>
      </div>

      {open && (
        <div className="fixed bottom-24 right-4 z-[69] w-[min(94vw,420px)] max-h-[calc(100vh-7.5rem)] overflow-hidden rounded-[34px] border border-[rgba(21,38,43,0.12)] bg-[rgba(255,251,244,0.96)] shadow-[0_28px_72px_rgba(21,38,43,0.22)] backdrop-blur-[16px] md:right-6">
          <div className="flex items-start justify-between gap-4 border-b border-[rgba(21,38,43,0.08)] px-5 py-4">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--ink-soft)]">{currentHeader.eyebrow}</p>
              <h2 className="mt-2 font-syne text-[1.7rem] font-bold leading-tight text-[var(--ink)]">{currentHeader.title}</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--ink-soft)]">{currentHeader.description}</p>
            </div>
            <button onClick={() => setOpen(false)} className="rounded-full border border-[rgba(21,38,43,0.08)] bg-white/82 p-2 text-[var(--ink-soft)] transition-colors hover:bg-white hover:text-[var(--ink)]">
              <X size={16} />
            </button>
          </div>

          <div className="max-h-[calc(100vh-18rem)] overflow-y-auto px-5 py-4">
            {view === 'menu' ? renderMenu() : null}
            {view === 'bug' ? renderBugForm() : null}
            {view === 'legal' ? renderLegalForm() : null}
            {view === 'suggestion' ? renderSuggestionForm() : null}
            {view === 'my' ? renderMyTickets() : null}
            {view === 'done' ? renderDone() : null}
          </div>

          <div className="border-t border-[rgba(21,38,43,0.08)] bg-white/62 px-5 py-3">
            <div className="flex items-center justify-between gap-3">
              {view !== 'menu' ? (
                <button onClick={activeTicket ? () => setActiveTicket(null) : goToMenu} className="inline-flex items-center gap-2 rounded-full border border-[rgba(21,38,43,0.12)] bg-white px-4 py-2 text-sm font-semibold text-[var(--ink)] transition-colors hover:bg-[rgba(248,251,255,0.9)]">
                  <ArrowLeft size={14} /> Voltar
                </button>
              ) : (
                <span className="inline-flex items-center gap-2 text-xs text-[var(--ink-soft)]"><HelpCircle size={13} /> Sempre disponível no canto da tela</span>
              )}
              {view === 'menu' && user?.role === 'admin' ? (
                <button onClick={() => { setOpen(false); navigate('/admin/suporte'); }} className="inline-flex items-center gap-2 rounded-full bg-[rgba(23,48,56,0.08)] px-4 py-2 text-sm font-semibold text-[var(--ink)] transition-colors hover:bg-[rgba(23,48,56,0.12)]">
                  <ExternalLink size={14} /> Central interna
                </button>
              ) : null}
              {view === 'my' && activeTicket ? (
                <div className="flex items-center gap-2">
                  <button onClick={() => window.open(buildSupportMailto(activeTicket), '_self')} className="inline-flex items-center gap-2 rounded-full border border-[rgba(21,38,43,0.12)] bg-white px-4 py-2 text-sm font-semibold text-[var(--ink)] transition-colors hover:bg-[rgba(248,251,255,0.9)]">
                    <Mail size={14} /> E-mail
                  </button>
                  <button onClick={() => window.open(buildSupportTeamsUrl(activeTicket), '_blank', 'noopener,noreferrer')} className="inline-flex items-center gap-2 rounded-full bg-[#173038] px-4 py-2 text-sm font-semibold text-white">
                    <Send size={14} /> Teams
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
