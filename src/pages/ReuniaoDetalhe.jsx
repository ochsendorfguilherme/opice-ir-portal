import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  ChevronLeft,
  ClipboardCheck,
  Clock3,
  Download,
  FileText,
  Mail,
  Plus,
  Send,
  ShieldCheck,
  StopCircle,
  Users,
  X,
} from 'lucide-react';
import jsPDF from 'jspdf';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import { getStorage, KEYS, setStorage } from '../utils/storage';
import PendencyEditorModal from '../components/meetings/PendencyEditorModal';
import { PENDENCY_TREATMENT_OPTIONS, getPendencyAtaText, getPendencyDeadlineBadge, syncMeetingPendenciesToPMO } from '../utils/meetingPendencies';

const CATEGORY_META = {
  'Decisão': { label: 'Decisão', tone: 'border-sky-200 bg-sky-50 text-sky-800' },
  'Tarefa': { label: 'Tarefa', tone: 'border-lime-200 bg-lime-50 text-lime-900' },
  'Pendência': { label: 'Pendência', tone: 'border-amber-200 bg-amber-50 text-amber-800' },
  'Observação': { label: 'Observação', tone: 'border-slate-200 bg-slate-50 text-slate-700' },
};

function pad(value) {
  return String(value).padStart(2, '0');
}

