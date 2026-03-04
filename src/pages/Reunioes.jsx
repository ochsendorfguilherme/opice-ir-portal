import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import { getStorage, setStorage, KEYS } from '../utils/storage';
import { BookOpen, Plus, X } from 'lucide-react';

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
  const num = (meetings.length + 1).toString().padStart(3, '0');
  return `MTG${num}`;
}

function getInitial(name) {
  return (name || '').trim().charAt(0).toUpperCase();
}

// ─── Participant chip in the "add" modal ─────────────────────────────────────

function ParticipantChip({ name, onRemove }) {
  return (
    <span className="inline-flex items-center gap-1 bg-[#111111] text-[#CAFF00] font-mono text-xs px-2 py-1">
      {name}
      <button
        type="button"
        onClick={onRemove}
        className="hover:text-white transition-colors"
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
    <span className="inline-flex items-center justify-center w-6 h-6 bg-[#E0E0E0] text-[#111111] font-mono text-xs font-bold uppercase">
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
    };

    setStorage(KEYS.meetings(clientId), [newMeeting, ...existing]);
    onCreated(newMeeting.id);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white w-full max-w-lg mx-4 shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-[#111111] px-6 py-4 flex items-center justify-between">
          <h2 className="font-syne font-extrabold text-[#CAFF00] text-lg uppercase">
            Nova Reunião
          </h2>
          <button onClick={onClose} className="text-[#E0E0E0] hover:text-white">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
          {/* Título */}
          <div>
            <label className="block font-mono text-xs uppercase font-medium text-[#111111] mb-1">
              Título <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.titulo}
              onChange={e => handleChange('titulo', e.target.value)}
              placeholder="Ex.: Reunião de Status — Dia 1"
              className={`w-full border px-3 py-2 font-dm text-sm text-[#111111] bg-white outline-none focus:border-[#111111] transition-colors ${errors.titulo ? 'border-red-500' : 'border-[#E0E0E0]'}`}
            />
            {errors.titulo && <p className="font-mono text-xs text-red-500 mt-1">{errors.titulo}</p>}
          </div>

          {/* Data + Horário */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-mono text-xs uppercase font-medium text-[#111111] mb-1">
                Data <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={form.data}
                onChange={e => handleChange('data', e.target.value)}
                className={`w-full border px-3 py-2 font-dm text-sm text-[#111111] bg-white outline-none focus:border-[#111111] transition-colors ${errors.data ? 'border-red-500' : 'border-[#E0E0E0]'}`}
              />
            </div>
            <div>
              <label className="block font-mono text-xs uppercase font-medium text-[#111111] mb-1">
                Horário de Início <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                value={form.horarioInicio}
                onChange={e => handleChange('horarioInicio', e.target.value)}
                className={`w-full border px-3 py-2 font-dm text-sm text-[#111111] bg-white outline-none focus:border-[#111111] transition-colors ${errors.horarioInicio ? 'border-red-500' : 'border-[#E0E0E0]'}`}
              />
            </div>
          </div>

          {/* Nome do Cliente */}
          <div>
            <label className="block font-mono text-xs uppercase font-medium text-[#111111] mb-1">
              Nome do Cliente
            </label>
            <input
              type="text"
              value={form.nomeCliente}
              onChange={e => handleChange('nomeCliente', e.target.value)}
              className="w-full border border-[#E0E0E0] px-3 py-2 font-dm text-sm text-[#111111] bg-white outline-none focus:border-[#111111] transition-colors"
            />
          </div>

          {/* Participantes */}
          <div>
            <label className="block font-mono text-xs uppercase font-medium text-[#111111] mb-1">
              Participantes
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={participantInput}
                onChange={e => setParticipantInput(e.target.value)}
                onKeyDown={handleParticipantKeyDown}
                placeholder="Nome do participante"
                className="flex-1 border border-[#E0E0E0] px-3 py-2 font-dm text-sm text-[#111111] bg-white outline-none focus:border-[#111111] transition-colors"
              />
              <button
                type="button"
                onClick={addParticipant}
                className="bg-[#111111] text-white font-mono text-xs px-3 py-2 hover:bg-[#333] transition-colors"
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
            <label className="block font-mono text-xs uppercase font-medium text-[#111111] mb-1">
              Pauta / Objetivo
            </label>
            <textarea
              value={form.pauta}
              onChange={e => handleChange('pauta', e.target.value)}
              rows={3}
              placeholder="Descreva o objetivo desta reunião..."
              className="w-full border border-[#E0E0E0] px-3 py-2 font-dm text-sm text-[#111111] bg-white outline-none focus:border-[#111111] transition-colors resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#E0E0E0] flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="font-mono text-xs uppercase px-4 py-2 border border-[#E0E0E0] text-[#555555] hover:border-[#111111] hover:text-[#111111] transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="font-mono text-xs uppercase px-5 py-2 bg-[#111111] text-[#CAFF00] hover:bg-[#333] transition-colors"
          >
            Iniciar Reunião →
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Meeting Card ─────────────────────────────────────────────────────────────

function MeetingCard({ meeting, onOpen }) {
  const maxChips = 5;
  const shownParticipants = meeting.participantes.slice(0, maxChips);
  const overflow = meeting.participantes.length - maxChips;

  return (
    <div className="border border-[#E0E0E0] bg-white hover:border-[#111111] transition-colors flex flex-col">
      {/* Top accent */}
      <div className={`h-0.5 w-full ${meeting.status === 'Em andamento' ? 'bg-red-500' : 'bg-green-500'}`} />

      <div className="p-5 flex flex-col gap-3 flex-1">
        {/* ID + Status */}
        <div className="flex items-center justify-between">
          <span className="font-mono text-xs text-[#555555]">{meeting.id}</span>
          <StatusBadge status={meeting.status} />
        </div>

        {/* Title */}
        <h3 className="font-syne font-extrabold text-[#111111] text-base uppercase leading-tight">
          {meeting.titulo}
        </h3>

        {/* Date / Time */}
        <div className="font-mono text-xs text-[#555555]">
          {fmtDate(meeting.data)} &nbsp;·&nbsp; {meeting.horarioInicio}
          {meeting.horarioFim ? ` às ${meeting.horarioFim}` : ''}
        </div>

        {/* Client name */}
        {meeting.nomeCliente && (
          <div className="font-dm text-xs text-[#555555] truncate">{meeting.nomeCliente}</div>
        )}

        {/* Participant initials */}
        {meeting.participantes.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap">
            {shownParticipants.map((p, i) => (
              <InitialChip key={i} initial={getInitial(p)} />
            ))}
            {overflow > 0 && (
              <span className="font-mono text-xs text-[#555555]">+{overflow}</span>
            )}
            <span className="font-mono text-xs text-[#555555] ml-1">
              {meeting.participantes.length} participante{meeting.participantes.length !== 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 pb-4">
        <button
          onClick={onOpen}
          className="w-full font-mono text-xs uppercase py-2 border border-[#111111] text-[#111111] hover:bg-[#111111] hover:text-[#CAFF00] transition-colors"
        >
          Abrir →
        </button>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Reunioes({ clientId: propClientId, isAdmin = false, adminClientName, onAdminBack }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const effectiveClientId = propClientId || user?.clientId;

  const [meetings, setMeetings] = useState([]);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (!effectiveClientId) return;
    const stored = getStorage(KEYS.meetings(effectiveClientId), []);
    setMeetings(stored);
  }, [effectiveClientId]);

  function handleCreated(meetingId) {
    setShowModal(false);
    navigate(`/reunioes/${meetingId}`);
  }

  function openMeeting(id) {
    navigate(`/reunioes/${id}`);
  }

  return (
    <Layout
      clientId={propClientId}
      isAdmin={isAdmin}
      adminClientName={adminClientName}
      onAdminBack={onAdminBack}
    >
      <div className="p-6 md:p-10">
        {/* Page header */}
        <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
          <div>
            <h1 className="font-syne font-extrabold text-[#111111] text-4xl uppercase">
              Registro de Reuniões
            </h1>
            <p className="text-[#555555] font-dm text-sm mt-1">
              Capture decisões, tarefas e pendências em tempo real
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-[#111111] text-white font-mono text-xs uppercase px-5 py-3 hover:bg-[#CAFF00] hover:text-[#111111] transition-colors"
          >
            <Plus size={14} />
            Nova Reunião
          </button>
        </div>

        {/* Content */}
        {meetings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 border border-dashed border-[#E0E0E0]">
            <BookOpen size={40} className="text-[#E0E0E0]" />
            <p className="font-dm text-[#555555] text-sm">Nenhuma reunião registrada</p>
            <button
              onClick={() => setShowModal(true)}
              className="font-mono text-xs uppercase px-4 py-2 border border-[#E0E0E0] text-[#555555] hover:border-[#111111] hover:text-[#111111] transition-colors mt-2"
            >
              + Nova Reunião
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {meetings.map(m => (
              <MeetingCard
                key={m.id}
                meeting={m}
                onOpen={() => openMeeting(m.id)}
              />
            ))}
          </div>
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
    </Layout>
  );
}
