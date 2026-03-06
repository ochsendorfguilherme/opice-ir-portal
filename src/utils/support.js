import { fetchClients, generateId, getStorage, KEYS, setStorage } from './storage';

function emitSupportUpdate() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('opice-support-updated'));
  }
}

export const SUPPORT_TYPES = {
  bug: {
    id: 'bug',
    label: 'Reportar bug',
    queue: 'Central de Bugs',
    defaultStatus: 'Novo',
    statuses: ['Novo', 'Em triagem', 'Em correção', 'Resolvido', 'Fechado'],
    destination: {
      name: 'Central de Bugs',
      email: 'suporte.portal@opice.com.br',
      teamsUsers: ['suporte.portal@opice.com.br'],
    },
  },
  legal: {
    id: 'legal',
    label: 'Falar com o Advogado responsável',
    queue: 'Inbox Jurídica',
    defaultStatus: 'Nova',
    statuses: ['Nova', 'Respondida', 'Encaminhada', 'Fechada'],
  },
  suggestion: {
    id: 'suggestion',
    label: 'Sugestão de melhoria',
    queue: 'Central de Sugestões',
    defaultStatus: 'Nova',
    statuses: ['Nova', 'Em análise', 'Planejada', 'Implementada', 'Não priorizada', 'Fechada'],
    destination: {
      name: 'Central de Sugestões',
      email: 'produto.portal@opice.com.br',
      teamsUsers: ['produto.portal@opice.com.br'],
    },
  },
};

export const SUPPORT_CHANNELS = ['E-mail', 'Teams', 'E-mail + Teams'];

const CONTEXT_PATTERNS = [
  { match: /\/admin\/privacidade/, module: 'Gestão de Privacidade', page: 'Privacidade' },
  { match: /\/admin\/financeiro/, module: 'Módulo Financeiro', page: 'Financeiro' },
  { match: /\/admin\/avaliacao-terceiro/, module: 'Módulo de Avaliação de Terceiro', page: 'Avaliação de Terceiro' },
  { match: /\/admin\/riscos/, module: 'Módulo de Riscos', page: 'Riscos' },
  { match: /\/admin\/suporte/, module: 'Suporte', page: 'Central interna' },
  { match: /\/admin\/modulos/, module: 'Portal Executivo', page: 'Seleção de módulos' },
  { match: /\/admin\/cliente\/[^/]+\/anpd/, module: 'ANPD', page: 'Acompanhamento ANPD' },
  { match: /\/admin\/cliente\/[^/]+\/pmo\/warroom|\/pmo\/warroom/, module: 'War Room', page: 'War Room — Comitê de Crise' },
  { match: /\/admin\/cliente\/[^/]+\/pmo\/resumo-c-level|\/pmo\/resumo-c-level/, module: 'PMO', page: 'Resumo C-Level' },
  { match: /\/admin\/cliente\/[^/]+\/pmo|\/pmo/, module: 'PMO', page: 'IR-PMO' },
  { match: /\/admin\/cliente\/[^/]+\/reunioes|\/reunioes/, module: 'Reuniões', page: 'Reuniões do incidente' },
  { match: /\/admin\/cliente\/[^/]+\/jornada|\/jornada/, module: 'Jornada', page: 'Jornada do incidente' },
  { match: /\/admin\/cliente\/[^/]+\/perguntas|\/perguntas/, module: 'Perguntas', page: 'Perguntas do incidente' },
  { match: /\/admin\/cliente\/[^/]+\/informacoes|\/informacoes/, module: 'Informações', page: 'Informações do incidente' },
  { match: /\/admin\/acessos/, module: 'Admin', page: 'Gestão de acessos' },
  { match: /\/admin$/, module: 'Admin', page: 'Gestão de Incidentes' },
  { match: /\/dashboard$/, module: 'Dashboard', page: 'Dashboard do incidente' },
];

function nowIso() {
  return new Date().toISOString();
}

function getClientIdFromPath(pathname, user) {
  const adminMatch = pathname.match(/\/admin\/cliente\/([^/]+)/);
  if (adminMatch?.[1]) return adminMatch[1];
  return user?.clientId || null;
}