function fmtElapsed(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

function fmtItemTs(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${pad(minutes)}:${pad(seconds)}`;
}

function fmtDate(dateStr) {
  if (!dateStr) return '—';
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

function diffMinutes(startIso, endIso) {
  if (!startIso || !endIso) return '—';
  const diff = Math.max(0, Math.round((new Date(endIso) - new Date(startIso)) / 60000));
  return `${diff} min`;
}

function normalizeParticipant(raw, index = 0) {
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    const mailMatch = trimmed.match(/^(.*?)\s*<([^>]+)>$/);
    if (mailMatch) {
      return { id: `PART_${index}_${mailMatch[2].toLowerCase()}`, name: mailMatch[1].trim() || mailMatch[2].trim(), email: mailMatch[2].trim().toLowerCase() };
    }
    return { id: `PART_${index}_${trimmed.toLowerCase().replace(/\s+/g, '_')}`, name: trimmed, email: '' };
  }
  const name = raw?.name?.trim() || raw?.nome?.trim() || raw?.email?.trim() || `Participante ${index + 1}`;
  const email = raw?.email?.trim().toLowerCase() || '';
  return { id: raw?.id || `PART_${index}_${(email || name).toLowerCase().replace(/\s+/g, '_')}`, name, email };
}

function createRequestId(participant) {
  return `APR_${(participant.email || participant.name).toLowerCase().replace(/[^a-z0-9]+/g, '_')}`;
}

function normalizeRequest(request, participant) {
  return {
    id: request?.id || createRequestId(participant),
    name: participant.name,
    email: participant.email,
    status: request?.status || 'pending',
    note: request?.note || '',
    sentAt: request?.sentAt || null,
    respondedAt: request?.respondedAt || null,
  };
}

function buildAtaSections(items = []) {
  return {
    decisoes: items.filter((item) => item.categoria === 'Decisão'),
    tarefas: items.filter((item) => item.categoria === 'Tarefa'),
    pendencias: items.filter((item) => item.categoria === 'Pendência'),
    observacoes: items.filter((item) => item.categoria === 'Observação'),
  };
}

function getAtaStatus(ata) {
  const requests = Array.isArray(ata?.requests) ? ata.requests : [];
  const responded = requests.filter((request) => request.respondedAt);
  const pending = requests.filter((request) => !request.respondedAt);
  const withNotes = responded.filter((request) => request.status === 'approved_with_notes');

  if (!ata?.generatedAt) return { label: 'Rascunho', tone: 'draft' };
  if (!ata?.sentAt) return { label: 'Rascunho', tone: 'draft' };
  if (responded.length === 0) return { label: 'Enviada para aprovação', tone: 'sent' };
  if (pending.length > 0) return { label: 'Aprovada parcialmente', tone: 'partial' };
  if (withNotes.length > 0) return { label: 'Aprovada com observações', tone: 'warning' };
  return { label: 'Aprovada', tone: 'success' };
}

function getAtaToneClasses(tone) {
  switch (tone) {
    case 'draft':
      return 'border-[rgba(21,38,43,0.12)] bg-white text-[var(--ink-soft)]';
    case 'sent':
      return 'border-[rgba(26,111,116,0.24)] bg-[rgba(26,111,116,0.1)] text-[#1a4e52]';
    case 'partial':
      return 'border-[rgba(255,178,31,0.3)] bg-[rgba(255,178,31,0.14)] text-[#925500]';
    case 'warning':
      return 'border-[rgba(211,111,64,0.3)] bg-[rgba(211,111,64,0.14)] text-[#8c3c1a]';
    case 'success':
      return 'border-[rgba(94,160,96,0.3)] bg-[rgba(94,160,96,0.14)] text-[#255c2e]';
    default:
      return 'border-[rgba(21,38,43,0.1)] bg-[rgba(21,38,43,0.05)] text-[var(--ink-soft)]';
  }
}

function ensureMeetingShape(meeting) {
  const participantes = (meeting?.participantes || []).map((participant, index) => normalizeParticipant(participant, index));
  const previousRequests = Array.isArray(meeting?.ata?.requests) ? meeting.ata.requests : [];
  const requests = participantes.map((participant) => {
    const found = previousRequests.find((request) => (participant.email && request.email ? request.email === participant.email : request.name?.toLowerCase() === participant.name.toLowerCase()));
    return normalizeRequest(found, participant);
  });
  return {
    ...meeting,
    participantes,
    ata: {
      texto: meeting?.ata?.texto || '',
      generatedAt: meeting?.ata?.generatedAt || null,
      sentAt: meeting?.ata?.sentAt || null,
      requests,
      summary: meeting?.ata?.summary || null,
    },
  };
}

function buildAtaPayload({ meeting, endTimeIso, observacoesFinais, proximaReuniao }) {
  const sections = buildAtaSections(meeting.items || []);
  const duration = diffMinutes(meeting.criadaEm, endTimeIso);
  const endHour = endTimeIso ? new Date(endTimeIso).toTimeString().slice(0, 5) : meeting.horarioFim || '—';
  const summary = {
    cliente: meeting.nomeCliente || 'Não informado',
    data: fmtDate(meeting.data),
    inicio: meeting.horarioInicio || '—',
    fim: endHour,
    duracao: duration,
    participantes: meeting.participantes || [],
    pauta: meeting.pauta || 'Sem pauta detalhada.',
    observacoesFinais: observacoesFinais || meeting.observacoesFinais || '',
    proximaReuniao: proximaReuniao || meeting.proximaReuniao || { data: '', horario: '' },
  };

  const lines = [
    'ATA DE REUNIÃO',
    '',
    `Cliente: ${summary.cliente}`,
    `Data: ${summary.data}`,
    `Horário: ${summary.inicio} às ${summary.fim}`,
    `Duração: ${summary.duracao}`,
    `Participantes: ${summary.participantes.map((participant) => participant.name).join(', ') || '—'}`,
    `Pauta: ${summary.pauta}`,
    '',
  ];
  [
    ['Decisões', sections.decisoes],
    ['Tarefas', sections.tarefas],
    ['Pendências', sections.pendencias],
    ['Observações', sections.observacoes],
  ].forEach(([label, items]) => {
    if (items.length === 0) return;
    lines.push(label.toUpperCase());
    items.forEach((item, index) => {
      const owner = item.responsavel ? ` | Responsável: ${item.responsavel}` : '';
      const pendencyStatus = item.categoria === 'Pendência' ? ` | ${getPendencyAtaText(item)}` : '';
      lines.push(`${index + 1}. [${item.timestamp}] ${item.texto}${owner}${pendencyStatus}`);
    });
    lines.push('');
  });

  if (summary.observacoesFinais) {
    lines.push('OBSERVAÇÕES FINAIS');
    lines.push(summary.observacoesFinais);
    lines.push('');
  }

  if (summary.proximaReuniao?.data || summary.proximaReuniao?.horario) {
    lines.push(`Próxima reunião: ${[summary.proximaReuniao?.data ? fmtDate(summary.proximaReuniao.data) : '', summary.proximaReuniao?.horario || ''].filter(Boolean).join(' às ')}`);
  }

  return {
    texto: lines.join('\n'),
    generatedAt: new Date().toISOString(),
    summary,
    requests: meeting.ata?.requests || [],
    sentAt: meeting.ata?.sentAt || null,
  };
}

function buildApprovalMail({ meeting, fallbackEmail }) {
  const emails = (meeting.participantes || []).map((participant) => participant.email).filter(Boolean);
  const target = Array.from(new Set(emails)).join(';') || fallbackEmail || '';
  const approvalUrl = `${window.location.origin}/reunioes/${meeting.id}?approval=1`;
  const subject = `Ata para aprovação | ${meeting.nomeCliente || 'Cliente'} | ${fmtDate(meeting.data)}`;
  const body = [
    'Olá,',
    '',
    `A ata da reunião ${meeting.titulo} já está disponível para aprovação.`,
    '',
    `Data: ${fmtDate(meeting.data)}`,
    `Horário: ${meeting.horarioInicio}${meeting.horarioFim ? ` às ${meeting.horarioFim}` : ''}`,
    '',
    'Acesse o portal pelo link abaixo e registre sua resposta:',
    approvalUrl,
    '',
    'Respostas disponíveis:',
    '- Aprovar',
    '- Aprovar com observação',
    '',
    'A ata foi gerada a partir dos itens registrados durante a reunião.',
  ].join('\n');
  return { target, subject, body, approvalUrl };
}

function registerMeetingInPMO(meeting, clientId, ataText) {
  const pmoData = getStorage(KEYS.pmo(clientId), {});
  const timeline = pmoData.timeline || [];
  const actions = pmoData.actions || [];
  const duration = diffMinutes(meeting.criadaEm, meeting.encerradaEm || new Date().toISOString());

  timeline.push({
    id: `EVT_${Date.now()}`,
    datetime: (meeting.encerradaEm || new Date().toISOString()).slice(0, 16),
    fase: 'Análise',
    evento: `[Reunião ${meeting.id}] ${meeting.titulo} | Duração ${duration}` ,
    fonte: 'Portal IR',
    evidencia: `Ata ${meeting.id}` ,
    ataResumo: ataText.slice(0, 240),
    meetingId: meeting.id,
  });

  const preservedActions = actions.filter((action) => !(action.origem === 'Reunião' && action.sourceCategory === 'Tarefa' && action.meetingId === meeting.id));
  const taskActions = (meeting.items || [])
    .filter((item) => item.categoria === 'Tarefa')
    .map((item, index) => {
      const existing = actions.find((action) => action.meetingItemId === item.id);
      return {
        ...existing,
        id: existing?.id || `MTGTASK_${meeting.id}_${index + 1}`,
        descricao: item.texto,
        responsavel: item.responsavel || existing?.responsavel || '',
        area: existing?.area || 'IR',
        status: existing?.status || 'Aberto',
        prioridade: existing?.prioridade || 'Alta',
        origem: 'Reunião',
        sourceCategory: 'Tarefa',
        meetingId: meeting.id,
        meetingItemId: item.id,
        meetingTitle: meeting.titulo || '',
        meetingDate: meeting.data || '',
        criadaEm: existing?.criadaEm || new Date().toISOString(),
      };
    });

  setStorage(KEYS.pmo(clientId), { ...pmoData, timeline, actions: [...preservedActions, ...taskActions] });
  syncMeetingPendenciesToPMO(meeting, clientId);
}

function downloadAtaPdf(meeting, ata) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const width = doc.internal.pageSize.getWidth();
  const margin = 16;
  let y = 18;
  const writeLine = (text, size = 10, color = [22, 33, 38], weight = 'normal') => {
    doc.setFont('helvetica', weight);
    doc.setFontSize(size);
    doc.setTextColor(...color);
    const lines = doc.splitTextToSize(String(text || ''), width - margin * 2);
    lines.forEach((line) => {
      if (y > 275) {
        doc.addPage();
        y = 18;
      }
      doc.text(line, margin, y);
      y += size * 0.55 + 1.5;
    });
  };

  doc.setFillColor(23, 48, 56);
  doc.roundedRect(margin, y, width - margin * 2, 28, 6, 6, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(255, 194, 92);
  doc.text('ATA DE REUNIÃO', margin + 6, y + 8);
  doc.setFontSize(20);
  doc.setTextColor(255, 255, 255);
  doc.text(meeting.titulo || 'Reunião', margin + 6, y + 18);
  y += 38;

  writeLine(`Cliente: ${ata.summary?.cliente || 'Não informado'}`, 10, [82, 95, 104], 'bold');
  writeLine(`Data: ${ata.summary?.data || '—'} | Horário: ${ata.summary?.inicio || '—'} às ${ata.summary?.fim || '—'} | Duração: ${ata.summary?.duracao || '—'}`, 10, [82, 95, 104]);
  writeLine(`Participantes: ${(ata.summary?.participantes || []).map((participant) => participant.name).join(', ') || '—'}`, 10, [82, 95, 104]);
  y += 2;

  [['Pauta', ata.summary?.pauta], ['Ata', ata.texto]].forEach(([title, content]) => {
    doc.setDrawColor(222, 228, 232);
    doc.roundedRect(margin, y, width - margin * 2, title === 'Pauta' ? 26 : 0, 4, 4);
    writeLine(title, 11, [22, 33, 38], 'bold');
    writeLine(content || '—', 10, [74, 86, 94]);
    y += 2;
  });

  const clientName = (meeting.nomeCliente || 'cliente').replace(/\s+/g, '_');
  doc.save(`ATA_${clientName}_${meeting.id}.pdf`);
}

function ApprovalChip({ label, count, tone }) {
  return <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-[11px] uppercase tracking-[0.16em] ${tone}`}>{label} {count}</span>;
}

