import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AlertTriangle, BookOpen, Clock3, FileText, Mail, Plus, Search, Trash2, Users, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import { getStorage, KEYS, setStorage } from '../utils/storage';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function nowTimeStr() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

function fmtDate(dateStr) {
  if (!dateStr) return '—';
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

function genId(meetings) {
  let maxNum = 0;
  meetings.forEach((meeting) => {
    const match = meeting.id?.match(/^MTG(\d+)$/);
    if (match) maxNum = Math.max(maxNum, Number.parseInt(match[1], 10));
  });
  return `MTG${String(maxNum + 1).padStart(3, '0')}`;
}

function normalizeParticipant(raw, index = 0) {
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    const mailMatch = trimmed.match(/^(.*?)\s*<([^>]+)>$/);
    if (mailMatch) {
      return {
        id: `PART_${index}_${mailMatch[2].toLowerCase()}`,
        name: mailMatch[1].trim() || mailMatch[2].trim(),
        email: mailMatch[2].trim().toLowerCase(),
      };
    }
    return {
      id: `PART_${index}_${trimmed.toLowerCase().replace(/\s+/g, '_')}`,
      name: trimmed,
      email: '',
    };
  }

  const name = raw?.name?.trim() || raw?.nome?.trim() || raw?.email?.trim() || `Participante ${index + 1}`;
  const email = raw?.email?.trim().toLowerCase() || '';
  return {
    id: raw?.id || `PART_${index}_${(email || name).toLowerCase().replace(/\s+/g, '_')}`,
    name,
    email,
  };
}

function normalizeMeeting(meeting) {
  const participantes = (meeting.participantes || []).map((participant, index) => normalizeParticipant(participant, index));
  const ata = meeting.ata || {};
  return {
    ...meeting,
    participantes,
    ata: {
      texto: ata.texto || '',
      generatedAt: ata.generatedAt || null,
      sentAt: ata.sentAt || null,
      requests: Array.isArray(ata.requests) ? ata.requests : [],
      status: ata.status || 'Rascunho',
      summary: ata.summary || null,
    },
  };
}

function getInitial(name) {
  return (name || '').trim().charAt(0).toUpperCase() || '?';
}

function getAtaStatus(meeting) {
  const ata = meeting?.ata || {};
  const requests = Array.isArray(ata.requests) ? ata.requests : [];
  const responded = requests.filter((request) => request.respondedAt);
  const pending = requests.filter((request) => !request.respondedAt);
  const withNotes = responded.filter((request) => request.status === 'approved_with_notes');

  if (!ata.generatedAt && !meeting?.ataGerada) {
    return { label: 'Sem ata', tone: 'muted' };
  }

  if (!ata.sentAt) {
    return { label: 'Rascunho', tone: 'draft' };
  }

  if (responded.length === 0) {
    return { label: 'Enviada para aprovação', tone: 'sent' };
  }

  if (pending.length > 0) {
    return { label: 'Aprovada parcialmente', tone: 'partial' };
  }

  if (withNotes.length > 0) {
    return { label: 'Aprovada com observações', tone: 'warning' };
  }

  return { label: 'Aprovada', tone: 'success' };
}

function getAtaToneClasses(tone) {
  switch (tone) {
    case 'draft':
      return 'border-[rgba(21,38,43,0.14)] bg-white text-[var(--ink-soft)]';
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

function getMeetingMetrics(meeting) {
  const items = meeting.items || [];
  return {
    decisoes: items.filter((item) => item.categoria === 'Decisão').length,
    tarefas: items.filter((item) => item.categoria === 'Tarefa').length,
    pendencias: items.filter((item) => item.categoria === 'Pendência').length,
    observacoes: items.filter((item) => item.categoria === 'Observação').length,
  };
}

function ParticipantChip({ participant, onRemove }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-[rgba(183,236,35,0.28)] bg-[rgba(214,255,99,0.12)] px-3 py-1.5 text-left">
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[rgba(23,48,56,0.9)] font-mono text-[11px] font-bold uppercase text-[var(--accent)]">
        {getInitial(participant.name)}
      </span>
      <span className="flex flex-col leading-none">
        <span className="font-mono text-[10px] uppercase text-[#6e8617]">{participant.name}</span>
        <span className="font-dm text-[11px] text-[var(--ink-soft)]">{participant.email || 'Sem e-mail'}</span>
      </span>
      <button
        type="button"
        onClick={onRemove}
        className="rounded-full p-1 text-[var(--ink-soft)] transition-colors hover:bg-white hover:text-[var(--ink)]"
        aria-label={`Remover ${participant.name}`}
      >
        <X size={12} />
      </button>
    </span>
  );
}

function StatusBadge({ status }) {
  if (status === 'Em andamento') {
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.18em] text-red-600">
        <span className="inline-flex h-2 w-2 rounded-full bg-red-500 animate-pulse" />
        Em andamento
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.18em] text-emerald-700">
      <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" />
      Encerrada
    </span>
  );
}