export function getClientName(clientId) {
  if (!clientId) return null;
  const info = getStorage(KEYS.info(clientId), {});
  if (info?.nomeCliente) return info.nomeCliente;
  const found = fetchClients().find((client) => client.id === clientId);
  return found?.displayName || found?.name || clientId;
}

export function getPageContext(pathname, user) {
  const current = CONTEXT_PATTERNS.find((entry) => entry.match.test(pathname));
  const clientId = getClientIdFromPath(pathname, user);

  return {
    pathname,
    module: current?.module || 'Portal',
    page: current?.page || 'Tela atual',
    clientId,
    clientName: getClientName(clientId),
  };
}

function buildTeamsUrl(users, ticket) {
  const normalizedUsers = (users || []).filter(Boolean).map((user) => encodeURIComponent(user)).join(',');
  if (!normalizedUsers) return 'https://teams.microsoft.com';
  const seed = encodeURIComponent(`${ticket.protocol} - ${ticket.title}`);
  return `https://teams.microsoft.com/l/chat/0/0?users=${normalizedUsers}&topicName=${seed}`;
}

function resolveLegalDestination(context) {
  if (context.module === 'Gestão de Privacidade' || context.module === 'ANPD') {
    return {
      queue: SUPPORT_TYPES.legal.queue,
      name: 'Coordenação de Privacidade e DPO',
      email: 'privacidade@opice.com.br',
      teamsUsers: ['privacidade@opice.com.br'],
      fallbackUsed: true,
      note: 'Advogado responsável não identificado automaticamente. Encaminhado para a fila jurídica de privacidade.',
    };
  }

  if (context.module === 'War Room' || context.module === 'PMO') {
    return {
      queue: SUPPORT_TYPES.legal.queue,
      name: 'Coordenação Jurídica de Crise',
      email: 'juridico.crise@opice.com.br',
      teamsUsers: ['juridico.crise@opice.com.br'],
      fallbackUsed: true,
      note: 'Advogado responsável não identificado automaticamente. Encaminhado para a coordenação jurídica de crise.',
    };
  }

  return {
    queue: SUPPORT_TYPES.legal.queue,
    name: 'Coordenação Jurídica',
    email: 'juridico@opice.com.br',
    teamsUsers: ['juridico@opice.com.br'],
    fallbackUsed: true,
    note: 'Advogado responsável não identificado automaticamente. Encaminhado para a fila jurídica padrão.',
  };
}

export function resolveSupportDestination(type, context) {
  if (type === 'legal') {
    const legal = resolveLegalDestination(context);
    return {
      ...legal,
      teamsUrl: buildTeamsUrl(legal.teamsUsers, { protocol: 'LEGAL', title: context.page }),
    };
  }

  const base = SUPPORT_TYPES[type]?.destination;
  return {
    queue: SUPPORT_TYPES[type]?.queue || 'Central interna',
    name: base?.name || 'Central interna',
    email: base?.email || 'atendimento@opice.com.br',
    teamsUsers: base?.teamsUsers || [],
    fallbackUsed: false,
    note: '',
    teamsUrl: buildTeamsUrl(base?.teamsUsers || [], { protocol: type.toUpperCase(), title: context.page }),
  };
}

function createProtocol(type) {
  const date = new Date();
  const stamp = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
  const prefix = type === 'bug' ? 'BUG' : type === 'legal' ? 'JUR' : 'IDEIA';
  return `${prefix}-${stamp}-${generateId('')}`;
}

export function getSupportTickets() {
  return getStorage(KEYS.supportTickets(), []);
}

export function saveSupportTickets(tickets) {
  setStorage(KEYS.supportTickets(), tickets);
  emitSupportUpdate();
}

function isDuplicateTicket(tickets, payload) {
  const recentCutoff = Date.now() - (2 * 60 * 1000);
  return tickets.find((ticket) => (
    ticket.type === payload.type
    && ticket.title === payload.title
    && ticket.message === payload.message
    && ticket.requester.email === payload.requester.email
    && ticket.context.pathname === payload.context.pathname
    && new Date(ticket.createdAt).getTime() >= recentCutoff
    && !['Fechado', 'Resolvido', 'Implementada', 'Não priorizada'].includes(ticket.status)
  )) || null;
}