function CategoryPill({ active, label, onClick }) {
  return (
    <button type="button" onClick={onClick} className={`rounded-full px-4 py-2 font-mono text-xs uppercase transition-colors ${active ? 'bg-[#173038] text-white' : 'border border-[rgba(21,38,43,0.1)] bg-white text-[var(--ink-soft)] hover:text-[var(--ink)]'}`}>
      {label}
    </button>
  );
}

function CategoryBadge({ category }) {
  const meta = CATEGORY_META[category] || CATEGORY_META['Observação'];
  return <span className={`inline-flex items-center rounded-full border px-3 py-1 font-mono text-[11px] uppercase tracking-[0.16em] ${meta.tone}`}>{meta.label}</span>;
}
function CloseModal({ meeting, clientId, onClose, onConfirm }) {
  const [step, setStep] = useState(1);
  const [observacoesFinais, setObservacoesFinais] = useState(meeting.observacoesFinais || '');
  const [proximaReuniao, setProximaReuniao] = useState(meeting.proximaReuniao || { data: '', horario: '' });
  const [endTimeIso] = useState(new Date().toISOString());
  const [ata, setAta] = useState(() => buildAtaPayload({ meeting, endTimeIso, observacoesFinais: meeting.observacoesFinais || '', proximaReuniao: meeting.proximaReuniao || { data: '', horario: '' } }));
  const [submitting, setSubmitting] = useState(false);
  const clientInfo = getStorage(KEYS.info(clientId), {});

  function refreshAta() {
    setAta(buildAtaPayload({ meeting, endTimeIso, observacoesFinais, proximaReuniao }));
    setStep(2);
  }

  function handleAction(mode) {
    setSubmitting(true);
    const nextAta = buildAtaPayload({ meeting, endTimeIso, observacoesFinais, proximaReuniao });
    onConfirm({ mode, endTimeIso, observacoesFinais, proximaReuniao, ata: nextAta, fallbackEmail: clientInfo.emailContato || clientInfo.email || '' });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#15262b]/45 px-4" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="app-panel flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-[32px] shadow-[0_30px_70px_rgba(21,38,43,0.22)]">
        <div className="soft-ribbon flex items-start justify-between gap-4 rounded-t-[32px] px-6 py-5 md:px-8">
          <div>
            <p className="section-kicker mb-2">Fechamento da reunião</p>
            <h2 className="font-syne text-2xl font-extrabold uppercase text-[var(--accent)]">{step === 1 ? 'Montar ata' : 'Revisar ata'}</h2>
            <p className="mt-1 font-dm text-sm text-[#dce9eb]">A ata é estruturada a partir dos registros feitos durante a reunião. Você pode salvar como rascunho ou já enviar para aprovação.</p>
          </div>
          <button onClick={onClose} className="rounded-full border border-white/10 p-2 text-[#dce9eb] transition-colors hover:border-white/20 hover:bg-white/10 hover:text-white"><X size={18} /></button>
        </div>

        {step === 1 ? (
          <>
            <div className="grid gap-6 px-6 py-6 md:grid-cols-[0.8fr_1.2fr] md:px-8">
              <div className="space-y-4 rounded-[28px] border border-[rgba(21,38,43,0.08)] bg-[rgba(23,48,56,0.04)] p-5">
                <div className="grid gap-3 sm:grid-cols-3 md:grid-cols-1">
                  <div className="rounded-[20px] border border-[rgba(21,38,43,0.08)] bg-white px-4 py-4"><p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--ink-soft)]">Início</p><p className="mt-2 font-syne text-2xl font-extrabold text-[var(--ink)]">{meeting.horarioInicio}</p></div>
                  <div className="rounded-[20px] border border-[rgba(21,38,43,0.08)] bg-white px-4 py-4"><p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--ink-soft)]">Fim</p><p className="mt-2 font-syne text-2xl font-extrabold text-[var(--ink)]">{new Date(endTimeIso).toTimeString().slice(0, 5)}</p></div>
                  <div className="rounded-[20px] border border-[rgba(183,236,35,0.28)] bg-[rgba(214,255,99,0.18)] px-4 py-4"><p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#6e8617]">Duração</p><p className="mt-2 font-syne text-2xl font-extrabold text-[var(--ink)]">{diffMinutes(meeting.criadaEm, endTimeIso)}</p></div>
                </div>
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--ink-soft)]">Itens por categoria</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {Object.entries(buildAtaSections(meeting.items || [])).map(([key, items]) => <ApprovalChip key={key} label={key} count={items.length} tone="border-[rgba(21,38,43,0.08)] bg-white text-[var(--ink-soft)]" />)}
                  </div>
                </div>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="mb-2 block font-mono text-xs uppercase tracking-[0.16em] text-[var(--ink)]">Observações finais</label>
                  <textarea value={observacoesFinais} onChange={(event) => setObservacoesFinais(event.target.value)} rows={5} placeholder="Resumo executivo, pontos de atenção e decisões importantes." className="w-full resize-none rounded-[22px] border border-[rgba(21,38,43,0.12)] bg-white px-4 py-3 font-dm text-sm text-[var(--ink)] outline-none focus:border-[rgba(21,38,43,0.28)]" />
                </div>
                <div>
                  <label className="mb-2 block font-mono text-xs uppercase tracking-[0.16em] text-[var(--ink)]">Próxima reunião (opcional)</label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input type="date" value={proximaReuniao.data || ''} onChange={(event) => setProximaReuniao((prev) => ({ ...prev, data: event.target.value }))} className="rounded-[18px] border border-[rgba(21,38,43,0.12)] bg-white px-4 py-3 font-dm text-sm text-[var(--ink)] outline-none focus:border-[rgba(21,38,43,0.28)]" />
                    <input type="time" value={proximaReuniao.horario || ''} onChange={(event) => setProximaReuniao((prev) => ({ ...prev, horario: event.target.value }))} className="rounded-[18px] border border-[rgba(21,38,43,0.12)] bg-white px-4 py-3 font-dm text-sm text-[var(--ink)] outline-none focus:border-[rgba(21,38,43,0.28)]" />
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-between gap-3 border-t border-[rgba(21,38,43,0.08)] px-6 py-4 md:px-8"><button onClick={onClose} className="btn-outline rounded-full px-4 py-2.5 font-mono text-xs uppercase">Cancelar</button><button onClick={refreshAta} className="btn-primary rounded-full px-5 py-2.5 font-mono text-xs uppercase">Gerar ata</button></div>
          </>
        ) : (
          <>
            <div className="grid gap-6 px-6 py-6 md:grid-cols-[0.72fr_1.28fr] md:px-8">
              <div className="space-y-4 rounded-[28px] border border-[rgba(21,38,43,0.08)] bg-[rgba(23,48,56,0.04)] p-5">
                <div className="rounded-[22px] border border-[rgba(21,38,43,0.08)] bg-white p-4"><p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--ink-soft)]">Ata pronta para</p><div className="mt-3 space-y-2"><div className="flex items-center gap-2 font-dm text-sm text-[var(--ink)]"><CheckCircle2 size={15} className="text-emerald-600" />Salvar rascunho</div><div className="flex items-center gap-2 font-dm text-sm text-[var(--ink)]"><Mail size={15} className="text-sky-700" />Enviar para aprovação</div><div className="flex items-center gap-2 font-dm text-sm text-[var(--ink)]"><ClipboardCheck size={15} className="text-[#6e8617]" />Registrar no PMO</div></div></div>
                <button onClick={() => downloadAtaPdf(meeting, ata)} className="btn-outline w-full rounded-full px-4 py-2.5 font-mono text-xs uppercase"><span className="inline-flex items-center gap-2"><Download size={14} />Download PDF</span></button>
              </div>
              <div className="rounded-[28px] border border-[rgba(21,38,43,0.08)] bg-white p-5 shadow-[0_16px_34px_rgba(21,38,43,0.05)]"><pre className="max-h-[46vh] overflow-auto whitespace-pre-wrap font-dm text-sm leading-relaxed text-[var(--ink)]">{ata.texto}</pre></div>
            </div>
            <div className="flex flex-wrap justify-between gap-3 border-t border-[rgba(21,38,43,0.08)] px-6 py-4 md:px-8">
              <button onClick={() => setStep(1)} className="btn-outline rounded-full px-4 py-2.5 font-mono text-xs uppercase">Voltar</button>
              <div className="flex flex-wrap gap-3">
                <button disabled={submitting} onClick={() => handleAction('draft')} className="btn-outline rounded-full px-4 py-2.5 font-mono text-xs uppercase">Salvar rascunho</button>
                <button disabled={submitting} onClick={() => handleAction('send')} className="btn-primary rounded-full px-5 py-2.5 font-mono text-xs uppercase">Enviar para aprovação</button>
                <button disabled={submitting} onClick={() => handleAction('pmo')} className="rounded-full bg-[#173038] px-5 py-2.5 font-mono text-xs uppercase text-[var(--accent)] transition-colors hover:bg-[#102127]">Registrar no PMO</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
function buildMeetingsBasePath(isAdmin, clientId) {
  return isAdmin && clientId ? `/admin/cliente/${clientId}/reunioes` : '/reunioes';
}

export default function ReuniaoDetalhe({ clientId: propClientId, meetingId: propMeetingId, isAdmin = false, adminClientName, onAdminBack }) {
  const { user } = useAuth();
  const params = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const approvalMode = new URLSearchParams(location.search).get('approval') === '1';
  const effectiveClientId = propClientId || location.state?.clientId || user?.clientId;
  const effectiveMeetingId = propMeetingId || params.meetingId;
  const basePath = buildMeetingsBasePath(isAdmin, propClientId || effectiveClientId);
  const initialMeeting = useMemo(() => {
    if (location.state?.meeting?.id === effectiveMeetingId) {
      return ensureMeetingShape(location.state.meeting);
    }

    if (effectiveMeetingId) {
      const candidateKeys = effectiveClientId ? [KEYS.meetings(effectiveClientId)] : [];
      for (let index = 0; index < localStorage.length; index += 1) {
        const key = localStorage.key(index);
        if (key && key.startsWith('opice_ir_meetings_') && !candidateKeys.includes(key)) candidateKeys.push(key);
      }

      for (const key of candidateKeys) {
        try {
          const found = (getStorage(key, []) || []).find((item) => item.id === effectiveMeetingId);
          if (found) return ensureMeetingShape(found);
        } catch {
          // ignore broken entries
        }
      }
    }

    return null;
  }, [effectiveClientId, effectiveMeetingId, location.state]);

  const [meeting, setMeeting] = useState(() => initialMeeting);
  const [elapsedSeconds, setElapsedSeconds] = useState(() => initialMeeting ? Math.max(0, Math.floor((((initialMeeting.status === 'Encerrada' && initialMeeting.encerradaEm) ? new Date(initialMeeting.encerradaEm) : new Date()) - new Date(initialMeeting.criadaEm)) / 1000)) : 0);
  const [selectedCategory, setSelectedCategory] = useState(() => Object.keys(CATEGORY_META)[0]);
  const [noteText, setNoteText] = useState(() => initialMeeting?.notasLivres || '');
  const [pendencyTreatment, setPendencyTreatment] = useState('sem_prazo');
  const [pendencyDueDate, setPendencyDueDate] = useState('');
  const [editingItem, setEditingItem] = useState(null);
  const [quickName, setQuickName] = useState('');
  const [quickDesc, setQuickDesc] = useState('');
  const [quickSaved, setQuickSaved] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [highlightedItemId, setHighlightedItemId] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [approvalRequestId, setApprovalRequestId] = useState(() => initialMeeting?.ata?.requests?.find((request) => !request.respondedAt)?.id || initialMeeting?.ata?.requests?.[0]?.id || '');
  const [approvalNote, setApprovalNote] = useState('');
  const textareaRef = useRef(null);
  const notFound = !initialMeeting;

  const resolvedClientId = useMemo(() => {
    if (effectiveClientId) return effectiveClientId;
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (key && key.startsWith('opice_ir_meetings_')) {
        const data = getStorage(key, []);
        if (Array.isArray(data) && data.some((item) => item.id === effectiveMeetingId)) return key.replace('opice_ir_meetings_', '');
      }
    }
    return 'default';
  }, [effectiveClientId, effectiveMeetingId]);

  const saveMeeting = useCallback((updatedMeeting) => {
    const meetings = getStorage(KEYS.meetings(resolvedClientId), []);
    const index = meetings.findIndex((item) => item.id === effectiveMeetingId);
    if (index !== -1) {
      meetings[index] = updatedMeeting;
      setStorage(KEYS.meetings(resolvedClientId), meetings);
    }
  }, [effectiveMeetingId, resolvedClientId]);

  useEffect(() => {
    if (!meeting || meeting.status === 'Encerrada') return undefined;
    const startMs = new Date(meeting.criadaEm).getTime();
    const tick = () => setElapsedSeconds(Math.max(0, Math.floor((Date.now() - startMs) / 1000)));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [meeting]);

  useEffect(() => {
    if (!meeting) return undefined;
    const interval = setInterval(() => saveMeeting({ ...meeting, notasLivres: noteText }), 10000);
    return () => clearInterval(interval);
  }, [meeting, noteText, saveMeeting]);

  const ataStatus = useMemo(() => getAtaStatus(meeting?.ata), [meeting]);
  const sections = useMemo(() => buildAtaSections(meeting?.items || []), [meeting]);
  const sortedItems = useMemo(() => [...(meeting?.items || [])].sort((left, right) => left.timestamp.localeCompare(right.timestamp)), [meeting]);
  const approvalSummary = useMemo(() => {
    const requests = meeting?.ata?.requests || [];
    return {
      pending: requests.filter((request) => !request.respondedAt),
      responded: requests.filter((request) => request.respondedAt),
      withNotes: requests.filter((request) => request.status === 'approved_with_notes'),
    };
  }, [meeting]);
  const isPendingCategory = selectedCategory === 'Pendência';
  const canSaveMeetingItem = Boolean(
    noteText.trim()
      && (!isPendingCategory || (pendencyTreatment && (pendencyTreatment !== 'definir_prazo' || pendencyDueDate))),
  );

  function updateMeeting(nextMeeting, message) {
    const normalized = ensureMeetingShape(nextMeeting);
    setMeeting(normalized);
    setElapsedSeconds(Math.max(0, Math.floor((((normalized.status === 'Encerrada' && normalized.encerradaEm) ? new Date(normalized.encerradaEm) : new Date()) - new Date(normalized.criadaEm)) / 1000)));
    saveMeeting(normalized);
    syncMeetingPendenciesToPMO(normalized, resolvedClientId);
    if (message) setFeedback({ type: 'success', message });
  }

  function handleAddItem() {
    if (!canSaveMeetingItem || !meeting) return;
    const newItem = {
      id: `ITEM_${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      timestamp: fmtItemTs(elapsedSeconds),
      categoria: selectedCategory,
      texto: noteText.trim(),
      responsavel: null,
      tratamentoPrazo: isPendingCategory ? pendencyTreatment : null,
      prazo: isPendingCategory && pendencyTreatment === 'definir_prazo' ? pendencyDueDate : null,
    };
    const updated = { ...meeting, items: [...(meeting.items || []), newItem], notasLivres: '' };
    updateMeeting(updated, 'Item registrado na reunião.');
    setNoteText('');
    setPendencyTreatment('sem_prazo');
    setPendencyDueDate('');
    setHighlightedItemId(newItem.id);
    setTimeout(() => setHighlightedItemId(null), 2200);
    textareaRef.current?.focus();
  }

  function handleQuickTask() {
    if (!quickDesc.trim() || !meeting) return;
    const newItem = { id: `ITEM_${Math.random().toString(36).slice(2, 8).toUpperCase()}`, timestamp: fmtItemTs(elapsedSeconds), categoria: 'Tarefa', texto: quickDesc.trim(), responsavel: quickName.trim() || null };
    const updated = { ...meeting, items: [...(meeting.items || []), newItem] };
    updateMeeting(updated, 'Tarefa rápida registrada.');
    setQuickName('');
    setQuickDesc('');
    setQuickSaved(true);
    setTimeout(() => setQuickSaved(false), 1800);
  }

  function handleSaveEditedPendency(nextItem) {
    if (!meeting) return;
    const updated = {
      ...meeting,
      items: (meeting.items || []).map((item) => (item.id === nextItem.id ? nextItem : item)),
    };
    updateMeeting(updated, 'Pendência atualizada com sucesso.');
    setEditingItem(null);
  }

  function handleCloseConfirm({ mode, endTimeIso, observacoesFinais, proximaReuniao, ata, fallbackEmail }) {
    if (!meeting) return;
    const requests = (meeting.participantes || []).map((participant) => {
      const previous = ata.requests.find((request) => request.id === createRequestId(participant));
      const sentAt = mode === 'send' ? new Date().toISOString() : previous?.sentAt || null;
      return { ...normalizeRequest(previous, participant), sentAt };
    });
    const finalAta = { ...ata, requests, sentAt: mode === 'send' ? new Date().toISOString() : ata.sentAt || null };
    const updated = ensureMeetingShape({ ...meeting, status: 'Encerrada', encerradaEm: endTimeIso, horarioFim: new Date(endTimeIso).toTimeString().slice(0, 5), observacoesFinais, proximaReuniao, notasLivres: noteText, ataGerada: true, ata: finalAta });
    updateMeeting(updated, mode === 'send' ? 'Ata enviada para aprovação.' : 'Ata salva com sucesso.');
    if (mode === 'pmo') registerMeetingInPMO(updated, resolvedClientId, finalAta.texto);
    if (mode === 'send') {
      const mail = buildApprovalMail({ meeting: updated, fallbackEmail });
      if (!mail.target) {
        setFeedback({ type: 'warning', message: 'Ata salva, mas nenhum e-mail foi encontrado para envio. Cadastre o e-mail do participante ou do cliente e tente novamente.' });
        setShowCloseModal(false);
        return;
      }
      window.location.href = `mailto:${mail.target}?subject=${encodeURIComponent(mail.subject)}&body=${encodeURIComponent(mail.body)}`;
    }
    setShowCloseModal(false);
    navigate(basePath);
  }
  function handleResendAta() {
    if (!meeting) return;
    const nextAta = buildAtaPayload({ meeting, endTimeIso: meeting.encerradaEm || new Date().toISOString(), observacoesFinais: meeting.observacoesFinais || '', proximaReuniao: meeting.proximaReuniao || { data: '', horario: '' } });
    const requests = (meeting.participantes || []).map((participant) => {
      const previous = meeting.ata.requests.find((request) => request.id === createRequestId(participant));
      return { ...normalizeRequest(previous, participant), sentAt: previous?.sentAt || new Date().toISOString() };
    });
    const ata = { ...nextAta, requests, sentAt: new Date().toISOString() };
    const updated = ensureMeetingShape({ ...meeting, ataGerada: true, ata });
    updateMeeting(updated, 'Ata reenviada para aprovação.');
    const clientInfo = getStorage(KEYS.info(resolvedClientId), {});
    const mail = buildApprovalMail({ meeting: updated, ata, fallbackEmail: clientInfo.emailContato || clientInfo.email || '' });
    if (!mail.target) {
      setFeedback({ type: 'warning', message: 'Nenhum destinat?rio de e-mail foi encontrado para reenviar a ata.' });
      return;
    }
    window.location.href = `mailto:${mail.target}?subject=${encodeURIComponent(mail.subject)}&body=${encodeURIComponent(mail.body)}`;
  }

  function handleRegisterPmoFromPage() {
    if (!meeting) return;
    registerMeetingInPMO(meeting, resolvedClientId, meeting.ata?.texto || 'Ata registrada no portal.');
    setFeedback({ type: 'success', message: 'Ata registrada no PMO.' });
  }

  function handleApprove(mode) {
    if (!meeting || !approvalRequestId) return;
    const requests = (meeting.ata.requests || []).map((request) => request.id === approvalRequestId ? { ...request, status: mode, note: mode === 'approved_with_notes' ? approvalNote.trim() : '', respondedAt: new Date().toISOString() } : request);
    const updated = ensureMeetingShape({ ...meeting, ata: { ...meeting.ata, requests } });
    updateMeeting(updated, mode === 'approved' ? 'Ata aprovada com sucesso.' : 'Ata aprovada com observação.');
    setApprovalNote('');
  }

  if (notFound) {
    return <Layout clientId={propClientId} isAdmin={isAdmin} adminClientName={adminClientName} onAdminBack={onAdminBack}><div className="p-10 text-center"><p className="font-dm text-[var(--ink-soft)]">Reunião não encontrada.</p><button onClick={() => navigate(basePath)} className="mt-4 btn-outline rounded-full px-4 py-2.5 font-mono text-xs uppercase">Voltar</button></div></Layout>;
  }

  if (!meeting) {
    return <Layout clientId={propClientId} isAdmin={isAdmin} adminClientName={adminClientName} onAdminBack={onAdminBack}><div className="p-10 text-center font-mono text-xs uppercase tracking-[0.16em] text-[var(--ink-soft)]">Carregando reunião...</div></Layout>;
  }

  return (
    <Layout clientId={propClientId} isAdmin={isAdmin} adminClientName={adminClientName} onAdminBack={onAdminBack}>
      <div className="px-6 pt-6 md:px-10 md:pt-8"><button onClick={() => navigate(basePath)} className="btn-outline rounded-full px-4 py-2.5 font-mono text-xs uppercase"><span className="inline-flex items-center gap-2"><ChevronLeft size={14} />Voltar para reuniões</span></button></div>
      <div className="grid gap-6 px-6 pb-8 pt-5 md:px-10 xl:grid-cols-[0.82fr_1.18fr]">
        <aside className="space-y-5">
          <section className="app-panel-dark rounded-[32px] px-6 py-6 shadow-[0_20px_44px_rgba(21,38,43,0.14)]"><p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[rgba(255,255,255,0.68)]">{meeting.id}</p><h1 className="mt-3 font-syne text-3xl font-extrabold uppercase leading-[0.96] text-white">{meeting.titulo}</h1><p className="mt-2 font-dm text-sm text-[rgba(255,255,255,0.74)]">{meeting.nomeCliente || 'Cliente não informado'}</p><div className="mt-5 grid gap-3 sm:grid-cols-3 xl:grid-cols-1"><div className="rounded-[24px] border border-white/10 bg-white/6 px-4 py-4"><p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[rgba(255,255,255,0.62)]">Duração</p><p className="mt-2 font-syne text-3xl font-extrabold text-[var(--accent)]">{fmtElapsed(elapsedSeconds)}</p></div><div className="rounded-[24px] border border-white/10 bg-white/6 px-4 py-4"><p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[rgba(255,255,255,0.62)]">Status</p><div className="mt-3 flex flex-wrap gap-2"><span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-[11px] uppercase tracking-[0.16em] ${meeting.status === 'Em andamento' ? 'border-red-300 bg-red-500/10 text-red-200' : 'border-emerald-300 bg-emerald-500/10 text-emerald-100'}`}>{meeting.status}</span>{meeting.status === 'Encerrada' && <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-[11px] uppercase tracking-[0.16em] ${getAtaToneClasses(ataStatus.tone)}`}>{ataStatus.label}</span>}</div></div><div className="rounded-[24px] border border-white/10 bg-white/6 px-4 py-4"><p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[rgba(255,255,255,0.62)]">Participantes</p><p className="mt-2 font-syne text-3xl font-extrabold text-white">{meeting.participantes.length}</p></div></div>{meeting.pauta && <div className="mt-5 rounded-[24px] border border-white/10 bg-white/6 px-4 py-4"><p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[rgba(255,255,255,0.62)]">Pauta</p><p className="mt-2 font-dm text-sm leading-relaxed text-[rgba(255,255,255,0.82)]">{meeting.pauta}</p></div>}{meeting.status === 'Em andamento' && <button onClick={() => setShowCloseModal(true)} className="mt-5 w-full rounded-full bg-white px-5 py-3 font-mono text-xs uppercase text-[var(--ink)] transition-colors hover:bg-[#f2f2ec]"><span className="inline-flex items-center gap-2"><StopCircle size={14} />Encerrar reunião</span></button>}</section>

          <section className="app-panel rounded-[30px] p-5 shadow-[0_16px_34px_rgba(21,38,43,0.06)]">
            <div className="flex items-center justify-between gap-3 border-b border-[rgba(21,38,43,0.08)] pb-3">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--ink-soft)]">Itens registrados</p>
                <h2 className="font-syne text-lg font-extrabold uppercase text-[var(--ink)]">Linha do registro</h2>
              </div>
              <span className="rounded-full border border-[rgba(21,38,43,0.08)] bg-white px-3 py-1 font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--ink-soft)]">{sortedItems.length}</span>
            </div>
            <div className="mt-4 max-h-[420px] space-y-2 overflow-auto pr-1">
              {sortedItems.length === 0 ? (
                <div className="rounded-[22px] border border-dashed border-[rgba(21,38,43,0.14)] px-4 py-6 text-center font-dm text-sm text-[var(--ink-soft)]">Nenhum item registrado ainda.</div>
              ) : (
                sortedItems.map((item) => {
                  const pendencyBadge = item.categoria === 'Pendência' ? getPendencyDeadlineBadge(item) : null;
                  return (
                    <div
                      key={item.id}
                      className={`rounded-[22px] border px-4 py-3 transition-colors ${highlightedItemId === item.id ? 'border-[rgba(183,236,35,0.34)] bg-[rgba(214,255,99,0.16)]' : 'border-[rgba(21,38,43,0.08)] bg-white hover:bg-[rgba(21,38,43,0.03)]'}`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setHighlightedItemId(item.id);
                            setTimeout(() => setHighlightedItemId(null), 2000);
                          }}
                          className="flex-1 text-left"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <CategoryBadge category={item.categoria} />
                            <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--ink-soft)]">{item.timestamp}</span>
                            {item.responsavel && <span className="font-dm text-xs text-[var(--ink-soft)]">Responsável: {item.responsavel}</span>}
                            {pendencyBadge && <span className="rounded-full border border-[rgba(255,178,31,0.24)] bg-[rgba(255,178,31,0.12)] px-3 py-1 font-mono text-[11px] uppercase tracking-[0.16em] text-[#8a5400]">{pendencyBadge}</span>}
                          </div>
                          <p className="mt-3 font-dm text-sm leading-relaxed text-[var(--ink)]">{item.texto}</p>
                        </button>
                        {meeting.status === 'Em andamento' && item.categoria === 'Pendência' && (
                          <button
                            type="button"
                            onClick={() => setEditingItem(item)}
                            className="btn-outline rounded-full px-4 py-2 font-mono text-[11px] uppercase"
                          >
                            Editar
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        </aside>

        <main className="space-y-5">
          {feedback && <div className={`rounded-[24px] border px-4 py-4 ${feedback.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-800'}`}><p className="font-dm text-sm">{feedback.message}</p></div>}
          {meeting.status === 'Encerrada' && <section className="app-panel rounded-[30px] p-5 shadow-[0_16px_34px_rgba(21,38,43,0.06)]"><div className="flex flex-col gap-4 border-b border-[rgba(21,38,43,0.08)] pb-4 lg:flex-row lg:items-start lg:justify-between"><div><p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--ink-soft)]">Ata da reunião</p><h2 className="mt-2 font-syne text-2xl font-extrabold uppercase text-[var(--ink)]">Fluxo de aprovação</h2><p className="mt-2 max-w-2xl font-dm text-sm leading-relaxed text-[var(--ink-soft)]">A ata foi montada a partir dos itens registrados durante a reunião e pode ser reenviada por e-mail sempre que necessário.</p></div><div className="flex flex-wrap gap-2"><button onClick={handleResendAta} className="btn-primary rounded-full px-4 py-2.5 font-mono text-xs uppercase"><span className="inline-flex items-center gap-2"><Send size={14} />Enviar ata</span></button><button onClick={() => downloadAtaPdf(meeting, meeting.ata)} className="btn-outline rounded-full px-4 py-2.5 font-mono text-xs uppercase"><span className="inline-flex items-center gap-2"><Download size={14} />PDF</span></button><button onClick={handleRegisterPmoFromPage} className="rounded-full bg-[#173038] px-4 py-2.5 font-mono text-xs uppercase text-[var(--accent)] transition-colors hover:bg-[#102127]"><span className="inline-flex items-center gap-2"><ClipboardCheck size={14} />Registrar no PMO</span></button></div></div><div className="mt-4 flex flex-wrap gap-2"><span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-[11px] uppercase tracking-[0.16em] ${getAtaToneClasses(ataStatus.tone)}`}><ShieldCheck size={13} />{ataStatus.label}</span><ApprovalChip label="Responderam" count={approvalSummary.responded.length} tone="border-emerald-200 bg-emerald-50 text-emerald-800" /><ApprovalChip label="Pendentes" count={approvalSummary.pending.length} tone="border-amber-200 bg-amber-50 text-amber-800" /><ApprovalChip label="Com observação" count={approvalSummary.withNotes.length} tone="border-orange-200 bg-orange-50 text-orange-800" /></div><div className="mt-5 grid gap-4 xl:grid-cols-3"><div className="rounded-[24px] border border-[rgba(21,38,43,0.08)] bg-white p-4"><p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--ink-soft)]">Já responderam</p><div className="mt-3 space-y-3">{approvalSummary.responded.length === 0 ? <p className="font-dm text-sm text-[var(--ink-soft)]">Sem respostas registradas.</p> : approvalSummary.responded.map((request) => <div key={request.id} className="rounded-[18px] border border-[rgba(21,38,43,0.08)] bg-[rgba(255,255,255,0.8)] px-3 py-3"><p className="font-dm text-sm font-semibold text-[var(--ink)]">{request.name}</p><p className="mt-1 font-dm text-xs text-[var(--ink-soft)]">{request.email || 'Sem e-mail cadastrado'}</p><p className="mt-2 font-mono text-[11px] uppercase tracking-[0.16em] text-emerald-700">{request.status === 'approved_with_notes' ? 'Aprovou com observação' : 'Aprovou'}</p>{request.note && <p className="mt-2 font-dm text-sm text-[var(--ink)]">{request.note}</p>}</div>)}</div></div><div className="rounded-[24px] border border-[rgba(21,38,43,0.08)] bg-white p-4"><p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--ink-soft)]">Pendentes</p><div className="mt-3 space-y-3">{approvalSummary.pending.length === 0 ? <p className="font-dm text-sm text-[var(--ink-soft)]">Todos os participantes já responderam.</p> : approvalSummary.pending.map((request) => <div key={request.id} className="rounded-[18px] border border-[rgba(21,38,43,0.08)] bg-[rgba(255,255,255,0.8)] px-3 py-3"><p className="font-dm text-sm font-semibold text-[var(--ink)]">{request.name}</p><p className="mt-1 font-dm text-xs text-[var(--ink-soft)]">{request.email || 'Responderá pelo portal'}</p></div>)}</div></div><div className="rounded-[24px] border border-[rgba(21,38,43,0.08)] bg-[rgba(23,48,56,0.04)] p-4"><p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--ink-soft)]">Responder aprovação</p><h3 className="mt-2 font-syne text-xl font-extrabold uppercase text-[var(--ink)]">Ação simples</h3><p className="mt-2 font-dm text-sm leading-relaxed text-[var(--ink-soft)]">Selecione o participante e registre a resposta. {approvalMode ? 'Você abriu a reunião a partir do link de aprovação.' : 'Esse mesmo bloco pode ser usado após o participante acessar o portal.'}</p><div className="mt-4 space-y-3"><select value={approvalRequestId} onChange={(event) => setApprovalRequestId(event.target.value)} className="w-full rounded-[18px] border border-[rgba(21,38,43,0.12)] bg-white px-4 py-3 font-dm text-sm text-[var(--ink)] outline-none focus:border-[rgba(21,38,43,0.28)]"><option value="">Selecione quem está respondendo</option>{(meeting.ata.requests || []).map((request) => <option key={request.id} value={request.id}>{request.name}{request.respondedAt ? ' • já respondeu' : ''}</option>)}</select><textarea value={approvalNote} onChange={(event) => setApprovalNote(event.target.value)} rows={4} placeholder="Observação opcional para registrar ressalvas ou ajustes." className="w-full resize-none rounded-[18px] border border-[rgba(21,38,43,0.12)] bg-white px-4 py-3 font-dm text-sm text-[var(--ink)] outline-none focus:border-[rgba(21,38,43,0.28)]" /><div className="flex flex-wrap gap-2"><button disabled={!approvalRequestId} onClick={() => handleApprove('approved')} className="btn-primary rounded-full px-4 py-2.5 font-mono text-xs uppercase">Aprovar</button><button disabled={!approvalRequestId} onClick={() => handleApprove('approved_with_notes')} className="btn-outline rounded-full px-4 py-2.5 font-mono text-xs uppercase">Aprovar com observação</button></div></div></div></div><div className="mt-5 rounded-[24px] border border-[rgba(21,38,43,0.08)] bg-white p-5"><div className="flex items-center gap-2"><FileText size={16} className="text-[var(--ink-soft)]" /><p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--ink-soft)]">Conteúdo da ata</p></div><pre className="mt-4 max-h-[360px] overflow-auto whitespace-pre-wrap font-dm text-sm leading-relaxed text-[var(--ink)]">{meeting.ata?.texto || 'Ata ainda não gerada.'}</pre></div></section>}

          <section className="app-panel rounded-[30px] p-5 shadow-[0_16px_34px_rgba(21,38,43,0.06)]">
            <div className="flex flex-col gap-4 border-b border-[rgba(21,38,43,0.08)] pb-4 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--ink-soft)]">Registro em tempo real</p>
                <h2 className="mt-2 font-syne text-2xl font-extrabold uppercase text-[var(--ink)]">Bloco de notas da reunião</h2>
                <p className="mt-2 max-w-2xl font-dm text-sm leading-relaxed text-[var(--ink-soft)]">Escolha a categoria, registre o ponto e adicione rapidamente. Isso alimenta a ata sem depender de reorganização manual depois.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {Object.keys(CATEGORY_META).map((category) => (
                  <CategoryPill key={category} active={selectedCategory === category} label={category} onClick={() => { setSelectedCategory(category); if (category !== 'Pendência') { setPendencyTreatment('sem_prazo'); setPendencyDueDate(''); } }} />
                ))}
              </div>
            </div>

            <div className="mt-4 space-y-4">
              <textarea
                ref={textareaRef}
                value={noteText}
                onChange={(event) => setNoteText(event.target.value)}
                placeholder="Escreva o registro da reunião aqui. Ex.: decisão tomada, tarefa atribuída, pendência aberta ou observação importante."
                className="min-h-[260px] w-full resize-y rounded-[26px] border border-[rgba(21,38,43,0.08)] bg-white px-5 py-4 font-dm text-sm leading-relaxed text-[var(--ink)] outline-none focus:border-[rgba(21,38,43,0.28)]"
              />

              {isPendingCategory && (
                <div className="rounded-[26px] border border-[rgba(21,38,43,0.08)] bg-[rgba(23,48,56,0.04)] p-4">
                  <div className="mb-3 flex items-center gap-2 font-dm text-sm text-[var(--ink)]">
                    <AlertCircle size={15} />
                    Tratamento do prazo
                  </div>
                  <div className="grid gap-3 md:grid-cols-3">
                    {PENDENCY_TREATMENT_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setPendencyTreatment(option.value)}
                        className={`rounded-[20px] border px-4 py-4 text-left transition-colors ${pendencyTreatment === option.value ? 'border-[rgba(183,236,35,0.4)] bg-[rgba(214,255,99,0.18)]' : 'border-[rgba(21,38,43,0.08)] bg-white hover:border-[rgba(21,38,43,0.16)]'}`}
                      >
                        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--ink-soft)]">Opção</p>
                        <p className="mt-2 font-dm text-sm font-semibold text-[var(--ink)]">{option.label}</p>
                      </button>
                    ))}
                  </div>
                  <p className="mt-3 font-dm text-sm text-[var(--ink-soft)]">{PENDENCY_TREATMENT_OPTIONS.find((option) => option.value === pendencyTreatment)?.helper}</p>

                  {pendencyTreatment === 'definir_prazo' && (
                    <div className="mt-4 max-w-xs">
                      <label className="mb-2 block font-mono text-xs uppercase tracking-[0.16em] text-[var(--ink)]">Prazo</label>
                      <input
                        type="date"
                        value={pendencyDueDate}
                        onChange={(event) => setPendencyDueDate(event.target.value)}
                        className="w-full rounded-[18px] border border-[rgba(21,38,43,0.12)] bg-white px-4 py-3 font-dm text-sm text-[var(--ink)] outline-none focus:border-[rgba(21,38,43,0.28)]"
                      />
                    </div>
                  )}

                  {pendencyTreatment === 'definir_pelo_pmo' && (
                    <div className="mt-4 rounded-[18px] border border-[rgba(255,178,31,0.24)] bg-[rgba(255,178,31,0.12)] px-4 py-3 font-dm text-sm text-[#8a5400]">
                      Esta pendência será encaminhada ao PMO para definição posterior do prazo.
                    </div>
                  )}
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 font-dm text-sm text-[var(--ink-soft)]">
                  <AlertCircle size={14} />
                  Categoria atual: <strong className="text-[var(--ink)]">{selectedCategory}</strong>
                </div>
                <button
                  onClick={handleAddItem}
                  disabled={!canSaveMeetingItem}
                  className="btn-primary rounded-full px-5 py-2.5 font-mono text-xs uppercase disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <span className="inline-flex items-center gap-2"><Plus size={14} />Adicionar item</span>
                </button>
              </div>
            </div>
          </section>

          <section className="app-panel rounded-[30px] p-5 shadow-[0_16px_34px_rgba(21,38,43,0.06)]"><div className="flex flex-col gap-4 border-b border-[rgba(21,38,43,0.08)] pb-4 md:flex-row md:items-end md:justify-between"><div><p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--ink-soft)]">Ação rápida</p><h2 className="mt-2 font-syne text-xl font-extrabold uppercase text-[var(--ink)]">Registrar tarefa</h2></div><div className="flex flex-wrap gap-2">{Object.entries(sections).map(([key, items]) => <ApprovalChip key={key} label={key} count={items.length} tone="border-[rgba(21,38,43,0.08)] bg-white text-[var(--ink-soft)]" />)}</div></div><div className="mt-4 grid gap-3 md:grid-cols-[0.34fr_1fr_auto]"><input type="text" value={quickName} onChange={(event) => setQuickName(event.target.value)} placeholder="Responsável" className="rounded-[18px] border border-[rgba(21,38,43,0.12)] bg-white px-4 py-3 font-dm text-sm text-[var(--ink)] outline-none focus:border-[rgba(21,38,43,0.28)]" /><input type="text" value={quickDesc} onChange={(event) => setQuickDesc(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') handleQuickTask(); }} placeholder="Descreva a tarefa de forma objetiva." className="rounded-[18px] border border-[rgba(21,38,43,0.12)] bg-white px-4 py-3 font-dm text-sm text-[var(--ink)] outline-none focus:border-[rgba(21,38,43,0.28)]" /><button onClick={handleQuickTask} disabled={!quickDesc.trim()} className="btn-primary rounded-full px-5 py-3 font-mono text-xs uppercase disabled:cursor-not-allowed disabled:opacity-40">{quickSaved ? <span className="inline-flex items-center gap-2"><Check size={14} />Salvo</span> : <span className="inline-flex items-center gap-2"><Plus size={14} />Registrar</span>}</button></div></section>
        </main>
      </div>

      {editingItem && (
        <PendencyEditorModal
          item={editingItem}
          onClose={() => setEditingItem(null)}
          onSave={handleSaveEditedPendency}
        />
      )}
      {showCloseModal && <CloseModal meeting={{ ...meeting, notasLivres: noteText }} clientId={resolvedClientId} onClose={() => setShowCloseModal(false)} onConfirm={handleCloseConfirm} />}
    </Layout>
  );
}


