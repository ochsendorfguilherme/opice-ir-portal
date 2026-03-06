import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import { getStorage, setStorage, KEYS } from '../utils/storage';
import { BookOpen, Plus, X, FileText, Clock, Trash2, AlertTriangle } from 'lucide-react';

// ─── helpers ────────────────────────────────────────────────────────────────

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function nowTimeStr() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function fmtDate(dateStr) {
  if (!dateStr) return '—';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

function genId(meetings) {
  // Find the highest existing MTG number to avoid collisions
  let maxNum = 0;
  meetings.forEach(m => {
    const match = m.id?.match(/^MTG(\d+)$/);
    if (match) maxNum = Math.max(maxNum, parseInt(match[1], 10));
  });
  const num = (maxNum + 1).toString().padStart(3, '0');
  return `MTG${num}`;
}

function getInitial(name) {
  return (name || '').trim().charAt(0).toUpperCase();
}

// ─── Participant chip in the "add" modal ─────────────────────────────────────

function ParticipantChip({ name, onRemove }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-[rgba(183,236,35,0.28)] bg-[rgba(214,255,99,0.12)] px-2.5 py-1 font-mono text-[10px] uppercase text-[#6e8617]">
      {name}
      <button
        type="button"
        onClick={onRemove}
        className="hover:text-[#fffdf8] transition-colors"
        aria-label={`Remover ${name}`}
      >
        <X size={10} />
      </button>
    </span>
  );
}

// ─── Avatar-like initials chip for meeting cards ─────────────────────────────

function InitialChip({ initial }) {
  return (
    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[rgba(23,48,56,0.12)] text-[var(--ink)] font-mono text-xs font-bold uppercase">
      {initial}
    </span>
  );
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  if (status === 'Em andamento') {
    return (
      <span className="inline-flex items-center gap-1.5 font-mono text-xs text-red-600 border border-red-300 bg-red-50 px-2 py-0.5">
        <span className="w-1.5 h-1.5 bg-red-500 animate-pulse inline-block" />
        Em andamento
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-xs text-green-700 border border-green-300 bg-green-50 px-2 py-0.5">
      <span className="w-1.5 h-1.5 bg-green-500 inline-block" />
      Encerrada
    </span>
  );
}

// ─── Nova Reunião Modal ───────────────────────────────────────────────────────

function NovaReuniaoModal({ clientId, onClose, onCreated }) {
  const clientInfo = getStorage(KEYS.info(clientId), {});

  const [form, setForm] = useState({
    titulo: '',
    data: todayStr(),
    horarioInicio: nowTimeStr(),
    nomeCliente: clientInfo?.nomeCliente || '',
    pauta: '',
  });
  const [participantInput, setParticipantInput] = useState('');
  const [participantes, setParticipantes] = useState([]);
  const [errors, setErrors] = useState({});

  function handleChange(field, value) {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: null }));
  }

  function addParticipant() {
    const name = participantInput.trim();
    if (!name) return;
    if (participantes.includes(name)) {
      setParticipantInput('');
      return;
    }
    setParticipantes(prev => [...prev, name]);
    setParticipantInput('');
  }

  function removeParticipant(name) {
    setParticipantes(prev => prev.filter(p => p !== name));
  }

  function handleParticipantKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      addParticipant();
    }
  }

  function validate() {
    const errs = {};
    if (!form.titulo.trim()) errs.titulo = 'Título obrigatório';
    if (!form.data) errs.data = 'Data obrigatória';
    if (!form.horarioInicio) errs.horarioInicio = 'Horário obrigatório';
    return errs;
  }

  function handleSubmit() {
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    const existing = getStorage(KEYS.meetings(clientId), []);
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
      items: [],
      notasLivres: '',
      ataGerada: false,
      clientId: clientId, // Pre-save clientId for easier deletion fallback
    };

    setStorage(KEYS.meetings(clientId), [newMeeting, ...existing]);
    onCreated(newMeeting);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#15262b]/45"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="app-panel w-full max-w-lg mx-4 shadow-[0_28px_56px_rgba(21,38,43,0.22)] flex flex-col max-h-[90vh] rounded-[30px] overflow-hidden">
        {/* Header */}
        <div className="soft-ribbon px-6 py-4 flex items-center justify-between rounded-t-[28px]">
          <h2 className="font-syne font-extrabold text-[var(--accent)] text-lg uppercase">
            Nova Reunião
          </h2>
          <button onClick={onClose} className="text-[#E0E0E0] hover:text-[#fffdf8]">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
          {/* Título */}
          <div>
            <label className="block font-mono text-xs uppercase font-medium text-[var(--ink)] mb-1">
              Título <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.titulo}
              onChange={e => handleChange('titulo', e.target.value)}
              placeholder="Ex.: Reunião de Status — Dia 1"
              className={`w-full border px-3 py-2 font-dm text-sm text-[var(--ink)] bg-white outline-none focus:border-[rgba(21,38,43,0.16)] transition-colors ${errors.titulo ? 'border-red-500' : 'border-[rgba(21,38,43,0.12)]'}`}
            />
            {errors.titulo && <p className="font-mono text-xs text-red-500 mt-1">{errors.titulo}</p>}
          </div>

          {/* Data + Horário */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-mono text-xs uppercase font-medium text-[var(--ink)] mb-1">
                Data <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={form.data}
                onChange={e => handleChange('data', e.target.value)}
                className={`w-full border px-3 py-2 font-dm text-sm text-[var(--ink)] bg-white outline-none focus:border-[rgba(21,38,43,0.16)] transition-colors ${errors.data ? 'border-red-500' : 'border-[rgba(21,38,43,0.12)]'}`}
              />
            </div>
            <div>
              <label className="block font-mono text-xs uppercase font-medium text-[var(--ink)] mb-1">
                Horário de Início <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                value={form.horarioInicio}
                onChange={e => handleChange('horarioInicio', e.target.value)}
                className={`w-full border px-3 py-2 font-dm text-sm text-[var(--ink)] bg-white outline-none focus:border-[rgba(21,38,43,0.16)] transition-colors ${errors.horarioInicio ? 'border-red-500' : 'border-[rgba(21,38,43,0.12)]'}`}
              />
            </div>
          </div>

          {/* Nome do Cliente */}
          <div>
            <label className="block font-mono text-xs uppercase font-medium text-[var(--ink)] mb-1">
              Nome do Cliente
            </label>
            <input
              type="text"
              value={form.nomeCliente}
              onChange={e => handleChange('nomeCliente', e.target.value)}
              className="w-full border border-[rgba(21,38,43,0.12)] px-3 py-2 font-dm text-sm text-[var(--ink)] bg-white outline-none focus:border-[rgba(21,38,43,0.16)] transition-colors"
            />
          </div>

          {/* Participantes */}
          <div>
            <label className="block font-mono text-xs uppercase font-medium text-[var(--ink)] mb-1">
              Participantes
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={participantInput}
                onChange={e => setParticipantInput(e.target.value)}
                onKeyDown={handleParticipantKeyDown}
                placeholder="Nome do participante"
                className="flex-1 border border-[rgba(21,38,43,0.12)] px-3 py-2 font-dm text-sm text-[var(--ink)] bg-white outline-none focus:border-[rgba(21,38,43,0.16)] transition-colors"
              />
              <button
                type="button"
                onClick={addParticipant}
                className="bg-[#173038] text-[#fffdf8] font-mono text-xs px-3 py-2 hover:bg-[#0f2128] transition-colors"
              >
                Adicionar
              </button>
            </div>
            {participantes.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {participantes.map(name => (
                  <ParticipantChip
                    key={name}
                    name={name}
                    onRemove={() => removeParticipant(name)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Pauta */}
          <div>
            <label className="block font-mono text-xs uppercase font-medium text-[var(--ink)] mb-1">
              Pauta / Objetivo
            </label>
            <textarea
              value={form.pauta}
              onChange={e => handleChange('pauta', e.target.value)}
              rows={3}
              placeholder="Descreva o objetivo desta reunião..."
              className="w-full border border-[rgba(21,38,43,0.12)] px-3 py-2 font-dm text-sm text-[var(--ink)] bg-white outline-none focus:border-[rgba(21,38,43,0.16)] transition-colors resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[rgba(21,38,43,0.12)] flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="font-mono text-xs uppercase px-4 py-2 border border-[rgba(21,38,43,0.12)] text-[var(--ink-soft)] hover:border-[rgba(21,38,43,0.16)] hover:text-[var(--ink)] transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="font-mono text-xs uppercase px-5 py-2 bg-[#173038] text-[var(--accent)] hover:bg-[#0f2128] transition-colors"
          >
            Iniciar Reunião →
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Meeting Card ─────────────────────────────────────────────────────────────

function MeetingCard({ meeting, onOpen, onOpenDelete }) {
  const maxChips = 5;
  const shownParticipants = meeting.participantes.slice(0, maxChips);
  const overflow = meeting.participantes.length - maxChips;

  return (
    <div className="app-panel rounded-[28px] hover:-translate-y-0.5 transition-all shadow-[0_18px_36px_rgba(21,38,43,0.06)] flex flex-col overflow-hidden">
      {/* Top accent */}
      <div className={`h-0.5 w-full ${meeting.status === 'Em andamento' ? 'bg-red-500' : 'bg-green-500'}`} />

      <div className="p-5 flex flex-col gap-3 flex-1">
        {/* ID + Status */}
        <div className="flex items-center justify-between">
          <span className="font-mono text-xs text-[var(--ink-soft)]">{meeting.id}</span>
          <StatusBadge status={meeting.status} />
        </div>

        {/* Title */}
        <h3 className="font-syne font-extrabold text-[var(--ink)] text-base uppercase leading-tight">
          {meeting.titulo}
        </h3>

        {/* Date / Time */}
        <div className="font-mono text-xs text-[var(--ink-soft)]">
          {fmtDate(meeting.data)} &nbsp;·&nbsp; {meeting.horarioInicio}
          {meeting.horarioFim ? ` às ${meeting.horarioFim}` : ''}
        </div>

        {/* Client name */}
        {meeting.nomeCliente && (
          <div className="font-dm text-xs text-[var(--ink-soft)] truncate">{meeting.nomeCliente}</div>
        )}

        {/* Participant initials */}
        {meeting.participantes.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap">
            {shownParticipants.map((p, i) => (
              <InitialChip key={i} initial={getInitial(p)} />
            ))}
            {overflow > 0 && (
              <span className="font-mono text-xs text-[var(--ink-soft)]">+{overflow}</span>
            )}
            <span className="font-mono text-xs text-[var(--ink-soft)] ml-1">
              {meeting.participantes.length} participante{meeting.participantes.length !== 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 pb-4 flex gap-2">
        <button
          onClick={onOpen}
          className="flex-1 font-mono text-xs uppercase py-2 border border-[rgba(21,38,43,0.16)] text-[var(--ink)] hover:bg-[#173038] hover:text-[var(--accent)] transition-colors"
        >
          {meeting.status === 'Em andamento' ? 'Abrir →' : 'Ver Ata →'}
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onOpenDelete(meeting); }}
          className="flex items-center justify-center px-3 py-2 border border-red-200 text-red-500 hover:bg-red-50 hover:border-red-500 hover:text-red-700 transition-colors"
          title="Excluir Reunião"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

// ─── Confirm Delete Modal ──────────────────────────────────────────────────

function ConfirmDeleteModal({ meeting, onClose, onConfirm }) {
  if (!meeting) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#15262b]/45" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white w-full max-w-sm mx-4 shadow-2xl flex flex-col">
        <div className="bg-red-600 px-6 py-4 flex items-center gap-2 text-[#fffdf8]">
          <AlertTriangle size={18} />
          <h2 className="font-syne font-extrabold text-sm uppercase">Excluir Reunião</h2>
        </div>
        <div className="p-6">
          <p className="font-dm text-[var(--ink)] text-sm mb-4">
            Tem certeza que deseja excluir a reunião <strong>{meeting.titulo}</strong> ({meeting.id})?
          </p>
          <p className="font-mono text-xs text-red-600 bg-red-50 p-3 border border-red-200">
            Esta ação não pode ser desfeita. Todos os itens e anotações desta reunião serão perdidos. As ações já enviadas ao PMO <strong>não</strong> serão apagadas automaticamente.
          </p>
        </div>
        <div className="px-6 py-4 border-t border-[rgba(21,38,43,0.12)] flex justify-end gap-3 bg-white/72">
          <button onClick={onClose} className="font-mono text-xs px-4 py-2 border border-[rgba(21,38,43,0.12)] text-[var(--ink-soft)] hover:border-[rgba(21,38,43,0.16)] hover:text-[var(--ink)] transition-colors uppercase">
            Cancelar
          </button>
          <button onClick={() => onConfirm(meeting.id)} className="font-mono text-xs px-5 py-2 bg-red-600 text-[#fffdf8] hover:bg-red-700 transition-colors uppercase">
            SIM, EXCLUIR
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Reunioes({ clientId: propClientId, isAdmin = false, adminClientName, onAdminBack }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const effectiveClientId = propClientId || user?.clientId;

  const [meetings, setMeetings] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [meetingToDelete, setMeetingToDelete] = useState(null);
  const [viewMode, setViewMode] = useState('cards'); // 'cards' or 'list'

  // Reload meetings every time we navigate back to this page
  useEffect(() => {
    // Try with effectiveClientId first, then scan all keys
    let stored = [];
    if (effectiveClientId) {
      stored = getStorage(KEYS.meetings(effectiveClientId), []);
    }
    // If no meetings found and no clientId, scan all localStorage keys
    if (stored.length === 0) {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('opice_ir_meetings_')) {
          try {
            const data = JSON.parse(localStorage.getItem(key));
            if (Array.isArray(data) && data.length > 0) {
              stored = data;
              break;
            }
          } catch { /* skip */ }
        }
      }
    }
    setMeetings(stored);
  }, [effectiveClientId, location.key]); // location.key changes on every navigation

  function handleCreated(meeting) {
    setShowModal(false);
    const basePath = isAdmin && propClientId ? `/admin/cliente/${propClientId}` : '';
    navigate(`${basePath}/reunioes/${meeting.id}`, { state: { meeting, clientId: effectiveClientId } });
  }

  function openMeeting(meeting) {
    const basePath = isAdmin && propClientId ? `/admin/cliente/${propClientId}` : '';
    navigate(`${basePath}/reunioes/${meeting.id}`, { state: { meeting, clientId: effectiveClientId } });
  }

  function handleDelete(meetingId) {
    let targetClientId = effectiveClientId;

    // Fallback: If no effectiveClientId, we must find which client this meeting belongs to
    if (!targetClientId) {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('opice_ir_meetings_')) {
          try {
            const data = JSON.parse(localStorage.getItem(key));
            if (Array.isArray(data) && data.some(m => m.id === meetingId)) {
              targetClientId = key.replace('opice_ir_meetings_', '');
              break;
            }
          } catch { /* skip */ }
        }
      }
    }

    if (!targetClientId) {
      console.warn("Could not find client ID for meeting deletion");
      setMeetingToDelete(null);
      return;
    }

    const key = KEYS.meetings(targetClientId);
    const stored = getStorage(key, []);
    const updated = stored.filter(m => m.id !== meetingId);
    setStorage(key, updated);

    // Update local state if we are currently viewing this client's list or global list
    setMeetings(prev => prev.filter(m => m.id !== meetingId));
    setMeetingToDelete(null);
  }

  return (
    <Layout
      clientId={propClientId}
      isAdmin={isAdmin}
      adminClientName={adminClientName}
      onAdminBack={onAdminBack}
    >
      <div className="px-6 pb-8 pt-6 md:px-10 md:pt-10">
        {/* Page header */}
        <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
          <div>
            <h1 className="font-syne font-extrabold text-[var(--ink)] text-4xl uppercase">
              Registro de Reuniões
            </h1>
            <p className="text-[var(--ink-soft)] font-dm text-sm mt-1">
              Capture decisões, tarefas e pendências em tempo real
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="btn-primary flex items-center gap-2 rounded-full px-5 py-3 font-mono text-xs uppercase"
          >
            <Plus size={14} />
            Nova Reunião
          </button>
        </div>

        {/* Content */}
        {meetings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 border border-dashed border-[rgba(21,38,43,0.12)]">
            <BookOpen size={40} className="text-[#E0E0E0]" />
            <p className="font-dm text-[var(--ink-soft)] text-sm">Nenhuma reunião registrada</p>
            <button
              onClick={() => setShowModal(true)}
              className="font-mono text-xs uppercase px-4 py-2 border border-[rgba(21,38,43,0.12)] text-[var(--ink-soft)] hover:border-[rgba(21,38,43,0.16)] hover:text-[var(--ink)] transition-colors mt-2"
            >
              + Nova Reunião
            </button>
          </div>
        ) : (
          <>
            {/* View toggle + Stats */}
            <div className="app-panel mb-4 flex items-center justify-between rounded-[24px] p-4 shadow-[0_14px_28px_rgba(21,38,43,0.05)]">
              <div className="flex items-center gap-3 font-mono text-xs text-[var(--ink-soft)]">
                <span>{meetings.length} reuniõ{meetings.length === 1 ? '' : 'es'}</span>
                <span>·</span>
                <span className="text-green-600">{meetings.filter(m => m.status === 'Encerrada').length} encerrada{meetings.filter(m => m.status === 'Encerrada').length !== 1 ? 's' : ''}</span>
                <span>·</span>
                <span className="text-red-600">{meetings.filter(m => m.status === 'Em andamento').length} em andamento</span>
              </div>
              <div className="flex rounded-full border border-[rgba(21,38,43,0.12)] bg-white/70 p-1">
                <button
                  onClick={() => setViewMode('cards')}
                  className={`px-3 py-1.5 font-mono text-xs ${viewMode === 'cards' ? 'rounded-full bg-[#173038] text-white' : 'rounded-full bg-transparent text-[var(--ink-soft)] hover:bg-white'}`}
                >
                  Cards
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-1.5 font-mono text-xs ${viewMode === 'list' ? 'rounded-full bg-[#173038] text-white' : 'rounded-full bg-transparent text-[var(--ink-soft)] hover:bg-white'}`}
                >
                  Lista
                </button>
              </div>
            </div>

            {/* Cards view */}
            {viewMode === 'cards' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {meetings.map(m => (
                  <MeetingCard
                    key={m.id}
                    meeting={m}
                    onOpen={() => openMeeting(m)}
                    onOpenDelete={(m) => setMeetingToDelete(m)}
                  />
                ))}
              </div>
            )}

            {/* List/Table view */}
            {viewMode === 'list' && (
              <div className="app-panel overflow-x-auto rounded-[28px] shadow-[0_18px_36px_rgba(21,38,43,0.06)]">
                <table className="w-full min-w-[700px]">
                  <thead>
                    <tr className="bg-[#173038]">
                      <th className="px-4 py-3 text-left font-mono text-xs text-[#fffdf8] uppercase">ID</th>
                      <th className="px-4 py-3 text-left font-mono text-xs text-[#fffdf8] uppercase">Título</th>
                      <th className="px-4 py-3 text-left font-mono text-xs text-[#fffdf8] uppercase">Data</th>
                      <th className="px-4 py-3 text-left font-mono text-xs text-[#fffdf8] uppercase">Horário</th>
                      <th className="px-4 py-3 text-left font-mono text-xs text-[#fffdf8] uppercase">Participantes</th>
                      <th className="px-4 py-3 text-left font-mono text-xs text-[#fffdf8] uppercase">Status</th>
                      <th className="px-4 py-3 text-left font-mono text-xs text-[#fffdf8] uppercase">Ata</th>
                      <th className="px-4 py-3 text-left font-mono text-xs text-[#fffdf8] uppercase">Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {meetings.map((m, idx) => (
                      <tr
                        key={m.id}
                        className={`hover:bg-[rgba(202,255,0,0.08)] transition-colors cursor-pointer ${idx % 2 === 0 ? 'bg-white' : 'bg-[#F9F9F9]'}`}
                        onClick={() => openMeeting(m)}
                      >
                        <td className="px-4 py-3 font-mono text-xs text-[var(--ink-soft)]">{m.id}</td>
                        <td className="px-4 py-3 font-dm text-sm text-[var(--ink)] font-medium">{m.titulo}</td>
                        <td className="px-4 py-3 font-mono text-xs text-[var(--ink-soft)]">{fmtDate(m.data)}</td>
                        <td className="px-4 py-3 font-mono text-xs text-[var(--ink-soft)]">
                          {m.horarioInicio}{m.horarioFim ? ` — ${m.horarioFim}` : ''}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-[var(--ink-soft)]">
                          {(m.participantes || []).length} participante{(m.participantes || []).length !== 1 ? 's' : ''}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={m.status} />
                        </td>
                        <td className="px-4 py-3">
                          {m.ataGerada ? (
                            <span className="font-mono text-xs text-green-600 flex items-center gap-1"><FileText size={11} /> Gerada</span>
                          ) : (
                            <span className="font-mono text-xs text-[var(--ink-soft)]">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button
                              onClick={(e) => { e.stopPropagation(); openMeeting(m); }}
                              className="font-mono text-xs text-[var(--ink)] hover:text-[var(--accent)] hover:bg-[#173038] border border-[rgba(21,38,43,0.12)] hover:border-[rgba(21,38,43,0.16)] px-3 py-1 transition-colors"
                            >
                              {m.status === 'Em andamento' ? 'Abrir →' : 'Ver Ata →'}
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); setMeetingToDelete(m); }}
                              className="font-mono text-xs text-[var(--ink-soft)] hover:text-red-600 transition-colors"
                              title="Excluir Reunião"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <NovaReuniaoModal
          clientId={effectiveClientId}
          onClose={() => setShowModal(false)}
          onCreated={handleCreated}
        />
      )}

      {/* Delete Confirmation Modal */}
      {meetingToDelete && (
        <ConfirmDeleteModal
          meeting={meetingToDelete}
          onClose={() => setMeetingToDelete(null)}
          onConfirm={handleDelete}
        />
      )}
    </Layout>
  );
}
