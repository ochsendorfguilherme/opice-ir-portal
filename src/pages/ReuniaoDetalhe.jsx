import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import { getStorage, setStorage, KEYS } from '../utils/storage';
import {
  StopCircle, Clock, Users, Plus, Save, Download, FileText,
  Check, X, ChevronLeft,
} from 'lucide-react';
import jsPDF from 'jspdf';

// ─── helpers ─────────────────────────────────────────────────────────────────

function pad(n) {
  return String(n).padStart(2, '0');
}

/** Elapsed seconds → HH:MM:SS */
function fmtElapsed(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

/** Elapsed seconds → MM:SS  (for item timestamps) */
function fmtItemTs(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${pad(m)}:${pad(s)}`;
}

/** ISO date → DD/MM/YYYY */
function fmtDate(dateStr) {
  if (!dateStr) return '—';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

/** Duration in minutes string */
function diffMinutes(startIso, endIso) {
  if (!startIso || !endIso) return '?';
  const diff = Math.round((new Date(endIso) - new Date(startIso)) / 60000);
  return `${diff} min`;
}

/** Detect category from text prefix */
function detectCategory(text) {
  const t = text.trimStart();
  if (t.startsWith('📌 DECISÃO')) return 'Decisão';
  if (t.startsWith('✅ TAREFA')) return 'Tarefa';
  if (t.startsWith('⚠ PENDÊNCIA')) return 'Pendência';
  if (t.startsWith('💬 OBSERVAÇÃO')) return 'Observação';
  return 'Observação';
}

function genItemId() {
  return `ITEM_${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

const CATEGORY_STYLES = {
  Decisão: 'bg-blue-100 text-blue-800 border-blue-200',
  Tarefa: 'bg-[#CAFF00] text-[#111111] border-[#b0e000]',
  Pendência: 'bg-amber-100 text-amber-800 border-amber-200',
  Observação: 'bg-[#E0E0E0] text-[#111111] border-[#ccc]',
};

const CATEGORY_EMOJI = {
  Decisão: '📌',
  Tarefa: '✅',
  Pendência: '⚠',
  Observação: '💬',
};

// ─── Toolbar button ──────────────────────────────────────────────────────────

function ToolbarBtn({ label, emoji, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1 font-mono text-xs uppercase px-3 py-1.5 border border-[#E0E0E0] text-[#111111] bg-white hover:bg-[#111111] hover:text-[#CAFF00] hover:border-[#111111] transition-colors"
    >
      <span>{emoji}</span>
      {label}
    </button>
  );
}

// ─── Category badge ──────────────────────────────────────────────────────────

function CategoryBadge({ cat }) {
  return (
    <span className={`font-mono text-xs px-1.5 py-0.5 border ${CATEGORY_STYLES[cat] || CATEGORY_STYLES['Observação']}`}>
      {CATEGORY_EMOJI[cat]} {cat}
    </span>
  );
}

// ─── ATA text builder ────────────────────────────────────────────────────────

function buildAta({ meeting, endTimeIso, observacoesFinais, proximaReuniao }) {
  const dur = diffMinutes(meeting.criadaEm, endTimeIso);
  const endHM = endTimeIso
    ? new Date(endTimeIso).toTimeString().slice(0, 5)
    : '??:??';

  const sep1 = '══════════════════════════════════════';
  const sep2 = '──────────────────────────────────────';

  const decisoes = (meeting.items || []).filter(i => i.categoria === 'Decisão');
  const tarefas = (meeting.items || []).filter(i => i.categoria === 'Tarefa');
  const pendencias = (meeting.items || []).filter(i => i.categoria === 'Pendência');
  const obs = (meeting.items || []).filter(i => i.categoria === 'Observação');

  const lines = [];
  lines.push('ATA DE REUNIÃO');
  lines.push(sep1);
  lines.push(`Cliente:      ${meeting.nomeCliente || '—'}`);
  lines.push(`Data:         ${fmtDate(meeting.data)}`);
  lines.push(`Horário:      ${meeting.horarioInicio} às ${endHM} (${dur})`);
  lines.push(`Participantes: ${(meeting.participantes || []).join(', ') || '—'}`);
  lines.push(`Pauta:        ${meeting.pauta || '—'}`);
  lines.push(sep1);
  lines.push('');

  if (decisoes.length > 0) {
    lines.push('DECISÕES:');
    decisoes.forEach((item, idx) => {
      lines.push(`${idx + 1}. [${item.timestamp}] ${item.texto}`);
    });
    lines.push('');
  }

  if (tarefas.length > 0) {
    lines.push('TAREFAS:');
    tarefas.forEach(item => {
      const resp = item.responsavel ? ` — Responsável: ${item.responsavel}` : '';
      lines.push(`[ ] [${item.timestamp}] ${item.texto}${resp}`);
    });
    lines.push('');
  }

  if (pendencias.length > 0) {
    lines.push('PENDÊNCIAS:');
    pendencias.forEach(item => {
      lines.push(`⚠ [${item.timestamp}] ${item.texto}`);
    });
    lines.push('');
  }

  if (obs.length > 0) {
    lines.push('OBSERVAÇÕES:');
    obs.forEach(item => {
      lines.push(`- [${item.timestamp}] ${item.texto}`);
    });
    lines.push('');
  }

  if (observacoesFinais && observacoesFinais.trim()) {
    lines.push('NOTAS FINAIS:');
    lines.push(observacoesFinais.trim());
    lines.push('');
  }

  if (proximaReuniao && (proximaReuniao.data || proximaReuniao.horario)) {
    const dataStr = proximaReuniao.data ? fmtDate(proximaReuniao.data) : '';
    const horaStr = proximaReuniao.horario ? proximaReuniao.horario : '';
    lines.push(`PRÓXIMA REUNIÃO: ${[dataStr, horaStr].filter(Boolean).join(' às ')}`);
  }

  lines.push(sep2);
  lines.push('Documento gerado automaticamente — OPICE BLUM');
  lines.push('TLP:AMBER+STRICT');

  return lines.join('\n');
}

// ─── Close Modal ─────────────────────────────────────────────────────────────

function CloseModal({ meeting, effectiveClientId, onClose, onFinalize }) {
  const [step, setStep] = useState(1); // 1 = summary, 2 = ata preview
  const [observacoesFinais, setObservacoesFinais] = useState('');
  const [proximaReuniao, setProximaReuniao] = useState({ data: '', horario: '' });
  const [endTimeIso] = useState(new Date().toISOString());
  const [ataText, setAtaText] = useState('');

  const endHM = new Date(endTimeIso).toTimeString().slice(0, 5);
  const dur = diffMinutes(meeting.criadaEm, endTimeIso);

  function handleGerarAta() {
    const text = buildAta({ meeting, endTimeIso, observacoesFinais, proximaReuniao });
    setAtaText(text);
    setStep(2);
  }

  function handleDownloadPDF() {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const margin = 15;
    const pageWidth = doc.internal.pageSize.getWidth() - margin * 2;
    const lineHeight = 5;

    doc.setFont('Courier', 'normal');
    doc.setFontSize(9);

    const lines = doc.splitTextToSize(ataText, pageWidth);
    let y = margin;

    lines.forEach(line => {
      if (y > 280) {
        doc.addPage();
        y = margin;
      }
      doc.text(line, margin, y);
      y += lineHeight;
    });

    const clientName = (meeting.nomeCliente || 'cliente').replace(/\s+/g, '_');
    const [yr, mo, dy] = meeting.data.split('-');
    const dateStr = `${dy}-${mo}-${yr}`;
    doc.save(`ATA_${clientName}_${dateStr}.pdf`);
  }

  function handleRegistrarPMO() {
    // Update PMO timeline + actions
    const pmoData = getStorage(KEYS.pmo(effectiveClientId), {});

    // Add timeline event matching TabTimeline fields
    const timeline = pmoData.timeline || [];
    timeline.push({
      id: `EVT_${Date.now()}`,
      datetime: endTimeIso.slice(0, 16), // format: YYYY-MM-DDTHH:mm
      fase: 'Análise', // Default phase for meetings
      evento: `[Reunião: ${meeting.titulo}] Duração: ${dur}. Participantes: ${(meeting.participantes || []).join(', ')}`,
      fonte: 'Portal IR',
      evidencia: `Ata ${meeting.id}`,
      meetingId: meeting.id,
    });

    // Add Tarefa items as actions
    const actions = pmoData.actions || [];
    const tarefas = (meeting.items || []).filter(i => i.categoria === 'Tarefa');
    tarefas.forEach(item => {
      actions.push({
        id: `ACT_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
        descricao: item.texto,
        responsavel: item.responsavel || '',
        area: 'TI', // Default area
        status: 'Aberto', // Status expected by TabMatriz
        prioridade: 'Alta', // Default priority
        origem: 'Reunião',
        meetingId: meeting.id,
        criadaEm: new Date().toISOString(),
      });
    });

    setStorage(KEYS.pmo(effectiveClientId), { ...pmoData, timeline, actions });

    // Mark meeting ataGerada = true, close
    onFinalize({
      endTimeIso,
      observacoesFinais,
      proximaReuniao,
      ataGerada: true,
    });
  }

  function handleFechar() {
    onFinalize({ endTimeIso, observacoesFinais, proximaReuniao, ataGerada: false });
  }

  const decisoes = (meeting.items || []).filter(i => i.categoria === 'Decisão');
  const tarefas = (meeting.items || []).filter(i => i.categoria === 'Tarefa');
  const pendencias = (meeting.items || []).filter(i => i.categoria === 'Pendência');
  const obsItems = (meeting.items || []).filter(i => i.categoria === 'Observação');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white w-full max-w-2xl mx-4 shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-[#111111] px-6 py-4 flex items-center justify-between">
          <h2 className="font-syne font-extrabold text-[#CAFF00] text-lg uppercase">
            {step === 1 ? 'Encerrar Reunião' : 'Ata de Reunião'}
          </h2>
          <button onClick={onClose} className="text-[#E0E0E0] hover:text-white">
            <X size={18} />
          </button>
        </div>

        {/* Step 1 — Summary */}
        {step === 1 && (
          <>
            <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
              {/* Time summary */}
              <div className="grid grid-cols-3 gap-3">
                <div className="border border-[#E0E0E0] p-3">
                  <div className="font-mono text-xs text-[#555555] uppercase mb-1">Início</div>
                  <div className="font-mono text-sm font-bold text-[#111111]">{meeting.horarioInicio}</div>
                </div>
                <div className="border border-[#E0E0E0] p-3">
                  <div className="font-mono text-xs text-[#555555] uppercase mb-1">Fim</div>
                  <div className="font-mono text-sm font-bold text-[#111111]">{endHM}</div>
                </div>
                <div className="border border-[#CAFF00] bg-[#CAFF00] p-3">
                  <div className="font-mono text-xs text-[#111111] uppercase mb-1">Duração</div>
                  <div className="font-mono text-sm font-bold text-[#111111]">{dur}</div>
                </div>
              </div>

              {/* Participants */}
              <div>
                <div className="font-mono text-xs uppercase text-[#555555] mb-2 flex items-center gap-2">
                  <Users size={12} /> Participantes ({(meeting.participantes || []).length})
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(meeting.participantes || []).map((p, i) => (
                    <span key={i} className="font-mono text-xs px-2 py-0.5 bg-[#E0E0E0] text-[#111111]">{p}</span>
                  ))}
                  {(meeting.participantes || []).length === 0 && (
                    <span className="font-dm text-xs text-[#999]">Nenhum participante registrado</span>
                  )}
                </div>
              </div>

              {/* Items by category */}
              {[
                { label: 'Decisões', items: decisoes, cat: 'Decisão' },
                { label: 'Tarefas', items: tarefas, cat: 'Tarefa' },
                { label: 'Pendências', items: pendencias, cat: 'Pendência' },
                { label: 'Observações', items: obsItems, cat: 'Observação' },
              ].map(({ label, items, cat }) =>
                items.length > 0 ? (
                  <div key={cat}>
                    <div className="font-mono text-xs uppercase text-[#555555] mb-2">
                      {CATEGORY_EMOJI[cat]} {label} ({items.length})
                    </div>
                    <div className="space-y-1.5">
                      {items.map(item => (
                        <div key={item.id} className="flex gap-2 items-start border border-[#E0E0E0] px-3 py-2">
                          <span className="font-mono text-xs text-[#999] mt-0.5 shrink-0">[{item.timestamp}]</span>
                          <span className="font-dm text-xs text-[#111111] flex-1">{item.texto}</span>
                          {item.responsavel && (
                            <span className="font-mono text-xs text-[#555555] shrink-0">— {item.responsavel}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null
              )}

              {/* Próxima reunião */}
              <div>
                <label className="block font-mono text-xs uppercase text-[#111111] mb-2">
                  Próxima Reunião (opcional)
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="date"
                    value={proximaReuniao.data}
                    onChange={e => setProximaReuniao(prev => ({ ...prev, data: e.target.value }))}
                    className="border border-[#E0E0E0] px-3 py-2 font-dm text-sm text-[#111111] outline-none focus:border-[#111111]"
                  />
                  <input
                    type="time"
                    value={proximaReuniao.horario}
                    onChange={e => setProximaReuniao(prev => ({ ...prev, horario: e.target.value }))}
                    className="border border-[#E0E0E0] px-3 py-2 font-dm text-sm text-[#111111] outline-none focus:border-[#111111]"
                  />
                </div>
              </div>

              {/* Observações finais */}
              <div>
                <label className="block font-mono text-xs uppercase text-[#111111] mb-2">
                  Observações Finais
                </label>
                <textarea
                  value={observacoesFinais}
                  onChange={e => setObservacoesFinais(e.target.value)}
                  rows={3}
                  placeholder="Adicione observações gerais sobre a reunião..."
                  className="w-full border border-[#E0E0E0] px-3 py-2 font-dm text-sm text-[#111111] outline-none focus:border-[#111111] resize-none"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-[#E0E0E0] flex justify-end gap-3">
              <button
                onClick={onClose}
                className="font-mono text-xs uppercase px-4 py-2 border border-[#E0E0E0] text-[#555555] hover:border-[#111111] hover:text-[#111111] transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleGerarAta}
                className="font-mono text-xs uppercase px-5 py-2 bg-[#111111] text-[#CAFF00] hover:bg-[#333] transition-colors"
              >
                Gerar Ata →
              </button>
            </div>
          </>
        )}

        {/* Step 2 — ATA Preview */}
        {step === 2 && (
          <>
            <div className="overflow-y-auto flex-1 px-6 py-5">
              <div className="flex items-center gap-2 mb-3">
                <FileText size={14} className="text-[#555555]" />
                <span className="font-mono text-xs text-[#555555] uppercase">Preview da Ata</span>
              </div>
              <pre className="bg-[#111111] text-[#CAFF00] font-mono text-xs p-5 whitespace-pre-wrap leading-relaxed overflow-x-auto">
                {ataText}
              </pre>
            </div>

            <div className="px-6 py-4 border-t border-[#E0E0E0] flex flex-wrap gap-3 justify-between items-center">
              <button
                onClick={() => setStep(1)}
                className="font-mono text-xs uppercase px-4 py-2 border border-[#E0E0E0] text-[#555555] hover:border-[#111111] hover:text-[#111111] transition-colors flex items-center gap-1.5"
              >
                <ChevronLeft size={12} /> Voltar
              </button>
              <div className="flex gap-3 flex-wrap">
                <button
                  onClick={handleDownloadPDF}
                  className="flex items-center gap-1.5 font-mono text-xs uppercase px-4 py-2 border border-[#111111] text-[#111111] hover:bg-[#111111] hover:text-[#CAFF00] transition-colors"
                >
                  <Download size={13} /> Download PDF
                </button>
                <button
                  onClick={handleRegistrarPMO}
                  className="flex items-center gap-1.5 font-mono text-xs uppercase px-4 py-2 bg-[#111111] text-[#CAFF00] hover:bg-[#333] transition-colors"
                >
                  <Check size={13} /> Registrar no PMO
                </button>
                <button
                  onClick={handleFechar}
                  className="flex items-center gap-1.5 font-mono text-xs uppercase px-4 py-2 border border-[#E0E0E0] text-[#555555] hover:border-[#111111] hover:text-[#111111] transition-colors"
                >
                  <X size={13} /> Fechar
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ReuniaoDetalhe({ clientId: propClientId, meetingId: propMeetingId, isAdmin = false, adminClientName, onAdminBack }) {
  const { user } = useAuth();
  const params = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  // Get IDs from props, URL params, or navigation state
  const effectiveClientId = propClientId || location.state?.clientId || user?.clientId;
  const effectiveMeetingId = propMeetingId || params.meetingId;

  const [meeting, setMeeting] = useState(null);
  const [notFound, setNotFound] = useState(false);

  // Live timer
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Notepad
  const textareaRef = useRef(null);
  const [notepadText, setNotepadText] = useState('');

  // Quick task
  const [quickName, setQuickName] = useState('');
  const [quickDesc, setQuickDesc] = useState('');
  const [quickSaved, setQuickSaved] = useState(false);

  // Close modal
  const [showCloseModal, setShowCloseModal] = useState(false);

  // Highlighted item
  const [highlightedItemId, setHighlightedItemId] = useState(null);

  // ── Load meeting ────────────────────────────────────────────────────────────
  useEffect(() => {
    // Priority 1: meeting passed via navigation state (most reliable)
    if (location.state?.meeting && location.state.meeting.id === effectiveMeetingId) {
      setMeeting(location.state.meeting);
      return;
    }

    // Priority 2: look up from localStorage
    if (effectiveMeetingId) {
      // Try with effectiveClientId, or scan all meeting keys
      const cid = effectiveClientId || 'default';
      const meetings = getStorage(KEYS.meetings(cid), []);
      const found = meetings.find(m => m.id === effectiveMeetingId);
      if (found) {
        setMeeting(found);
        return;
      }

      // Priority 3: scan ALL localStorage keys for meetings containing this ID
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('opice_ir_meetings_')) {
          try {
            const stored = JSON.parse(localStorage.getItem(key));
            if (Array.isArray(stored)) {
              const match = stored.find(m => m.id === effectiveMeetingId);
              if (match) {
                setMeeting(match);
                return;
              }
            }
          } catch { /* skip */ }
        }
      }
    }

    // Nothing found
    setNotFound(true);
  }, [effectiveMeetingId]);

  // ── Live timer ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!meeting) return;
    const startMs = new Date(meeting.criadaEm).getTime();

    function tick() {
      const diff = Math.floor((Date.now() - startMs) / 1000);
      setElapsedSeconds(diff < 0 ? 0 : diff);
    }

    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [meeting]);

  // ── Resolve storage clientId (find the correct localStorage key) ───────────
  const resolvedClientId = (() => {
    if (effectiveClientId) return effectiveClientId;
    // Scan localStorage for any meetings key containing this meeting
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('opice_ir_meetings_')) {
        try {
          const data = JSON.parse(localStorage.getItem(key));
          if (Array.isArray(data) && data.find(m => m.id === effectiveMeetingId)) {
            return key.replace('opice_ir_meetings_', '');
          }
        } catch { /* skip */ }
      }
    }
    return 'default';
  })();

  // ── Auto-save every 10 seconds ──────────────────────────────────────────────
  const saveMeeting = useCallback((updated) => {
    const meetings = getStorage(KEYS.meetings(resolvedClientId), []);
    const idx = meetings.findIndex(m => m.id === effectiveMeetingId);
    if (idx !== -1) {
      meetings[idx] = updated;
      setStorage(KEYS.meetings(resolvedClientId), meetings);
    }
  }, [resolvedClientId, effectiveMeetingId]);

  useEffect(() => {
    if (!meeting) return;
    const iv = setInterval(() => {
      saveMeeting({ ...meeting, notasLivres: notepadText });
    }, 10000);
    return () => clearInterval(iv);
  }, [meeting, notepadText, saveMeeting]);

  // ── Insert prefix at cursor ─────────────────────────────────────────────────
  function insertPrefix(prefix) {
    const ta = textareaRef.current;
    if (!ta) return;

    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const before = notepadText.slice(0, start);
    const after = notepadText.slice(end);

    // Prepend on a new line if not at start
    const newlinePrefix = before.length > 0 && !before.endsWith('\n') ? '\n' : '';
    const inserted = `${newlinePrefix}${prefix}`;
    const newText = before + inserted + after;

    setNotepadText(newText);

    requestAnimationFrame(() => {
      ta.focus();
      const newCursor = start + inserted.length;
      ta.setSelectionRange(newCursor, newCursor);
    });
  }

  // ── Add Item ─────────────────────────────────────────────────────────────────
  function handleAddItem() {
    const text = notepadText.trim();
    if (!text || !meeting) return;

    const categoria = detectCategory(text);
    const newItem = {
      id: genItemId(),
      timestamp: fmtItemTs(elapsedSeconds),
      categoria,
      texto: text,
      responsavel: null,
    };

    const updated = {
      ...meeting,
      items: [...(meeting.items || []), newItem],
      notasLivres: '',
    };

    setMeeting(updated);
    saveMeeting(updated);
    setNotepadText('');
    setHighlightedItemId(newItem.id);
    setTimeout(() => setHighlightedItemId(null), 2500);
  }

  // ── Quick Task ───────────────────────────────────────────────────────────────
  function handleQuickTask() {
    if (!quickDesc.trim() || !meeting) return;


    const newItem = {
      id: genItemId(),
      timestamp: fmtItemTs(elapsedSeconds),
      categoria: 'Tarefa',
      texto: quickDesc.trim(),
      responsavel: quickName.trim() || null,
    };

    const updated = {
      ...meeting,
      items: [...(meeting.items || []), newItem],
    };

    setMeeting(updated);
    saveMeeting(updated);
    setQuickName('');
    setQuickDesc('');
    setQuickSaved(true);
    setTimeout(() => setQuickSaved(false), 2000);
  }

  // ── Finalize (close modal confirmed) ────────────────────────────────────────
  function handleFinalize({ endTimeIso, observacoesFinais, proximaReuniao, ataGerada }) {
    if (!meeting) return;

    const endHM = new Date(endTimeIso).toTimeString().slice(0, 5);

    const updated = {
      ...meeting,
      status: 'Encerrada',
      horarioFim: endHM,
      observacoesFinais,
      proximaReuniao,
      ataGerada,
      notasLivres: notepadText,
    };

    setMeeting(updated);
    saveMeeting(updated);
    setShowCloseModal(false);
    navigate('/reunioes');
  }

  // ─────────────────────────────────────────────────────────────────────────────

  if (notFound) {
    return (
      <Layout clientId={propClientId} isAdmin={isAdmin} adminClientName={adminClientName} onAdminBack={onAdminBack}>
        <div className="p-10 text-center">
          <p className="font-dm text-[#555555]">Reunião não encontrada.</p>
          <button onClick={() => navigate('/reunioes')} className="mt-4 font-mono text-xs uppercase px-4 py-2 border border-[#E0E0E0] hover:border-[#111111] transition-colors">
            ← Voltar
          </button>
        </div>
      </Layout>
    );
  }

  if (!meeting) {
    return (
      <Layout clientId={propClientId} isAdmin={isAdmin} adminClientName={adminClientName} onAdminBack={onAdminBack}>
        <div className="p-10 text-center font-mono text-xs text-[#555555]">Carregando...</div>
      </Layout>
    );
  }

  const sortedItems = [...(meeting.items || [])].sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  return (
    <Layout clientId={propClientId} isAdmin={isAdmin} adminClientName={adminClientName} onAdminBack={onAdminBack}>
      {/* Back nav */}
      <div className="px-6 md:px-10 pt-6">
        <button
          onClick={() => navigate('/reunioes')}
          className="flex items-center gap-1.5 font-mono text-xs uppercase text-[#555555] hover:text-[#111111] transition-colors"
        >
          <ChevronLeft size={14} /> Reuniões
        </button>
      </div>

      {/* Two-column layout */}
      <div className="flex flex-col lg:flex-row gap-0 p-6 md:p-10 pt-4">

        {/* ─── LEFT COLUMN (35%) ─────────────────────────────────────────────── */}
        <div className="lg:w-[35%] lg:pr-6 flex flex-col gap-4 mb-6 lg:mb-0">

          {/* Control panel card */}
          <div className="bg-[#111111] p-5 flex flex-col gap-4">
            {/* Title */}
            <div>
              <span className="font-mono text-xs text-[#CAFF00]/70 uppercase">{meeting.id}</span>
              <h2 className="font-syne font-extrabold text-white text-xl uppercase leading-tight mt-0.5">
                {meeting.titulo}
              </h2>
              {meeting.nomeCliente && (
                <p className="font-dm text-sm text-[#E0E0E0] mt-0.5">{meeting.nomeCliente}</p>
              )}
            </div>

            {/* Live timer */}
            <div className="border border-[#CAFF00]/30 px-4 py-3">
              <div className="flex items-center gap-2 mb-1">
                <Clock size={12} className="text-[#CAFF00]/70" />
                <span className="font-mono text-xs text-[#CAFF00]/70 uppercase">Duração</span>
              </div>
              <div className="font-mono text-3xl font-bold text-[#CAFF00] tracking-widest">
                {fmtElapsed(elapsedSeconds)}
              </div>
            </div>

            {/* Status */}
            {meeting.status === 'Em andamento' ? (
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-red-500 animate-pulse inline-block" />
                <span className="font-mono text-xs text-red-400 uppercase animate-pulse">Em andamento</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 inline-block" />
                <span className="font-mono text-xs text-green-400 uppercase">Encerrada</span>
              </div>
            )}

            {/* Participants */}
            {(meeting.participantes || []).length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <Users size={11} className="text-[#CAFF00]/70" />
                  <span className="font-mono text-xs text-[#CAFF00]/70 uppercase">Participantes</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {meeting.participantes.map((p, i) => (
                    <span
                      key={i}
                      className="font-mono text-xs px-2 py-0.5 bg-white/10 text-[#E0E0E0] border border-white/20"
                      title={p}
                    >
                      {p.trim().charAt(0).toUpperCase()} · {p}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Pauta */}
            {meeting.pauta && (
              <div>
                <div className="font-mono text-xs text-[#CAFF00]/70 uppercase mb-1">Pauta</div>
                <p className="font-dm text-xs text-[#E0E0E0] leading-relaxed">{meeting.pauta}</p>
              </div>
            )}

            {/* Encerrar button */}
            {meeting.status === 'Em andamento' && (
              <button
                onClick={() => setShowCloseModal(true)}
                className="flex items-center justify-center gap-2 font-mono text-xs uppercase px-4 py-2.5 bg-white text-[#111111] border border-white hover:bg-[#E0E0E0] transition-colors mt-2"
              >
                <StopCircle size={14} /> Encerrar Reunião
              </button>
            )}
          </div>

          {/* Items registered */}
          <div className="border border-[#E0E0E0] bg-white flex flex-col">
            <div className="px-4 py-3 border-b border-[#E0E0E0] flex items-center justify-between">
              <span className="font-mono text-xs uppercase text-[#111111]">Itens Registrados</span>
              <span className="font-mono text-xs text-[#555555]">{sortedItems.length}</span>
            </div>
            <div className="divide-y divide-[#E0E0E0] max-h-[360px] overflow-y-auto">
              {sortedItems.length === 0 ? (
                <div className="px-4 py-6 text-center font-dm text-xs text-[#999]">
                  Nenhum item registrado ainda
                </div>
              ) : (
                sortedItems.map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setHighlightedItemId(item.id);
                      setTimeout(() => setHighlightedItemId(null), 2500);
                    }}
                    className={`w-full text-left px-4 py-3 flex items-start gap-2 hover:bg-[#f5f5f5] transition-colors ${highlightedItemId === item.id ? 'bg-[#CAFF00]/20' : ''
                      }`}
                  >
                    <CategoryBadge cat={item.categoria} />
                    <span className="font-mono text-xs text-[#555555] shrink-0">{item.timestamp}</span>
                    <span className="font-dm text-xs text-[#111111] flex-1 line-clamp-2">{item.texto}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* ─── RIGHT COLUMN (65%) ────────────────────────────────────────────── */}
        <div className="lg:w-[65%] flex flex-col gap-4">
          <div className="border border-[#E0E0E0] bg-white flex flex-col">
            {/* Header */}
            <div className="px-5 py-3 border-b border-[#E0E0E0]">
              <h3 className="font-syne font-extrabold text-[#111111] text-sm uppercase">Bloco de Notas</h3>
              <p className="font-dm text-xs text-[#555555] mt-0.5">Auto-salvo a cada 10 segundos</p>
            </div>

            {/* Toolbar */}
            <div className="px-5 py-3 border-b border-[#E0E0E0] flex flex-wrap gap-2">
              <ToolbarBtn emoji="📌" label="Decisão" onClick={() => insertPrefix('📌 DECISÃO: ')} />
              <ToolbarBtn emoji="✅" label="Tarefa" onClick={() => insertPrefix('✅ TAREFA: ')} />
              <ToolbarBtn emoji="⚠" label="Pendência" onClick={() => insertPrefix('⚠ PENDÊNCIA: ')} />
              <ToolbarBtn emoji="💬" label="Observação" onClick={() => insertPrefix('💬 OBSERVAÇÃO: ')} />
            </div>

            {/* Textarea */}
            <div className="px-5 py-4 flex-1">
              <textarea
                ref={textareaRef}
                value={notepadText}
                onChange={e => setNotepadText(e.target.value)}
                placeholder="Digite livremente... Use os botões acima para categorizar cada item."
                className="w-full min-h-[400px] font-dm text-sm text-[#111111] bg-transparent outline-none resize-y leading-relaxed placeholder:text-[#bbb]"
              />
            </div>

            {/* Add Item button */}
            <div className="px-5 py-3 border-t border-[#E0E0E0]">
              <button
                onClick={handleAddItem}
                disabled={!notepadText.trim()}
                className="flex items-center gap-2 font-mono text-xs uppercase px-5 py-2.5 bg-[#111111] text-[#CAFF00] hover:bg-[#333] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <Plus size={13} /> Adicionar Item
              </button>
            </div>
          </div>

          {/* Quick Task */}
          <div className="border border-[#E0E0E0] bg-white px-5 py-4">
            <div className="font-mono text-xs uppercase text-[#111111] mb-3 flex items-center gap-2">
              ✅ Registrar Tarefa Rápida
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={quickName}
                onChange={e => setQuickName(e.target.value)}
                placeholder="Ação para: (nome)"
                className="border border-[#E0E0E0] px-3 py-2 font-dm text-sm text-[#111111] outline-none focus:border-[#111111] sm:w-40 transition-colors"
              />
              <input
                type="text"
                value={quickDesc}
                onChange={e => setQuickDesc(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleQuickTask(); }}
                placeholder="Descrição da tarefa..."
                className="flex-1 border border-[#E0E0E0] px-3 py-2 font-dm text-sm text-[#111111] outline-none focus:border-[#111111] transition-colors"
              />
              <button
                onClick={handleQuickTask}
                disabled={!quickDesc.trim()}
                className="flex items-center gap-1.5 font-mono text-xs uppercase px-4 py-2 bg-[#111111] text-[#CAFF00] hover:bg-[#333] disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
              >
                {quickSaved ? <Check size={13} /> : <Plus size={13} />}
                {quickSaved ? 'Salvo!' : 'Registrar Tarefa'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Close Modal */}
      {showCloseModal && (
        <CloseModal
          meeting={{ ...meeting, notasLivres: notepadText }}
          effectiveClientId={resolvedClientId}

          onClose={() => setShowCloseModal(false)}
          onFinalize={handleFinalize}
        />
      )}
    </Layout>
  );
}