function AtaBadge({ meeting }) {
  const status = getAtaStatus(meeting);
  return (
    <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-[11px] uppercase tracking-[0.16em] ${getAtaToneClasses(status.tone)}`}>
      <Mail size={12} />
      {status.label}
    </span>
  );
}
function NovaReuniaoModal({ clientId, onClose, onCreated }) {
  const clientInfo = getStorage(KEYS.info(clientId), {});
  const [form, setForm] = useState({
    titulo: '',
    data: todayStr(),
    horarioInicio: nowTimeStr(),
    nomeCliente: clientInfo?.nomeCliente || '',
    pauta: '',
  });
  const [participantDraft, setParticipantDraft] = useState({ name: '', email: '' });
  const [participantes, setParticipantes] = useState([]);
  const [errors, setErrors] = useState({});

  function handleChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  }

  function addParticipant() {
    const name = participantDraft.name.trim();
    const email = participantDraft.email.trim().toLowerCase();
    if (!name) return;

    const duplicate = participantes.some((participant) => {
      if (email && participant.email) return participant.email === email;
      return participant.name.toLowerCase() === name.toLowerCase();
    });

    if (duplicate) {
      setParticipantDraft({ name: '', email: '' });
      return;
    }

    setParticipantes((prev) => [...prev, normalizeParticipant({ name, email }, prev.length)]);
    setParticipantDraft({ name: '', email: '' });
  }

  function handleParticipantKeyDown(event) {
    if (event.key === 'Enter') {
      event.preventDefault();
      addParticipant();
    }
  }

  function validate() {
    const nextErrors = {};
    if (!form.titulo.trim()) nextErrors.titulo = 'Informe o título da reunião';
    if (!form.data) nextErrors.data = 'Informe a data';
    if (!form.horarioInicio) nextErrors.horarioInicio = 'Informe o horário';
    return nextErrors;
  }

  function handleSubmit() {
    const nextErrors = validate();
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    const existing = getStorage(KEYS.meetings(clientId), []).map(normalizeMeeting);
    const newMeeting = {
      id: genId(existing),
      titulo: form.titulo.trim(),
      data: form.data,
      horarioInicio: form.horarioInicio,
      nomeCliente: form.nomeCliente.trim(),
      participantes,
      pauta: form.pauta.trim(),
      status: 'Em andamento',
      criadaEm: new Date().toISOString(),
      encerradaEm: null,
      horarioFim: null,
      items: [],
      notasLivres: '',
      ataGerada: false,
      ata: { status: 'Rascunho', texto: '', generatedAt: null, sentAt: null, requests: [], summary: null },
      clientId,
    };

    setStorage(KEYS.meetings(clientId), [newMeeting, ...existing]);
    onCreated(newMeeting);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#15262b]/45 px-4" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="app-panel flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-[32px] shadow-[0_30px_70px_rgba(21,38,43,0.22)]">
        <div className="soft-ribbon flex items-start justify-between gap-4 rounded-t-[32px] px-6 py-5 md:px-8">
          <div>
            <p className="section-kicker mb-2">Agenda operacional</p>
            <h2 className="font-syne text-2xl font-extrabold uppercase text-[var(--accent)]">Nova reunião</h2>
            <p className="mt-1 max-w-xl font-dm text-sm text-[#dce9eb]">Crie a reunião com pauta e participantes. Se houver e-mails cadastrados, a ata poderá ser enviada para aprovação em um clique.</p>
          </div>
          <button onClick={onClose} className="rounded-full border border-white/10 p-2 text-[#dce9eb] transition-colors hover:border-white/20 hover:bg-white/10 hover:text-white"><X size={18} /></button>
        </div>

        <div className="grid gap-0 md:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-5 px-6 py-6 md:px-8">
            <div>
              <label className="mb-2 block font-mono text-xs uppercase tracking-[0.16em] text-[var(--ink)]">Título da reunião *</label>
              <input type="text" value={form.titulo} onChange={(event) => handleChange('titulo', event.target.value)} placeholder="Ex.: Alinhamento diário do incidente" className={`w-full rounded-[18px] border bg-white px-4 py-3 font-dm text-sm text-[var(--ink)] outline-none transition-colors ${errors.titulo ? 'border-red-300' : 'border-[rgba(21,38,43,0.12)] focus:border-[rgba(21,38,43,0.28)]'}`} />
              {errors.titulo && <p className="mt-1 font-dm text-xs text-red-500">{errors.titulo}</p>}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block font-mono text-xs uppercase tracking-[0.16em] text-[var(--ink)]">Data *</label>
                <input type="date" value={form.data} onChange={(event) => handleChange('data', event.target.value)} className={`w-full rounded-[18px] border bg-white px-4 py-3 font-dm text-sm text-[var(--ink)] outline-none transition-colors ${errors.data ? 'border-red-300' : 'border-[rgba(21,38,43,0.12)] focus:border-[rgba(21,38,43,0.28)]'}`} />
                {errors.data && <p className="mt-1 font-dm text-xs text-red-500">{errors.data}</p>}
              </div>
              <div>
                <label className="mb-2 block font-mono text-xs uppercase tracking-[0.16em] text-[var(--ink)]">Horário de início *</label>
                <input type="time" value={form.horarioInicio} onChange={(event) => handleChange('horarioInicio', event.target.value)} className={`w-full rounded-[18px] border bg-white px-4 py-3 font-dm text-sm text-[var(--ink)] outline-none transition-colors ${errors.horarioInicio ? 'border-red-300' : 'border-[rgba(21,38,43,0.12)] focus:border-[rgba(21,38,43,0.28)]'}`} />
                {errors.horarioInicio && <p className="mt-1 font-dm text-xs text-red-500">{errors.horarioInicio}</p>}
              </div>
            </div>

            <div>
              <label className="mb-2 block font-mono text-xs uppercase tracking-[0.16em] text-[var(--ink)]">Cliente</label>
              <input type="text" value={form.nomeCliente} onChange={(event) => handleChange('nomeCliente', event.target.value)} className="w-full rounded-[18px] border border-[rgba(21,38,43,0.12)] bg-white px-4 py-3 font-dm text-sm text-[var(--ink)] outline-none transition-colors focus:border-[rgba(21,38,43,0.28)]" />
            </div>

            <div>
              <label className="mb-2 block font-mono text-xs uppercase tracking-[0.16em] text-[var(--ink)]">Objetivo e pauta</label>
              <textarea value={form.pauta} onChange={(event) => handleChange('pauta', event.target.value)} rows={5} placeholder="Descreva o objetivo da reunião, os pontos principais e o resultado esperado." className="w-full resize-none rounded-[20px] border border-[rgba(21,38,43,0.12)] bg-white px-4 py-3 font-dm text-sm text-[var(--ink)] outline-none transition-colors focus:border-[rgba(21,38,43,0.28)]" />
            </div>
          </div>

          <div className="border-t border-[rgba(21,38,43,0.08)] bg-[rgba(23,48,56,0.04)] px-6 py-6 md:border-l md:border-t-0 md:px-8">
            <div className="rounded-[26px] border border-[rgba(21,38,43,0.08)] bg-white/72 p-5 shadow-[0_16px_34px_rgba(21,38,43,0.06)]">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--ink-soft)]">Participantes</p>
                  <h3 className="font-syne text-lg font-extrabold uppercase text-[var(--ink)]">Lista da ata</h3>
                </div>
                <span className="inline-flex items-center gap-2 rounded-full border border-[rgba(21,38,43,0.08)] bg-white px-3 py-1 font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--ink-soft)]"><Users size={12} />{participantes.length}</span>
              </div>

              <div className="grid gap-3">
                <input type="text" value={participantDraft.name} onChange={(event) => setParticipantDraft((prev) => ({ ...prev, name: event.target.value }))} onKeyDown={handleParticipantKeyDown} placeholder="Nome do participante" className="w-full rounded-[16px] border border-[rgba(21,38,43,0.12)] bg-white px-4 py-3 font-dm text-sm text-[var(--ink)] outline-none transition-colors focus:border-[rgba(21,38,43,0.28)]" />
                <input type="email" value={participantDraft.email} onChange={(event) => setParticipantDraft((prev) => ({ ...prev, email: event.target.value }))} onKeyDown={handleParticipantKeyDown} placeholder="E-mail (opcional, usado no envio da ata)" className="w-full rounded-[16px] border border-[rgba(21,38,43,0.12)] bg-white px-4 py-3 font-dm text-sm text-[var(--ink)] outline-none transition-colors focus:border-[rgba(21,38,43,0.28)]" />
                <button type="button" onClick={addParticipant} className="btn-outline rounded-full px-4 py-3 font-mono text-xs uppercase">Adicionar participante</button>
              </div>

              {participantes.length === 0 ? (
                <div className="mt-4 rounded-[20px] border border-dashed border-[rgba(21,38,43,0.14)] bg-[rgba(255,255,255,0.66)] px-4 py-5 text-center">
                  <p className="font-dm text-sm text-[var(--ink-soft)]">Adicione os participantes para estruturar a ata e o envio para aprovação.</p>
                </div>
              ) : (
                <div className="mt-4 flex max-h-[260px] flex-wrap gap-2 overflow-y-auto pr-1">
                  {participantes.map((participant) => <ParticipantChip key={participant.id} participant={participant} onRemove={() => setParticipantes((prev) => prev.filter((item) => item.id !== participant.id))} />)}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[rgba(21,38,43,0.08)] bg-white/70 px-6 py-4 md:px-8">
          <p className="font-dm text-sm text-[var(--ink-soft)]">Fluxo atual preservado: iniciar, registrar itens, encerrar, gerar ata e compartilhar.</p>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="btn-outline rounded-full px-4 py-2.5 font-mono text-xs uppercase">Cancelar</button>
            <button type="button" onClick={handleSubmit} className="btn-primary rounded-full px-5 py-2.5 font-mono text-xs uppercase">Iniciar reunião</button>
          </div>
        </div>
      </div>
    </div>
  );
}
function MeetingCard({ meeting, onOpen, onOpenDelete }) {
  const metrics = getMeetingMetrics(meeting);
  const participants = meeting.participantes || [];
  const shownParticipants = participants.slice(0, 4);
  const hiddenParticipants = participants.length - shownParticipants.length;

  return (
    <div className="app-panel group flex h-full flex-col rounded-[30px] p-5 shadow-[0_18px_36px_rgba(21,38,43,0.06)] transition-all hover:-translate-y-0.5 hover:shadow-[0_24px_50px_rgba(21,38,43,0.1)]">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--ink-soft)]">{meeting.id}</p>
          <h3 className="mt-2 font-syne text-xl font-extrabold uppercase leading-tight text-[var(--ink)]">{meeting.titulo}</h3>
        </div>
        <StatusBadge status={meeting.status} />
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <AtaBadge meeting={meeting} />
        {meeting.ataGerada && <span className="inline-flex items-center gap-2 rounded-full border border-[rgba(21,38,43,0.08)] bg-white px-3 py-1 font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--ink-soft)]"><FileText size={12} />Ata pronta</span>}
      </div>

      <div className="grid gap-3 rounded-[24px] border border-[rgba(21,38,43,0.08)] bg-[rgba(255,255,255,0.76)] p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--ink-soft)]">Data</p>
            <p className="mt-1 font-dm text-sm font-semibold text-[var(--ink)]">{fmtDate(meeting.data)}</p>
          </div>
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--ink-soft)]">Horário</p>
            <p className="mt-1 font-dm text-sm font-semibold text-[var(--ink)]">{meeting.horarioInicio}{meeting.horarioFim ? ` às ${meeting.horarioFim}` : ''}</p>
          </div>
        </div>

        {meeting.nomeCliente && <div><p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--ink-soft)]">Cliente</p><p className="mt-1 font-dm text-sm text-[var(--ink)]">{meeting.nomeCliente}</p></div>}
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--ink-soft)]">Pauta</p>
          <p className="mt-1 min-h-[42px] font-dm text-sm leading-relaxed text-[var(--ink)]">{meeting.pauta || 'Reunião sem pauta detalhada.'}</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="metric-card rounded-[20px] px-4 py-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--ink-soft)]">Registros</p>
          <p className="mt-2 font-syne text-2xl font-extrabold text-[var(--ink)]">{(meeting.items || []).length}</p>
          <p className="mt-1 font-dm text-xs text-[var(--ink-soft)]">{metrics.decisoes} decisões • {metrics.tarefas} tarefas</p>
        </div>
        <div className="metric-card rounded-[20px] px-4 py-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--ink-soft)]">Pendências</p>
          <p className="mt-2 font-syne text-2xl font-extrabold text-[var(--ink)]">{metrics.pendencias}</p>
          <p className="mt-1 font-dm text-xs text-[var(--ink-soft)]">{metrics.observacoes} observações</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {shownParticipants.map((participant) => (
          <span key={participant.id} className="inline-flex items-center gap-2 rounded-full border border-[rgba(21,38,43,0.08)] bg-white px-3 py-1.5">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[rgba(23,48,56,0.92)] font-mono text-[11px] font-bold uppercase text-[var(--accent)]">{getInitial(participant.name)}</span>
            <span className="font-dm text-xs text-[var(--ink)]">{participant.name}</span>
          </span>
        ))}
        {hiddenParticipants > 0 && <span className="inline-flex rounded-full border border-[rgba(21,38,43,0.08)] bg-white px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--ink-soft)]">+{hiddenParticipants}</span>}
        {participants.length === 0 && <span className="font-dm text-xs text-[var(--ink-soft)]">Nenhum participante registrado.</span>}
      </div>

      <div className="mt-5 flex items-center justify-between gap-3 border-t border-[rgba(21,38,43,0.08)] pt-4">
        <button onClick={onOpen} className="btn-primary flex-1 rounded-full px-4 py-2.5 font-mono text-xs uppercase">{meeting.status === 'Em andamento' ? 'Abrir reunião' : 'Abrir ata'}</button>
        <button onClick={(event) => { event.stopPropagation(); onOpenDelete(meeting); }} className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-red-200 bg-red-50 text-red-600 transition-colors hover:border-red-300 hover:bg-red-100" title="Excluir reunião"><Trash2 size={15} /></button>
      </div>
    </div>
  );
}

function ConfirmDeleteModal({ meeting, onClose, onConfirm }) {
  if (!meeting) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#15262b]/45 px-4" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="w-full max-w-md overflow-hidden rounded-[28px] bg-white shadow-[0_28px_60px_rgba(21,38,43,0.22)]">
        <div className="flex items-center gap-3 bg-red-600 px-6 py-4 text-white">
          <AlertTriangle size={18} />
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-red-100">Ação crítica</p>
            <h2 className="font-syne text-lg font-extrabold uppercase">Excluir reunião</h2>
          </div>
        </div>
        <div className="space-y-4 px-6 py-5">
          <p className="font-dm text-sm leading-relaxed text-[var(--ink)]">Tem certeza que deseja excluir <strong>{meeting.titulo}</strong> ({meeting.id})?</p>
          <div className="rounded-[20px] border border-red-100 bg-red-50 px-4 py-3"><p className="font-dm text-sm text-red-700">Essa ação remove o registro local da reunião e das anotações vinculadas. Itens já enviados ao PMO não são removidos automaticamente.</p></div>
        </div>
        <div className="flex justify-end gap-3 border-t border-[rgba(21,38,43,0.08)] px-6 py-4">
          <button onClick={onClose} className="btn-outline rounded-full px-4 py-2.5 font-mono text-xs uppercase">Cancelar</button>
          <button onClick={() => onConfirm(meeting.id)} className="rounded-full bg-red-600 px-5 py-2.5 font-mono text-xs uppercase text-white transition-colors hover:bg-red-700">Excluir</button>
        </div>
      </div>
    </div>
  );
}

function buildMeetingsBasePath(isAdmin, clientId) {
  return isAdmin && clientId ? `/admin/cliente/${clientId}/reunioes` : '/reunioes';
}
export default function Reunioes({ clientId: propClientId, isAdmin = false, adminClientName, onAdminBack }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const effectiveClientId = propClientId || user?.clientId;
  const [showModal, setShowModal] = useState(false);
  const [meetingToDelete, setMeetingToDelete] = useState(null);
  const [viewMode, setViewMode] = useState('cards');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [refreshTick, setRefreshTick] = useState(0);

  const meetings = (() => {
    let stored = [];
    if (effectiveClientId) stored = getStorage(KEYS.meetings(effectiveClientId), []);
    if (stored.length === 0) {
      for (let index = 0; index < localStorage.length; index += 1) {
        const key = localStorage.key(index);
        if (key && key.startsWith('opice_ir_meetings_')) {
          try {
            const data = JSON.parse(localStorage.getItem(key));
            if (Array.isArray(data) && data.length > 0) { stored = data; break; }
          } catch {
            // ignore broken entries
          }
        }
      }
    }
    void location.key;
    void refreshTick;
    return stored.map(normalizeMeeting);
  })();

  const filteredMeetings = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return meetings.filter((meeting) => {
      const matchesStatus = statusFilter === 'all' || meeting.status === statusFilter;
      if (!matchesStatus) return false;
      if (!term) return true;
      const participants = (meeting.participantes || []).map((participant) => `${participant.name} ${participant.email}`).join(' ');
      const haystack = `${meeting.id} ${meeting.titulo} ${meeting.nomeCliente || ''} ${meeting.pauta || ''} ${participants}`.toLowerCase();
      return haystack.includes(term);
    });
  }, [meetings, searchTerm, statusFilter]);

  const counters = useMemo(() => ({
    total: meetings.length,
    closed: meetings.filter((meeting) => meeting.status === 'Encerrada').length,
    live: meetings.filter((meeting) => meeting.status === 'Em andamento').length,
    awaiting: meetings.filter((meeting) => getAtaStatus(meeting).label === 'Enviada para aprovação').length,
  }), [meetings]);

  function openMeeting(meeting) {
    const basePath = buildMeetingsBasePath(isAdmin, propClientId);
    navigate(`${basePath}/${meeting.id}`, { state: { meeting, clientId: effectiveClientId } });
  }

  function handleCreated(meeting) {
    setShowModal(false);
    openMeeting(meeting);
  }

  function handleDelete(meetingId) {
    let targetClientId = effectiveClientId;
    if (!targetClientId) {
      for (let index = 0; index < localStorage.length; index += 1) {
        const key = localStorage.key(index);
        if (key && key.startsWith('opice_ir_meetings_')) {
          try {
            const data = JSON.parse(localStorage.getItem(key));
            if (Array.isArray(data) && data.some((meeting) => meeting.id === meetingId)) {
              targetClientId = key.replace('opice_ir_meetings_', '');
              break;
            }
          } catch {
            // ignore broken entries
          }
        }
      }
    }
    if (!targetClientId) {
      setMeetingToDelete(null);
      return;
    }
    const key = KEYS.meetings(targetClientId);
    setStorage(key, getStorage(key, []).filter((meeting) => meeting.id !== meetingId));
    setRefreshTick((prev) => prev + 1);
    setMeetingToDelete(null);
  }

  return (
    <Layout clientId={propClientId} isAdmin={isAdmin} adminClientName={adminClientName} onAdminBack={onAdminBack}>
      <div className="px-6 pb-8 pt-6 md:px-10 md:pt-10">
        <section className="app-panel overflow-hidden rounded-[34px] shadow-[0_18px_40px_rgba(21,38,43,0.08)]">
          <div className="grid gap-0 xl:grid-cols-[1.35fr_0.65fr]">
            <div className="px-6 py-6 md:px-8 md:py-8">
              <p className="section-kicker mb-3">Governança da ata</p>
              <h1 className="max-w-3xl font-syne text-4xl font-extrabold uppercase leading-[0.95] text-[var(--ink)] md:text-5xl">Reuniões do incidente</h1>
              <p className="mt-4 max-w-2xl font-dm text-base leading-relaxed text-[var(--ink-soft)]">Registre decisões, tarefas e pendências em tempo real. Ao encerrar, a ata já nasce pronta para envio e acompanhamento de aprovação.</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <button onClick={() => setShowModal(true)} className="btn-primary rounded-full px-5 py-3 font-mono text-xs uppercase"><span className="inline-flex items-center gap-2"><Plus size={14} /> Nova reunião</span></button>
                <button onClick={() => setViewMode((prev) => (prev === 'cards' ? 'list' : 'cards'))} className="btn-outline rounded-full px-5 py-3 font-mono text-xs uppercase">Alternar para {viewMode === 'cards' ? 'lista' : 'cards'}</button>
              </div>
            </div>
            <div className="app-panel-dark flex flex-col justify-between gap-5 px-6 py-6 md:px-8 md:py-8">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[rgba(255,255,255,0.72)]">Visão rápida</p>
                <div className="mt-5 grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
                  <div className="rounded-[24px] border border-white/10 bg-white/6 px-4 py-4"><p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[rgba(255,255,255,0.62)]">Total</p><p className="mt-2 font-syne text-4xl font-extrabold text-white">{counters.total}</p><p className="mt-1 font-dm text-sm text-[rgba(255,255,255,0.72)]">Reuniões registradas</p></div>
                  <div className="rounded-[24px] border border-white/10 bg-white/6 px-4 py-4"><p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[rgba(255,255,255,0.62)]">Em andamento</p><p className="mt-2 font-syne text-4xl font-extrabold text-[var(--accent)]">{counters.live}</p><p className="mt-1 font-dm text-sm text-[rgba(255,255,255,0.72)]">Monitoradas em tempo real</p></div>
                  <div className="rounded-[24px] border border-white/10 bg-white/6 px-4 py-4"><p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[rgba(255,255,255,0.62)]">Ata aguardando</p><p className="mt-2 font-syne text-4xl font-extrabold text-white">{counters.awaiting}</p><p className="mt-1 font-dm text-sm text-[rgba(255,255,255,0.72)]">Em aprovação</p></div>
                </div>
              </div>
              <div className="rounded-[24px] border border-[rgba(255,178,31,0.22)] bg-[rgba(255,178,31,0.1)] px-4 py-4"><p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#ffcf7a]">Boa prática</p><p className="mt-2 font-dm text-sm leading-relaxed text-[rgba(255,255,255,0.82)]">Cadastre e-mails dos participantes para enviar a ata com um clique e acompanhar aprovações sem fluxo burocrático.</p></div>
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-[28px] border border-[rgba(21,38,43,0.08)] bg-white/70 p-4 shadow-[0_12px_24px_rgba(21,38,43,0.04)] md:p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-1 items-center gap-3 rounded-[22px] border border-[rgba(21,38,43,0.08)] bg-white px-4 py-3 shadow-[0_10px_22px_rgba(21,38,43,0.04)]"><Search size={16} className="text-[var(--ink-soft)]" /><input type="text" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Buscar por reunião, cliente, participante ou pauta" className="w-full bg-transparent font-dm text-sm text-[var(--ink)] outline-none placeholder:text-[var(--ink-soft)]" /></div>
            <div className="flex flex-wrap gap-2">
              {[{ label: 'Todas', value: 'all' }, { label: 'Em andamento', value: 'Em andamento' }, { label: 'Encerradas', value: 'Encerrada' }].map((filter) => (
                <button key={filter.value} onClick={() => setStatusFilter(filter.value)} className={`rounded-full px-4 py-2 font-mono text-xs uppercase transition-colors ${statusFilter === filter.value ? 'bg-[#173038] text-white' : 'border border-[rgba(21,38,43,0.1)] bg-white text-[var(--ink-soft)] hover:text-[var(--ink)]'}`}>{filter.label}</button>
              ))}
            </div>
          </div>
        </section>

        {filteredMeetings.length === 0 ? (
          <div className="mt-6 flex flex-col items-center justify-center gap-4 rounded-[32px] border border-dashed border-[rgba(21,38,43,0.14)] bg-white/70 px-6 py-20 text-center"><BookOpen size={42} className="text-[var(--ink-soft)]" /><div><h2 className="font-syne text-2xl font-extrabold uppercase text-[var(--ink)]">Nenhuma reunião encontrada</h2><p className="mt-2 font-dm text-sm text-[var(--ink-soft)]">Ajuste os filtros ou inicie uma nova reunião para começar a montar as atas.</p></div><button onClick={() => setShowModal(true)} className="btn-primary rounded-full px-5 py-3 font-mono text-xs uppercase"><span className="inline-flex items-center gap-2"><Plus size={14} /> Nova reunião</span></button></div>
        ) : viewMode === 'cards' ? (
          <section className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">{filteredMeetings.map((meeting) => <MeetingCard key={meeting.id} meeting={meeting} onOpen={() => openMeeting(meeting)} onOpenDelete={(target) => setMeetingToDelete(target)} />)}</section>
        ) : (
          <section className="mt-6 overflow-hidden rounded-[30px] border border-[rgba(21,38,43,0.08)] bg-white shadow-[0_18px_36px_rgba(21,38,43,0.05)]">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px]">
                <thead><tr className="bg-[#173038]"><th className="px-5 py-4 text-left font-mono text-[11px] uppercase tracking-[0.18em] text-white">Reunião</th><th className="px-5 py-4 text-left font-mono text-[11px] uppercase tracking-[0.18em] text-white">Participantes</th><th className="px-5 py-4 text-left font-mono text-[11px] uppercase tracking-[0.18em] text-white">Registros</th><th className="px-5 py-4 text-left font-mono text-[11px] uppercase tracking-[0.18em] text-white">Ata</th><th className="px-5 py-4 text-left font-mono text-[11px] uppercase tracking-[0.18em] text-white">Ações</th></tr></thead>
                <tbody>
                  {filteredMeetings.map((meeting, index) => {
                    const metrics = getMeetingMetrics(meeting);
                    return (
                      <tr key={meeting.id} className={index % 2 === 0 ? 'bg-white' : 'bg-[rgba(21,38,43,0.02)]'}>
                        <td className="px-5 py-4 align-top"><p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--ink-soft)]">{meeting.id}</p><p className="mt-2 font-dm text-sm font-semibold text-[var(--ink)]">{meeting.titulo}</p><p className="mt-1 font-dm text-xs text-[var(--ink-soft)]">{fmtDate(meeting.data)} • {meeting.horarioInicio}{meeting.horarioFim ? ` às ${meeting.horarioFim}` : ''}</p><p className="mt-2 font-dm text-xs text-[var(--ink-soft)]">{meeting.nomeCliente || 'Cliente não informado'}</p></td>
                        <td className="px-5 py-4 align-top"><div className="space-y-2">{meeting.participantes.length === 0 ? <p className="font-dm text-sm text-[var(--ink-soft)]">Nenhum participante registrado.</p> : meeting.participantes.slice(0, 4).map((participant) => <div key={participant.id} className="rounded-[18px] border border-[rgba(21,38,43,0.08)] bg-[rgba(255,255,255,0.72)] px-3 py-2"><p className="font-dm text-sm font-medium text-[var(--ink)]">{participant.name}</p><p className="font-dm text-xs text-[var(--ink-soft)]">{participant.email || 'Sem e-mail'}</p></div>)}</div></td>
                        <td className="px-5 py-4 align-top"><p className="font-dm text-sm text-[var(--ink)]">{(meeting.items || []).length} item(ns)</p><p className="mt-1 font-dm text-xs text-[var(--ink-soft)]">{metrics.decisoes} decisões • {metrics.tarefas} tarefas • {metrics.pendencias} pendências</p></td>
                        <td className="px-5 py-4 align-top"><AtaBadge meeting={meeting} /></td>
                        <td className="px-5 py-4 align-top"><div className="flex flex-wrap gap-2"><button onClick={() => openMeeting(meeting)} className="btn-outline rounded-full px-4 py-2 font-mono text-xs uppercase">Abrir</button><button onClick={() => setMeetingToDelete(meeting)} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-red-200 bg-red-50 text-red-600 transition-colors hover:bg-red-100"><Trash2 size={14} /></button></div></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>

      {showModal && <NovaReuniaoModal clientId={effectiveClientId} onClose={() => setShowModal(false)} onCreated={handleCreated} />}
      {meetingToDelete && <ConfirmDeleteModal meeting={meetingToDelete} onClose={() => setMeetingToDelete(null)} onConfirm={handleDelete} />}
    </Layout>
  );
}
