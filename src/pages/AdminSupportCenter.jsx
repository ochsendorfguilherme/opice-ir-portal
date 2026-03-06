import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle2, LifeBuoy, LogOut, Mail, MessagesSquare, Send, Sparkles, Users2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import OpiceLogo from '../components/OpiceLogo';
import TLPBanner from '../components/TLPBanner';
import { addNotification } from '../utils/storage';
import {
  SUPPORT_TYPES,
  buildSupportMailto,
  buildSupportTeamsUrl,
  getSupportStatusTone,
  getSupportTickets,
  getSupportTicketsByType,
  getSupportTypeTone,
  updateSupportTicket,
} from '../utils/support';

const TABS = [
  { id: 'bug', label: 'Central de Bugs', icon: LifeBuoy },
  { id: 'legal', label: 'Inbox Jurídica', icon: MessagesSquare },
  { id: 'suggestion', label: 'Central de Sugestões', icon: Sparkles },
];

function SummaryCard({ label, value, helper }) {
  return (
    <div className="rounded-[24px] border border-[rgba(21,38,43,0.08)] bg-white/80 p-5 shadow-[0_12px_28px_rgba(21,38,43,0.06)]">
      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-soft)]">{label}</div>
      <div className="mt-3 font-syne text-4xl font-bold text-[var(--ink)]">{value}</div>
      <p className="mt-2 text-sm leading-6 text-[var(--ink-soft)]">{helper}</p>
    </div>
  );
}

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