export function createSupportTicket({
  type,
  title,
  message,
  channel,
  requester,
  context,
  destination,
  extras = {},
}) {
  const tickets = getSupportTickets();
  const payload = {
    type,
    title: String(title || '').trim(),
    message: String(message || '').trim(),
    requester,
    context,
  };

  const duplicate = isDuplicateTicket(tickets, payload);
  if (duplicate) {
    return { ticket: duplicate, duplicate: true };
  }

  const timestamp = nowIso();
  const ticket = {
    id: generateId('SUP_'),
    protocol: createProtocol(type),
    type,
    title: payload.title,
    message: payload.message,
    channel,
    status: SUPPORT_TYPES[type]?.defaultStatus || 'Novo',
    requester,
    context,
    destination,
    createdAt: timestamp,
    updatedAt: timestamp,
    response: '',
    responseAt: '',
    responseBy: '',
    notes: '',
    ...extras,
  };

  saveSupportTickets([ticket, ...tickets]);
  return { ticket, duplicate: false };
}

export function updateSupportTicket(ticketId, patch) {
  const tickets = getSupportTickets();
  const updated = tickets.map((ticket) => (
    ticket.id === ticketId
      ? { ...ticket, ...patch, updatedAt: nowIso() }
      : ticket
  ));
  saveSupportTickets(updated);
  return updated.find((ticket) => ticket.id === ticketId) || null;
}

export function getMySupportTickets(email) {
  const normalized = String(email || '').trim().toLowerCase();
  return getSupportTickets().filter((ticket) => String(ticket.requester?.email || '').trim().toLowerCase() === normalized);
}

export function getSupportTicketsByType(type) {
  return getSupportTickets().filter((ticket) => ticket.type === type);
}

export function buildSupportMailto(ticket) {
  const subject = encodeURIComponent(`[${ticket.protocol}] ${ticket.title}`);
  const body = encodeURIComponent(
    `Olá,\n\n` +
    `Foi registrado um novo envio interno no portal.\n\n` +
    `Tipo: ${SUPPORT_TYPES[ticket.type]?.label || ticket.type}\n` +
    `Protocolo: ${ticket.protocol}\n` +
    `Solicitante: ${ticket.requester?.name || ticket.requester?.email}\n` +
    `Contexto: ${ticket.context?.module || 'Portal'} / ${ticket.context?.page || 'Tela atual'}\n` +
    `Rota: ${ticket.context?.pathname || '-'}\n` +
    `${ticket.context?.clientName ? `Cliente: ${ticket.context.clientName}\n` : ''}` +
    `Canal escolhido: ${ticket.channel}\n\n` +
    `Assunto:\n${ticket.title}\n\n` +
    `Mensagem:\n${ticket.message}\n\n` +
    `${ticket.severity ? `Severidade: ${ticket.severity}\n` : ''}` +
    `${ticket.benefit ? `Benefício esperado: ${ticket.benefit}\n` : ''}` +
    `${ticket.evidence ? `Evidência: ${ticket.evidence}\n` : ''}` +
    `Atenciosamente,\nPortal Opice IR`
  );
  return `mailto:${ticket.destination?.email || ''}?subject=${subject}&body=${body}`;
}

export function buildSupportTeamsUrl(ticket) {
  const recipients = ticket.destination?.teamsUsers || (ticket.destination?.email ? [ticket.destination.email] : []);
  return buildTeamsUrl(recipients, ticket);
}

export function getSupportStatusTone(status) {
  if (['Resolvido', 'Implementada', 'Respondida'].includes(status)) return 'bg-emerald-100 text-emerald-800 border-emerald-200';
  if (['Em correção', 'Em análise', 'Encaminhada', 'Planejada'].includes(status)) return 'bg-amber-100 text-amber-800 border-amber-200';
  if (['Fechado', 'Não priorizada'].includes(status)) return 'bg-slate-100 text-slate-700 border-slate-200';
  return 'bg-sky-100 text-sky-800 border-sky-200';
}

export function getSupportTypeTone(type) {
  if (type === 'bug') return 'bg-rose-100 text-rose-800 border-rose-200';
  if (type === 'legal') return 'bg-violet-100 text-violet-800 border-violet-200';
  return 'bg-emerald-100 text-emerald-800 border-emerald-200';
}