export default function AdminSupportCenter() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('bug');
  const [tickets, setTickets] = useState(() => getSupportTickets());
  const [selectedId, setSelectedId] = useState(() => getSupportTicketsByType('bug')[0]?.id || null);
  const [responseDraft, setResponseDraft] = useState(() => getSupportTicketsByType('bug')[0]?.response || '');

  const scopedTickets = useMemo(() => tickets.filter((ticket) => ticket.type === activeTab), [tickets, activeTab]);
  const selectedTicket = useMemo(
    () => scopedTickets.find((ticket) => ticket.id === selectedId) || scopedTickets[0] || null,
    [scopedTickets, selectedId],
  );

  const summary = useMemo(() => ({
    bug: tickets.filter((ticket) => ticket.type === 'bug').length,
    legal: tickets.filter((ticket) => ticket.type === 'legal').length,
    suggestion: tickets.filter((ticket) => ticket.type === 'suggestion').length,
    open: tickets.filter((ticket) => !['Fechado', 'Resolvido', 'Implementada'].includes(ticket.status)).length,
  }), [tickets]);

  const statusOptions = SUPPORT_TYPES[activeTab]?.statuses || [];

  useEffect(() => {
    const refresh = () => setTickets(getSupportTickets());
    window.addEventListener('opice-support-updated', refresh);
    return () => window.removeEventListener('opice-support-updated', refresh);
  }, []);

  function handleTabChange(tab) {
    setActiveTab(tab);
    const next = tickets.find((ticket) => ticket.type === tab);
    setSelectedId(next?.id || null);
    setResponseDraft(next?.response || '');
  }

  function handleSelectTicket(ticket) {
    setSelectedId(ticket.id);
    setResponseDraft(ticket.response || '');
  }

  function handleStatusChange(status) {
    if (!selectedTicket) return;
    const updated = updateSupportTicket(selectedTicket.id, {
      status,
      response: responseDraft,
      responseBy: user?.email || 'admin@opice.com.br',
      responseAt: responseDraft.trim() ? new Date().toISOString() : selectedTicket.responseAt,
    });
    if (updated?.context?.clientId) {
      addNotification(updated.context.clientId, {
        type: 'info',
        message: `Atualização no envio ${updated.protocol}: ${updated.status}`,
        link: updated.context.pathname,
      });
    }
    setTickets(getSupportTickets());
  }

  function handleSaveResponse() {
    if (!selectedTicket) return;
    const updated = updateSupportTicket(selectedTicket.id, {
      response: responseDraft,
      responseBy: user?.email || 'admin@opice.com.br',
      responseAt: new Date().toISOString(),
      status: selectedTicket.status,
    });
    if (updated?.context?.clientId) {
      addNotification(updated.context.clientId, {
        type: 'done',
        message: `Seu envio ${updated.protocol} recebeu uma resposta.`,
        link: updated.context.pathname,
      });
    }
    setTickets(getSupportTickets());
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(173,212,255,0.16),transparent_26%),linear-gradient(180deg,#f7f5ef_0%,#ece7dc_100%)] text-[var(--ink)]">
      <div className="mx-auto max-w-[1600px] px-5 pb-10 pt-5 md:px-8 md:pb-14 md:pt-6">
        <div className="rounded-[34px] border border-[rgba(21,38,43,0.1)] bg-[rgba(255,251,244,0.66)] px-4 py-3 shadow-[0_18px_42px_rgba(21,38,43,0.1)] backdrop-blur-[18px] md:px-5">
          <div className="flex flex-wrap items-center gap-4">
            <div className="min-w-0 flex-1"><TLPBanner /></div>
            <button onClick={() => navigate('/admin/modulos')} className="flex h-11 items-center gap-2 rounded-full border border-[rgba(21,38,43,0.12)] bg-white/78 px-4 font-dm text-xs font-semibold uppercase tracking-[0.16em] text-[#173038] shadow-[0_12px_24px_rgba(21,38,43,0.08)] transition-all hover:-translate-y-0.5 hover:bg-white"><ArrowLeft size={15} /> Módulos</button>
            <button onClick={() => { logout(); navigate('/login'); }} className="flex h-11 items-center gap-2 rounded-full border border-[rgba(21,38,43,0.12)] bg-white/78 px-4 font-dm text-xs font-semibold uppercase tracking-[0.16em] text-[#173038] shadow-[0_12px_24px_rgba(21,38,43,0.08)] transition-all hover:-translate-y-0.5 hover:bg-white"><LogOut size={15} /> Sair</button>
          </div>
        </div>

        <section className="mt-8 overflow-hidden rounded-[38px] border border-[rgba(21,38,43,0.1)] bg-[linear-gradient(180deg,rgba(248,250,255,0.96)_0%,rgba(241,244,250,0.95)_100%)] p-7 shadow-[0_28px_64px_rgba(21,38,43,0.12)] md:p-9">
          <OpiceLogo />
          <p className="section-kicker mt-6">Central interna</p>
          <div className="mt-4 flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-4xl">
              <h1 className="font-syne text-4xl font-extrabold uppercase tracking-[-0.05em] text-[var(--ink)] md:text-6xl">Suporte, dúvidas e melhorias</h1>
              <p className="mt-4 font-dm text-base leading-7 text-[var(--ink-soft)] md:text-lg">
                Receba bugs, dúvidas para o advogado responsável e sugestões de melhoria em uma única fila, com atualização de status e retorno ao usuário.
              </p>
            </div>
            <div className="flex h-16 w-16 items-center justify-center rounded-[22px] bg-[rgba(23,48,56,0.1)] text-[#173038]">
              <Users2 size={30} />
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <SummaryCard label="Bugs" value={summary.bug} helper="Entradas técnicas registradas no portal." />
            <SummaryCard label="Dúvidas jurídicas" value={summary.legal} helper="Mensagens para advogado responsável ou fila jurídica." />
            <SummaryCard label="Sugestões" value={summary.suggestion} helper="Ideias de melhoria e backlog operacional." />
            <SummaryCard label="Abertos" value={summary.open} helper="Itens ainda em análise, resposta ou execução." />
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-3 font-dm text-sm font-semibold transition-all ${active ? 'bg-[#173038] text-white shadow-[0_16px_32px_rgba(21,38,43,0.18)]' : 'border border-[rgba(21,38,43,0.1)] bg-white/80 text-[var(--ink)] hover:bg-white'}`}
                >
                  <Icon size={16} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,0.88fr)_minmax(340px,0.72fr)]">
            <div className="rounded-[30px] border border-[rgba(21,38,43,0.08)] bg-white/82 p-5 shadow-[0_16px_34px_rgba(21,38,43,0.08)]">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-soft)]">Fila</p>
                  <h2 className="mt-1 font-syne text-2xl font-bold text-[var(--ink)]">{SUPPORT_TYPES[activeTab]?.queue}</h2>
                </div>
                <span className="rounded-full bg-[rgba(21,38,43,0.06)] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--ink-soft)]">{scopedTickets.length} itens</span>
              </div>

              <div className="space-y-3">
                {scopedTickets.length === 0 ? (
                  <div className="rounded-[24px] border border-dashed border-[rgba(21,38,43,0.12)] bg-[rgba(248,251,255,0.7)] px-4 py-10 text-center text-[var(--ink-soft)]">
                    Nenhum item recebido nesta fila.
                  </div>
                ) : scopedTickets.map((ticket) => (
                  <button
                    key={ticket.id}
                    onClick={() => handleSelectTicket(ticket)}
                    className={`w-full rounded-[24px] border px-4 py-4 text-left transition-all ${selectedTicket?.id === ticket.id ? 'border-[#173038] bg-[rgba(23,48,56,0.08)] shadow-[0_12px_24px_rgba(21,38,43,0.08)]' : 'border-[rgba(21,38,43,0.08)] bg-white hover:bg-[rgba(248,251,255,0.9)]'}`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-syne text-lg font-bold text-[var(--ink)]">{ticket.title}</p>
                        <p className="mt-1 text-sm text-[var(--ink-soft)]">{ticket.requester?.name || ticket.requester?.email} • {ticket.context?.page}</p>
                      </div>
                      <span className={`rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.16em] ${getSupportStatusTone(ticket.status)}`}>
                        {ticket.status}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className={`rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.16em] ${getSupportTypeTone(ticket.type)}`}>{SUPPORT_TYPES[ticket.type]?.label}</span>
                      <span className="rounded-full bg-[rgba(21,38,43,0.06)] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--ink-soft)]">{ticket.protocol}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-[30px] border border-[rgba(21,38,43,0.08)] bg-white/82 p-5 shadow-[0_16px_34px_rgba(21,38,43,0.08)]">
              {!selectedTicket ? (
                <div className="rounded-[24px] border border-dashed border-[rgba(21,38,43,0.12)] bg-[rgba(248,251,255,0.7)] px-4 py-10 text-center text-[var(--ink-soft)]">
                  Selecione um item para revisar detalhes, status e resposta.
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-soft)]">Detalhe do envio</p>
                      <h2 className="mt-1 font-syne text-2xl font-bold text-[var(--ink)]">{selectedTicket.title}</h2>
                      <p className="mt-2 text-sm leading-6 text-[var(--ink-soft)]">{selectedTicket.message}</p>
                    </div>
                    <span className={`rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.16em] ${getSupportStatusTone(selectedTicket.status)}`}>{selectedTicket.status}</span>
                  </div>

                  <div className="mt-5 grid gap-3 md:grid-cols-2">
                    <div className="rounded-[22px] border border-[rgba(21,38,43,0.08)] bg-[rgba(248,251,255,0.74)] p-4">
                      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--ink-soft)]">Solicitante</p>
                      <p className="mt-2 text-sm font-semibold text-[var(--ink)]">{selectedTicket.requester?.name || 'Usuário do portal'}</p>
                      <p className="mt-1 text-sm text-[var(--ink-soft)]">{selectedTicket.requester?.email}</p>
                    </div>
                    <div className="rounded-[22px] border border-[rgba(21,38,43,0.08)] bg-[rgba(248,251,255,0.74)] p-4">
                      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--ink-soft)]">Destino</p>
                      <p className="mt-2 text-sm font-semibold text-[var(--ink)]">{selectedTicket.destination?.name}</p>
                      <p className="mt-1 text-sm text-[var(--ink-soft)]">{selectedTicket.destination?.email}</p>
                    </div>
                    <div className="rounded-[22px] border border-[rgba(21,38,43,0.08)] bg-[rgba(248,251,255,0.74)] p-4">
                      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--ink-soft)]">Contexto</p>
                      <p className="mt-2 text-sm font-semibold text-[var(--ink)]">{selectedTicket.context?.module} / {selectedTicket.context?.page}</p>
                      <p className="mt-1 text-sm text-[var(--ink-soft)]">{selectedTicket.context?.pathname}</p>
                    </div>
                    <div className="rounded-[22px] border border-[rgba(21,38,43,0.08)] bg-[rgba(248,251,255,0.74)] p-4">
                      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--ink-soft)]">Registro</p>
                      <p className="mt-2 text-sm font-semibold text-[var(--ink)]">{selectedTicket.protocol}</p>
                      <p className="mt-1 text-sm text-[var(--ink-soft)]">{formatDateTime(selectedTicket.createdAt)}</p>
                    </div>
                  </div>

                  <div className="mt-5 space-y-4">
                    <label className="space-y-1.5 text-sm text-[var(--ink-soft)]">
                      <span className="font-mono text-[10px] uppercase tracking-[0.18em]">Status</span>
                      <select
                        value={selectedTicket.status}
                        onChange={(event) => handleStatusChange(event.target.value)}
                        className="w-full rounded-[18px] border border-[rgba(21,38,43,0.12)] bg-white px-4 py-3 text-[var(--ink)] outline-none"
                      >
                        {statusOptions.map((status) => <option key={status} value={status}>{status}</option>)}
                      </select>
                    </label>

                    <label className="space-y-1.5 text-sm text-[var(--ink-soft)]">
                      <span className="font-mono text-[10px] uppercase tracking-[0.18em]">Resposta interna</span>
                      <textarea
                        rows={6}
                        value={responseDraft}
                        onChange={(event) => setResponseDraft(event.target.value)}
                        className="w-full rounded-[18px] border border-[rgba(21,38,43,0.12)] bg-white px-4 py-3 text-[var(--ink)] outline-none"
                        placeholder="Registre a resposta, encaminhamento ou atualização para o solicitante."
                      />
                    </label>

                    <div className="flex flex-wrap gap-2">
                      <button onClick={handleSaveResponse} className="inline-flex items-center gap-2 rounded-full bg-[#173038] px-4 py-3 font-dm text-sm font-semibold text-white shadow-[0_14px_28px_rgba(21,38,43,0.18)] transition-all hover:-translate-y-0.5">
                        <CheckCircle2 size={16} /> Salvar resposta
                      </button>
                      <button onClick={() => window.open(buildSupportMailto(selectedTicket), '_self')} className="inline-flex items-center gap-2 rounded-full border border-[rgba(21,38,43,0.12)] bg-white px-4 py-3 font-dm text-sm font-semibold text-[var(--ink)] transition-colors hover:bg-[rgba(248,251,255,0.9)]">
                        <Mail size={16} /> Abrir e-mail
                      </button>
                      <button onClick={() => window.open(buildSupportTeamsUrl(selectedTicket), '_blank', 'noopener,noreferrer')} className="inline-flex items-center gap-2 rounded-full border border-[rgba(21,38,43,0.12)] bg-white px-4 py-3 font-dm text-sm font-semibold text-[var(--ink)] transition-colors hover:bg-[rgba(248,251,255,0.9)]">
                        <Send size={16} /> Abrir Teams
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
