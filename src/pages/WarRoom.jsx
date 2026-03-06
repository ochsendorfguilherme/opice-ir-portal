import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import { CrisisHistory } from '../components/CrisisHistory';
import { getStorage, setStorage, KEYS, generateId, generateHash, addNotification } from '../utils/storage';
import { calcSLAHours, formatSLALabel } from '../hooks/useSLA';
import { toSafeHttpsUrl } from '../utils/authSecurity';
import {
  AlertOctagon,
  ArrowUpRight,
  CalendarClock,
  Check,
  CheckCircle2,
  Clock3,
  Copy,
  Link2,
  MessageSquareText,
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShieldOff,
  Siren,
  Users,
  X,
} from 'lucide-react';

const CRI_MEMBERS = [
  { id: 'dpo', role: 'DPO', name: 'Delegado de Proteção de Dados' },
  { id: 'juridico', role: 'Jurídico', name: 'Equipe Jurídica' },
  { id: 'cto', role: 'CTO', name: 'Chief Technology Officer' },
  { id: 'rh', role: 'RH', name: 'Recursos Humanos' },
  { id: 'comms', role: 'Comunicação', name: 'Assessoria de Imprensa' },
];

const IMMEDIATE_ACTIONS = [
  { id: 'A001', label: 'Isolar sistemas comprometidos', stream: 'technical' },
  { id: 'A002', label: 'Revogar credenciais suspeitas', stream: 'technical' },
  { id: 'A003', label: 'Notificar ANPD (3 dias úteis)', stream: 'regulatory' },
  { id: 'A004', label: 'Preparar briefing para diretoria', stream: 'executive' },
  { id: 'A005', label: 'Avaliar nota à imprensa', stream: 'executive' },
  { id: 'A006', label: 'Contactar partes afetadas', stream: 'regulatory' },
  { id: 'A007', label: 'Preservar evidências forenses', stream: 'technical' },
];

const CLOSE_CHECKLIST = [
  'Ameaça contida e ambiente estabilizado',
  'Comunicação à ANPD registrada ou dispensada',
  'Comunicação aos titulares endereçada',
  'Evidências preservadas e documentadas',
  'Lições aprendidas agendadas',
];

const QUICK_FEED_TEMPLATES = [
  'Atualização técnica registrada.',
  'Escalonamento jurídico solicitado.',
  'Comunicação executiva enviada.',
  'Evidências preservadas e validadas.',
  'Próximo checkpoint alinhado.',
];

const FOCUS_OPTIONS = [
  { id: 'containment', label: 'Contenção imediata', helper: 'Conter e reduzir impacto.' },
  { id: 'regulatory', label: 'Frente regulatória', helper: 'Organizar comunicações e prazos.' },
  { id: 'executive', label: 'Coordenação executiva', helper: 'Diretoria, decisões e narrativa.' },
  { id: 'recovery', label: 'Recuperação e retorno', helper: 'Restabelecer operação e transição.' },
];

function formatDateTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('pt-BR');
}

function formatDateTimeInput(date = new Date()) {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function getFocusMeta(id) {
  return FOCUS_OPTIONS.find((item) => item.id === id) || FOCUS_OPTIONS[0];
}

function useCrisisTimer(timestamp) {
  const [elapsed, setElapsed] = useState('0h 0m');
  useEffect(() => {
    if (!timestamp) return undefined;
    const update = () => setElapsed(formatSLALabel(calcSLAHours(timestamp)));
    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [timestamp]);
  return elapsed;
}

function CopyButton({ text, label = 'Copiar' }) {
  const [copied, setCopied] = useState(false);
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(text || '');
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };
  return (
    <button type="button" onClick={onCopy} className="inline-flex items-center gap-2 rounded-full border border-[rgba(21,38,43,0.12)] bg-white/82 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--ink-soft)] transition-colors hover:border-[rgba(214,255,99,0.35)] hover:text-[var(--ink)]">
      {copied ? <Check size={12} className="text-green-600" /> : <Copy size={12} />}
      {copied ? 'Copiado' : label}
    </button>
  );
}

function MetricCard({ label, value, helper, tone = 'default' }) {
  const toneClass = {
    default: 'border-[rgba(255,255,255,0.12)] bg-white/6 text-white',
    accent: 'border-[rgba(214,255,99,0.24)] bg-[rgba(214,255,99,0.12)] text-white',
  }[tone];
  return (
    <div className={`rounded-[24px] border p-4 ${toneClass}`}>
      <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--ink-soft)]">{label}</div>
      <div className="mt-3 font-syne text-4xl font-bold leading-none">{value}</div>
      <p className="mt-3 text-sm leading-6 text-inherit/80">{helper}</p>
    </div>
  );
}

function WorkstreamCard({ label, description, done, total, percent }) {
  const tone = percent === 100 ? 'border-emerald-300/20 bg-[linear-gradient(135deg,rgba(31,84,70,0.88),rgba(22,58,49,0.96))] text-white shadow-[0_18px_30px_rgba(21,38,43,0.12)]' : percent >= 50 ? 'border-amber-300/20 bg-[linear-gradient(135deg,rgba(98,72,24,0.84),rgba(61,45,18,0.94))] text-white shadow-[0_18px_30px_rgba(21,38,43,0.12)]' : 'border-white/10 bg-[linear-gradient(135deg,rgba(24,42,48,0.92),rgba(16,29,34,0.98))] text-white shadow-[0_18px_30px_rgba(21,38,43,0.12)]';
  return (
    <div className={`rounded-[24px] border p-4 ${tone}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-syne text-lg font-bold">{label}</div>
          <p className="mt-2 text-sm leading-6 text-inherit/80">{description}</p>
        </div>
        <span className="rounded-full border border-current/15 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.2em]">{done}/{total}</span>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-black/12">
        <div className="h-full rounded-full bg-current transition-all" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function DeclarationModal({ onClose, onConfirm, clientId, info }) {
  const [step, setStep] = useState(1);
  const [membersState, setMembersState] = useState(CRI_MEMBERS.map((member) => ({ ...member, state: 'pending' })));
  const [progress, setProgress] = useState(0);
  const [commandFocus, setCommandFocus] = useState(FOCUS_OPTIONS[0].id);
  const [nextBriefingAt, setNextBriefingAt] = useState('');
  const [result, setResult] = useState(null);
  const slaHours = info?.dataConhecimento ? calcSLAHours(info.dataConhecimento) : 0;

  const runActivation = () => {
    setStep(2);
    let index = 0;
    const next = () => {
      if (index >= CRI_MEMBERS.length) {
        const hash = generateHash();
        const crisisId = `CRISIS-${clientId}-${generateId('').slice(0, 6)}`;
        const teamsLink = `https://teams.microsoft.com/l/meetup-join/crisis-${hash.slice(0, 8)}`;
        setResult({ hash, crisisId, teamsLink, commandFocus, nextBriefingAt: nextBriefingAt || formatDateTimeInput(new Date(Date.now() + 60 * 60 * 1000)) });
        setStep(3);
        return;
      }
      setMembersState((prev) => prev.map((member, memberIndex) => (memberIndex === index ? { ...member, state: 'sending' } : member)));
      setTimeout(() => {
        setMembersState((prev) => prev.map((member, memberIndex) => (memberIndex === index ? { ...member, state: 'done' } : member)));
        index += 1;
        setProgress(Math.round((index / CRI_MEMBERS.length) * 100));
        setTimeout(next, 280);
      }, 320);
    };
    setTimeout(next, 200);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto p-4 py-6">
      <div className="absolute inset-0 bg-[#15262b]/42 backdrop-blur-md" />
      <div className="relative mx-auto my-0 w-full max-w-3xl">
        {step === 1 && (
          <div className="rounded-[32px] border border-red-200 bg-[linear-gradient(135deg,rgba(255,248,246,0.98),rgba(255,236,231,0.96))] p-6 shadow-[0_28px_80px_rgba(172,55,48,0.16)] md:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="font-mono text-[11px] uppercase tracking-[0.28em] text-red-600">War Room</div>
                <h2 className="mt-3 font-syne text-3xl font-extrabold uppercase text-red-950">Declarar estado de crise</h2>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-red-800/85">A ativação cria uma sala de comando com trilha de auditoria, feed operacional e ações imediatas para o comitê.</p>
              </div>
              <button type="button" onClick={onClose} className="rounded-full border border-red-200 bg-white/82 p-3 text-red-700 transition-colors hover:bg-white"><X size={18} /></button>
            </div>
            <div className="mt-8 grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(300px,0.9fr)]">
              <div className="space-y-4">
                <div className="rounded-[26px] border border-red-100 bg-white/76 p-5">
                  <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-red-500">Cliente em foco</div>
                  <div className="mt-3 font-syne text-2xl font-bold text-red-950">{info?.nomeCliente || clientId}</div>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <div className="rounded-[20px] border border-red-100 bg-red-50/60 p-4"><div className="font-mono text-[10px] uppercase tracking-[0.22em] text-red-500">Tempo corrido</div><div className="mt-2 font-syne text-3xl font-bold text-red-950">{formatSLALabel(slaHours)}</div></div>
                    <div className="rounded-[20px] border border-red-100 bg-red-50/60 p-4"><div className="font-mono text-[10px] uppercase tracking-[0.22em] text-red-500">Agente</div><div className="mt-2 font-syne text-lg font-bold text-red-950">{info?.posicaoAgente || '—'}</div></div>
                  </div>
                </div>
                <div className="rounded-[26px] border border-red-100 bg-white/76 p-5">
                  <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-red-500">Foco inicial da sala</div>
                  <div className="mt-4 grid gap-3">
                    {FOCUS_OPTIONS.map((option) => (
                      <button key={option.id} type="button" onClick={() => setCommandFocus(option.id)} className={`rounded-[22px] border px-4 py-4 text-left transition-all ${commandFocus === option.id ? 'border-red-300 bg-red-50 text-red-950 shadow-[0_14px_32px_rgba(172,55,48,0.08)]' : 'border-red-100 bg-white text-red-700 hover:border-red-200'}`}>
                        <div className="font-syne text-lg font-bold">{option.label}</div>
                        <div className="mt-2 text-sm leading-6 text-inherit/80">{option.helper}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="rounded-[26px] border border-red-100 bg-white/76 p-5">
                  <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-red-500">Ações automáticas</div>
                  <div className="mt-4 space-y-2">
                    {['Convocação do comitê.','Hash de auditoria da ativação.','Canal virtual da sala.','Registro em timeline e PMO.'].map((item) => (
                      <div key={item} className="flex items-start gap-3 rounded-[18px] border border-red-100 bg-red-50/55 px-3 py-3 text-sm text-red-900"><CheckCircle2 size={16} className="mt-0.5 shrink-0 text-red-500" /><span>{item}</span></div>
                    ))}
                  </div>
                </div>
                <div className="rounded-[26px] border border-red-100 bg-white/76 p-5">
                  <label className="block font-mono text-[11px] uppercase tracking-[0.24em] text-red-500">Próximo checkpoint executivo
                    <input type="datetime-local" value={nextBriefingAt} onChange={(event) => setNextBriefingAt(event.target.value)} className="mt-3 w-full rounded-[18px] border border-red-100 bg-white px-4 py-3 font-dm text-sm text-[var(--ink)] outline-none transition-colors focus:border-red-300" />
                  </label>
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={onClose} className="flex-1 rounded-full border border-red-200 bg-white/82 px-5 py-3 font-dm text-sm font-medium text-red-700 transition-colors hover:bg-white">Cancelar</button>
                  <button type="button" onClick={runActivation} className="flex-1 rounded-full bg-red-700 px-5 py-3 font-syne text-sm font-bold uppercase tracking-[0.16em] text-white transition-colors hover:bg-red-600">Ativar sala</button>
                </div>
              </div>
            </div>
          </div>
        )}
        {step === 2 && (
          <div className="app-panel rounded-[32px] p-8 shadow-[0_28px_80px_rgba(21,38,43,0.16)]">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-red-200 bg-red-50 text-red-600"><Siren size={28} className="animate-pulse" /></div>
            <h2 className="text-center font-syne text-2xl font-extrabold uppercase text-[var(--ink)]">Acionando o comitê de crise</h2>
            <div className="mt-6 h-2 overflow-hidden rounded-full bg-[rgba(21,38,43,0.08)]"><div className="h-full rounded-full bg-red-500 transition-all duration-500" style={{ width: `${progress}%` }} /></div>
            <div className="mt-6 grid gap-3">
              {membersState.map((member) => (
                <div key={member.id} className="flex items-center justify-between rounded-[20px] border border-[rgba(21,38,43,0.08)] bg-white/82 px-4 py-3"><div><div className="font-syne text-lg font-bold text-[var(--ink)]">{member.role}</div><div className="text-sm text-[var(--ink-soft)]">{member.name}</div></div><span className={`rounded-full px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] ${member.state === 'done' ? 'bg-emerald-50 text-emerald-700' : member.state === 'sending' ? 'bg-amber-50 text-amber-700' : 'bg-[rgba(21,38,43,0.08)] text-[var(--ink-soft)]'}`}>{member.state === 'done' ? 'Notificado' : member.state === 'sending' ? 'Enviando' : 'Fila'}</span></div>
              ))}
            </div>
          </div>
        )}
        {step === 3 && result && (
          <div className="rounded-[32px] border border-emerald-200 bg-[linear-gradient(135deg,rgba(246,255,247,0.98),rgba(236,250,239,0.96))] p-8 shadow-[0_28px_80px_rgba(52,130,73,0.14)]">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 text-emerald-600"><ShieldCheck size={30} /></div>
            <div className="text-center"><div className="font-mono text-[11px] uppercase tracking-[0.26em] text-emerald-600">War Room ativa</div><h2 className="mt-3 font-syne text-3xl font-extrabold uppercase text-emerald-950">Sala ativada com sucesso</h2></div>
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              <div className="rounded-[24px] border border-emerald-100 bg-white/82 p-5"><div className="font-mono text-[10px] uppercase tracking-[0.22em] text-emerald-600">Sala virtual</div><div className="mt-3 break-all font-mono text-xs text-[var(--ink-soft)]">{result.teamsLink}</div><div className="mt-3"><CopyButton text={result.teamsLink} label="Copiar link" /></div></div>
              <div className="rounded-[24px] border border-emerald-100 bg-white/82 p-5"><div className="font-mono text-[10px] uppercase tracking-[0.22em] text-emerald-600">Hash de auditoria</div><div className="mt-3 break-all font-mono text-xs text-[var(--ink-soft)]">{result.hash}</div><div className="mt-3"><CopyButton text={result.hash} label="Copiar hash" /></div></div>
            </div>
            <button type="button" onClick={() => onConfirm(result)} className="mt-6 w-full rounded-full bg-emerald-600 px-5 py-3 font-syne text-sm font-bold uppercase tracking-[0.16em] text-white transition-colors hover:bg-emerald-500">Abrir War Room</button>
          </div>
        )}
      </div>
    </div>
  );
}function CloseModal({ onClose, onConfirm, activities, currentMembers }) {
  const [step, setStep] = useState(1);
  const [checklist, setChecklist] = useState([]);
  const [motivo, setMotivo] = useState('');
  const [selectedActivityIds, setSelectedActivityIds] = useState([]);
  const [result, setResult] = useState(null);

  const activityUpdates = useMemo(() => {
    const active = (activities || []).filter((activity) => activity.status === 'Em andamento' || activity.status === 'Planejado');
    return active.map((activity) => ({ ...activity, selected: selectedActivityIds.includes(activity.id) }));
  }, [activities, selectedActivityIds]);

  const membersPresent = (currentMembers || []).filter((member) => member.present).length;
  const canConfirm = checklist.length >= 1 && motivo.trim().length >= 20;
  const toggleChecklist = (item) => setChecklist((prev) => prev.includes(item) ? prev.filter((value) => value !== item) : [...prev, item]);
  const toggleActivityUpdate = (id) => setSelectedActivityIds((prev) => prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id]);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto p-4 py-6">
      <div className="absolute inset-0 bg-[#15262b]/45 backdrop-blur-md" />
      <div className="relative mx-auto my-0 w-full max-w-3xl">
        {step === 1 && (
          <div className="app-panel rounded-[32px] p-6 shadow-[0_28px_80px_rgba(21,38,43,0.16)] md:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="font-mono text-[11px] uppercase tracking-[0.28em] text-[var(--ink-soft)]">Encerramento</div>
                <h2 className="mt-3 font-syne text-3xl font-extrabold uppercase text-[var(--ink)]">Fechar War Room</h2>
              </div>
              <button type="button" onClick={onClose} className="rounded-full border border-[rgba(21,38,43,0.12)] bg-white/82 p-3 text-[var(--ink-soft)] transition-colors hover:text-[var(--ink)]"><X size={18} /></button>
            </div>
            <div className="mt-8 grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
              <div className="space-y-4">
                <div className="rounded-[26px] border border-[rgba(21,38,43,0.08)] bg-white/82 p-5">
                  <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--ink-soft)]">Critérios mínimos</div>
                  <div className="mt-4 grid gap-3">
                    {CLOSE_CHECKLIST.map((item) => (
                      <label key={item} className="flex items-start gap-3 rounded-[20px] border border-[rgba(21,38,43,0.08)] bg-[rgba(245,247,248,0.85)] px-4 py-3 text-sm text-[var(--ink)]"><input type="checkbox" checked={checklist.includes(item)} onChange={() => toggleChecklist(item)} className="mt-1 h-4 w-4 accent-[var(--accent-deep)]" /><span>{item}</span></label>
                    ))}
                  </div>
                </div>
                <div className="rounded-[26px] border border-[rgba(21,38,43,0.08)] bg-white/82 p-5">
                  <label className="block font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--ink-soft)]">Resumo do encerramento
                    <textarea value={motivo} onChange={(event) => setMotivo(event.target.value)} rows={5} className="mt-3 w-full rounded-[22px] border border-[rgba(21,38,43,0.12)] bg-white px-4 py-3 font-dm text-sm text-[var(--ink)] outline-none transition-colors focus:border-[var(--accent-deep)]" placeholder="Explique como a sala foi estabilizada e qual é a transição para pós-incidente." />
                  </label>
                  <div className={`mt-2 font-mono text-[11px] uppercase tracking-[0.16em] ${motivo.trim().length >= 20 ? 'text-emerald-600' : 'text-[var(--ink-soft)]'}`}>{motivo.trim().length}/20 caracteres mínimos</div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="rounded-[26px] border border-[rgba(21,38,43,0.08)] bg-white/82 p-5">
                  <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--ink-soft)]">Resumo rápido</div>
                  <div className="mt-4 grid gap-3">
                    <div className="rounded-[20px] border border-[rgba(21,38,43,0.08)] bg-[rgba(245,247,248,0.85)] p-4"><div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--ink-soft)]">Membros presentes</div><div className="mt-2 font-syne text-3xl font-bold text-[var(--ink)]">{membersPresent}/5</div></div>
                    <div className="rounded-[20px] border border-[rgba(21,38,43,0.08)] bg-[rgba(245,247,248,0.85)] p-4"><div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--ink-soft)]">Atividades ligadas</div><div className="mt-2 font-syne text-3xl font-bold text-[var(--ink)]">{activityUpdates.length}</div></div>
                  </div>
                </div>
                {activityUpdates.length > 0 && (
                  <div className="rounded-[26px] border border-[rgba(21,38,43,0.08)] bg-white/82 p-5">
                    <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--ink-soft)]">Atualizar jornada</div>
                    <div className="mt-4 grid gap-2 max-h-56 overflow-y-auto pr-1">
                      {activityUpdates.map((activity) => (
                        <label key={activity.id} className="flex items-start gap-3 rounded-[18px] border border-[rgba(21,38,43,0.08)] bg-[rgba(245,247,248,0.85)] px-4 py-3 text-sm text-[var(--ink)]"><input type="checkbox" checked={activity.selected} onChange={() => toggleActivityUpdate(activity.id)} className="mt-1 h-4 w-4 accent-[var(--accent-deep)]" /><span><strong>#{activity.id}</strong> {activity.nome}</span></label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <button type="button" onClick={onClose} className="flex-1 rounded-full border border-[rgba(21,38,43,0.12)] bg-white/82 px-5 py-3 font-dm text-sm font-medium text-[var(--ink-soft)] transition-colors hover:text-[var(--ink)]">Cancelar</button>
              <button type="button" onClick={() => { setResult({ closeHash: generateHash(), motivo, selectedActivityIds: activityUpdates.filter((activity) => activity.selected).map((activity) => activity.id), checklist }); setStep(2); }} disabled={!canConfirm} className={`flex-1 rounded-full px-5 py-3 font-syne text-sm font-bold uppercase tracking-[0.16em] transition-colors ${canConfirm ? 'bg-emerald-600 text-white hover:bg-emerald-500' : 'bg-[rgba(21,38,43,0.08)] text-[var(--ink-soft)] cursor-not-allowed'}`}>Preparar encerramento</button>
            </div>
          </div>
        )}
        {step === 2 && result && (
          <div className="rounded-[32px] border border-emerald-200 bg-[linear-gradient(135deg,rgba(246,255,247,0.98),rgba(236,250,239,0.96))] p-8 shadow-[0_28px_80px_rgba(52,130,73,0.14)]">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 text-emerald-600"><ShieldCheck size={30} /></div>
            <div className="text-center"><div className="font-mono text-[11px] uppercase tracking-[0.26em] text-emerald-600">Encerramento pronto</div><h2 className="mt-3 font-syne text-3xl font-extrabold uppercase text-emerald-950">Fechar a War Room</h2></div>
            <div className="mt-8 rounded-[24px] border border-emerald-100 bg-white/82 p-5 text-sm leading-7 text-[var(--ink)]"><div><strong>Critérios marcados:</strong> {result.checklist.length}</div><div><strong>Atividades como feitas:</strong> {result.selectedActivityIds.length}</div><div><strong>Hash de fechamento:</strong> <span className="break-all font-mono text-xs text-[var(--ink-soft)]">{result.closeHash}</span></div></div>
            <div className="mt-6 flex gap-3"><button type="button" onClick={() => setStep(1)} className="flex-1 rounded-full border border-emerald-200 bg-white/82 px-5 py-3 font-dm text-sm font-medium text-emerald-800 transition-colors hover:bg-white">Voltar</button><button type="button" onClick={() => { onConfirm(result); onClose(); }} className="flex-1 rounded-full bg-emerald-600 px-5 py-3 font-syne text-sm font-bold uppercase tracking-[0.16em] text-white transition-colors hover:bg-emerald-500">Confirmar encerramento</button></div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function WarRoom({ clientId: propClientId, isAdmin = false, adminClientName, onAdminBack }) {
  const { user } = useAuth();
  const effectiveClientId = propClientId || user?.clientId;
  const [crisis, setCrisis] = useState(null);
  const [info, setInfo] = useState({});
  const [showDeclareModal, setShowDeclareModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [members, setMembers] = useState(CRI_MEMBERS.map((member) => ({ ...member, present: false })));
  const [actions, setActions] = useState(IMMEDIATE_ACTIONS.map((action) => ({ ...action, done: false })));
  const [feedInput, setFeedInput] = useState('');
  const [feed, setFeed] = useState([]);
  const [jornadaActivities, setJornadaActivities] = useState([]);
  const [commandFocus, setCommandFocus] = useState(FOCUS_OPTIONS[0].id);
  const [nextBriefingAt, setNextBriefingAt] = useState('');
  const elapsed = useCrisisTimer(crisis?.crisisTimestamp);
  const slaHours = info?.dataConhecimento ? calcSLAHours(info.dataConhecimento) : 0;
  const safeTeamsLink = toSafeHttpsUrl(crisis?.crisisTeamsLink);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const activeCrisis = getStorage(KEYS.crisis(effectiveClientId, 'active'));
    const hasActive = activeCrisis?.crisisActive === true && activeCrisis?.crisisStatus !== 'closed';
    setCrisis(hasActive ? activeCrisis : null);
    setInfo(getStorage(KEYS.info(effectiveClientId), {}));
    setFeed(hasActive && Array.isArray(activeCrisis?.feed) ? activeCrisis.feed : []);
    setMembers(hasActive && Array.isArray(activeCrisis?.members) ? CRI_MEMBERS.map((member) => ({ ...member, present: !!activeCrisis.members.find((item) => item.id === member.id)?.present })) : CRI_MEMBERS.map((member) => ({ ...member, present: false })));
    setActions(hasActive && Array.isArray(activeCrisis?.immediateActions) ? IMMEDIATE_ACTIONS.map((action) => ({ ...action, done: !!activeCrisis.immediateActions.find((item) => item.id === action.id)?.done })) : IMMEDIATE_ACTIONS.map((action) => ({ ...action, done: false })));
    setCommandFocus(hasActive && activeCrisis?.commandFocus ? activeCrisis.commandFocus : FOCUS_OPTIONS[0].id);
    setNextBriefingAt(hasActive && activeCrisis?.nextBriefingAt ? activeCrisis.nextBriefingAt : '');
    setJornadaActivities(getStorage(KEYS.activities(effectiveClientId), []));
  }, [effectiveClientId]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const saveCrisis = (update) => {
    if (!crisis) return;
    const updated = { ...crisis, ...update };
    setCrisis(updated);
    setStorage(KEYS.crisis(effectiveClientId, 'active'), updated);
  };

  const handleDeclareCrisis = (result) => {
    const initialMembers = CRI_MEMBERS.map((member) => ({ ...member, present: false }));
    const initialActions = IMMEDIATE_ACTIONS.map((action) => ({ ...action, done: false }));
    const crisisData = {
      crisisActive: true,
      crisisStatus: 'active',
      crisisId: result.crisisId,
      crisisTimestamp: new Date().toISOString(),
      crisisHash: result.hash,
      crisisTeamsLink: result.teamsLink,
      commandFocus: result.commandFocus,
      nextBriefingAt: result.nextBriefingAt,
      members: initialMembers,
      immediateActions: initialActions,
      feed: [{ id: Date.now(), timestamp: new Date().toISOString(), text: 'War Room ativada. Comitê mobilizado e trilha de coordenação iniciada.', user: user?.email || 'Sistema' }],
    };
    setStorage(KEYS.crisis(effectiveClientId, 'active'), crisisData);
    setCrisis(crisisData);
    setFeed(crisisData.feed);
    setMembers(initialMembers);
    setActions(initialActions);
    setCommandFocus(result.commandFocus);
    setNextBriefingAt(result.nextBriefingAt);
    const pmoData = getStorage(KEYS.pmo(effectiveClientId), {});
    const timeline = pmoData.timeline || [];
    timeline.unshift({ id: Date.now(), datetime: new Date().toISOString().slice(0, 16), fase: 'Contenção', evento: 'War Room ativada e comitê de crise mobilizado.', fonte: user?.email || 'Sistema', evidencia: `Crisis ID: ${result.crisisId} | Hash: ${result.hash}` });
    const existingActions = pmoData.actions || [];
    const newActions = IMMEDIATE_ACTIONS.map((action) => ({ id: action.id, descricao: action.label, responsavel: '', area: action.stream === 'regulatory' ? 'Jurídico' : action.stream === 'executive' ? 'Comitê' : 'Tecnologia', status: 'Aberto', prazo: '', prioridade: ['A001', 'A002', 'A003'].includes(action.id) ? 'Crítica' : 'Alta', observacoes: 'Originada automaticamente na ativação da War Room.' }));
    setStorage(KEYS.pmo(effectiveClientId), { ...pmoData, timeline, actions: [...existingActions, ...newActions] });
    const currentActivities = getStorage(KEYS.activities(effectiveClientId), []);
    const updatedActivities = currentActivities.map((activity) => (activity.status === 'Planejado' ? { ...activity, status: 'Em andamento' } : activity));
    setStorage(KEYS.activities(effectiveClientId), updatedActivities);
    setJornadaActivities(updatedActivities);
    addNotification(effectiveClientId, { type: 'crisis', message: `War Room ativada — ${result.crisisId}`, link: '/pmo/warroom' });
    setShowDeclareModal(false);
  };

  const handleCloseCrisis = ({ closeHash, motivo, selectedActivityIds }) => {
    const closed = { ...crisis, crisisStatus: 'closed', crisisActive: false, crisisClosedAt: new Date().toISOString(), crisisCloseHash: closeHash, crisisDuration: elapsed, crisisResummo: motivo, members, immediateActions: actions, feed, commandFocus, nextBriefingAt };
    setStorage(KEYS.crisis(effectiveClientId, 'active'), closed);
    setCrisis(null);
    const pmoData = getStorage(KEYS.pmo(effectiveClientId), {});
    const timeline = pmoData.timeline || [];
    timeline.unshift({ id: Date.now(), datetime: new Date().toISOString().slice(0, 16), fase: 'Pós-incidente', evento: `War Room encerrada — ${motivo}`, fonte: user?.email || 'Sistema', evidencia: `Hash: ${closeHash} | Duração: ${elapsed}` });
    setStorage(KEYS.pmo(effectiveClientId), { ...pmoData, timeline });
    if (selectedActivityIds?.length > 0) {
      const currentActivities = getStorage(KEYS.activities(effectiveClientId), []);
      const updatedActivities = currentActivities.map((activity) => (selectedActivityIds.includes(activity.id) ? { ...activity, status: 'Feito' } : activity));
      setStorage(KEYS.activities(effectiveClientId), updatedActivities);
      setJornadaActivities(updatedActivities);
    }
  };

  const addFeedEntry = () => {
    if (!feedInput.trim() || !crisis) return;
    const entry = { id: Date.now(), timestamp: new Date().toISOString(), text: feedInput.trim(), user: user?.email || 'War Room' };
    const newFeed = [entry, ...feed];
    setFeed(newFeed);
    saveCrisis({ feed: newFeed });
    const pmoData = getStorage(KEYS.pmo(effectiveClientId), {});
    const timeline = pmoData.timeline || [];
    timeline.unshift({ id: Date.now(), datetime: new Date().toISOString().slice(0, 16), fase: 'Contenção', evento: feedInput.trim(), fonte: user?.email || 'War Room', evidencia: `Crisis ID: ${crisis?.crisisId}` });
    setStorage(KEYS.pmo(effectiveClientId), { ...pmoData, timeline });
    setFeedInput('');
  };  const toggleMember = (id) => {
    const updated = members.map((member) => (member.id === id ? { ...member, present: !member.present } : member));
    setMembers(updated);
    saveCrisis({ members: updated });
  };

  const toggleAction = (id) => {
    const updated = actions.map((action) => (action.id === id ? { ...action, done: !action.done } : action));
    setActions(updated);
    saveCrisis({ immediateActions: updated });
  };

  const workstreams = useMemo(() => {
    const streams = {
      technical: { label: 'Frente técnica', description: 'Conter, preservar evidências e reduzir indisponibilidade.' },
      regulatory: { label: 'Frente regulatória', description: 'Prazos, comunicações e trilha de evidências.' },
      executive: { label: 'Frente executiva', description: 'Diretoria, imprensa e alinhamento decisório.' },
    };
    return Object.entries(streams).map(([stream, meta]) => {
      const related = actions.filter((item) => item.stream === stream);
      const done = related.filter((item) => item.done).length;
      const total = related.length || 1;
      return { ...meta, stream, done, total, percent: Math.round((done / total) * 100) };
    });
  }, [actions]);

  const membersPresent = members.filter((member) => member.present).length;
  const actionsDone = actions.filter((action) => action.done).length;
  const latestFeed = feed[0];
  const openActions = actions.filter((action) => !action.done);
  const focusMeta = getFocusMeta(commandFocus);
  const situationLabel = crisis ? (actionsDone >= 5 ? 'Contorno estabilizado' : actionsDone >= 3 ? 'Coordenação intensiva' : 'Resposta imediata') : 'Sem ativação';
  const pmoHref = isAdmin ? `/admin/cliente/${effectiveClientId}/pmo` : '/pmo';

  return (
    <Layout clientId={propClientId} isAdmin={isAdmin} adminClientName={adminClientName} onAdminBack={onAdminBack}>
      <div className="px-6 pb-10 pt-6 md:px-10 md:pt-10">
        {crisis && (
          <div className="mb-6 rounded-[28px] border border-red-200 bg-[linear-gradient(135deg,rgba(255,247,245,0.96),rgba(255,235,232,0.92))] px-5 py-4 shadow-[0_18px_34px_rgba(212,90,88,0.12)]">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3 text-red-900"><div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-red-200 bg-white/82"><Siren size={20} className="text-red-600" /></div><div><div className="font-mono text-[11px] uppercase tracking-[0.24em] text-red-500">War Room ativa</div><div className="mt-1 font-syne text-xl font-bold uppercase">{crisis.crisisId}</div></div></div>
              <div className="flex flex-wrap gap-3"><div className="rounded-full border border-red-200 bg-white/82 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.16em] text-red-700">Ativa desde {formatDateTime(crisis.crisisTimestamp)}</div><div className="rounded-full border border-red-200 bg-white/82 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.16em] text-red-700">{elapsed}</div></div>
            </div>
          </div>
        )}

        <section className="app-panel-dark relative overflow-hidden rounded-[38px] p-6 shadow-[0_24px_48px_rgba(21,38,43,0.1)] md:p-8">
          <div className="absolute inset-y-0 right-0 hidden w-1/3 bg-[radial-gradient(circle_at_top_right,rgba(214,255,99,0.18),transparent_62%)] lg:block" />
          <div className="relative grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.95fr)]">
            <div>
              <div className="font-mono text-[11px] uppercase tracking-[0.28em] text-[var(--accent)]">Comitê de crise</div>
              <h1 className="mt-4 font-syne text-4xl font-extrabold uppercase text-white md:text-5xl">{'War Room — Comitê de Crise'}</h1>
              <p className="mt-4 max-w-3xl text-base leading-7 text-[#d8e1e4]">Sala de coordenação para decidir, registrar e conduzir as frentes técnica, regulatória e executiva enquanto o incidente estiver em escalada.</p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard label="Tempo de sala" value={crisis ? elapsed : '0h 0m'} helper={crisis ? 'Contado desde a ativação da War Room.' : 'Nenhuma sala ativa neste momento.'} />
                <MetricCard label="Membros presentes" value={`${membersPresent}/5`} helper="Confirmação operacional do comitê." tone="accent" />
                <MetricCard label="Ações concluídas" value={`${actionsDone}/${actions.length}`} helper="Execução das ações imediatas da sala." />
                <MetricCard label="SLA ANPD" value={info?.dataConhecimento ? formatSLALabel(slaHours) : '—'} helper="Referência a partir da ciência do incidente." />
              </div>
            </div>
            <div className="rounded-[30px] border border-white/10 bg-white/6 p-5">
              <div className="flex items-start justify-between gap-4"><div><div className="font-mono text-[11px] uppercase tracking-[0.26em] text-[var(--accent)]">Pulso da sala</div><div className="mt-2 font-syne text-2xl font-bold text-white">{crisis ? situationLabel : 'Pronta para ativação'}</div></div>{crisis && <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-white">{focusMeta.label}</span>}</div>
              <p className="mt-4 text-sm leading-6 text-[#d8e1e4]">{crisis ? focusMeta.helper : 'Ative a sala apenas quando o incidente exigir coordenação executiva, governança de decisão e cadência de resposta acelerada.'}</p>
              <div className="mt-5 space-y-3">
                <div className="rounded-[24px] border border-white/10 bg-white/6 p-4"><div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--ink-soft)]">Cliente em foco</div><div className="mt-2 font-syne text-2xl font-bold text-white">{info?.nomeCliente || adminClientName || effectiveClientId || 'Não informado'}</div></div>
                <div className="rounded-[24px] border border-white/10 bg-white/6 p-4"><div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--ink-soft)]">Próximo checkpoint</div><div className="mt-2 font-syne text-xl font-bold text-white">{crisis && nextBriefingAt ? formatDateTime(nextBriefingAt) : 'Definir na ativação'}</div></div>
              </div>
            </div>
          </div>
        </section>

        {!crisis ? (
          <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.95fr)]">
            <section className="app-panel rounded-[34px] p-6 shadow-[0_24px_48px_rgba(21,38,43,0.08)] md:p-8">
              <div className="font-mono text-[11px] uppercase tracking-[0.26em] text-[var(--ink-soft)]">Pronta para acionar</div>
              <h2 className="mt-3 font-syne text-3xl font-extrabold text-[var(--ink)]">Ative a sala apenas quando precisar de comando centralizado</h2>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--ink-soft)]">A War Room é para momentos de escalada, decisão interárea, pressão regulatória ou necessidade de coordenação executiva em tempo real.</p>
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div className="rounded-[26px] border border-[rgba(21,38,43,0.08)] bg-[linear-gradient(135deg,rgba(22,50,57,0.98),rgba(22,64,71,0.94))] p-5 text-white shadow-[0_16px_32px_rgba(21,38,43,0.08)]"><div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/12 bg-white/8"><ShieldAlert size={18} /></div><div className="font-syne text-lg font-bold">Indicadores para acionar</div></div><div className="mt-4 grid gap-3">{['Ameaça sem contenção imediata.','Necessidade de alinhamento com diretoria.','Risco regulatório ou de comunicação externa.','Múltiplas frentes operacionais em paralelo.'].map((item) => (<div key={item} className="rounded-[18px] border border-white/10 bg-white/8 px-4 py-3 text-sm leading-6 text-[#d8e1e4]">{item}</div>))}</div></div>
                <div className="rounded-[26px] border border-[rgba(21,38,43,0.08)] bg-white/82 p-5"><div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[rgba(21,38,43,0.08)] bg-[rgba(214,255,99,0.16)] text-[#6e8617]"><CheckCircle2 size={18} /></div><div className="font-syne text-lg font-bold text-[var(--ink)]">O que acontece ao declarar</div></div><div className="mt-4 space-y-3">{['Convocação automática do comitê previsto.','Hash de auditoria para rastreabilidade.','Canal de War Room pronto para uso imediato.','Registro em timeline e ações-base no PMO.'].map((item) => (<div key={item} className="rounded-[18px] border border-[rgba(21,38,43,0.08)] bg-[rgba(245,247,248,0.85)] px-4 py-3 text-sm leading-6 text-[var(--ink)]">{item}</div>))}</div></div>
              </div>
              <div className="mt-6 flex flex-wrap gap-3"><button type="button" onClick={() => setShowDeclareModal(true)} className="inline-flex items-center gap-3 rounded-full bg-red-700 px-7 py-4 font-syne text-sm font-bold uppercase tracking-[0.16em] text-white transition-colors hover:bg-red-600"><AlertOctagon size={18} />Declarar crise</button><a href={pmoHref} className="inline-flex items-center gap-2 rounded-full border border-[rgba(21,38,43,0.12)] bg-white/82 px-5 py-4 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--ink-soft)] transition-colors hover:text-[var(--ink)]">Revisar PMO<ArrowUpRight size={14} /></a></div>
            </section>
            <section className="space-y-6"><div className="app-panel rounded-[34px] p-6 shadow-[0_24px_48px_rgba(21,38,43,0.08)]"><div className="font-mono text-[11px] uppercase tracking-[0.26em] text-[var(--ink-soft)]">Comitê previsto</div><div className="mt-4 grid gap-3">{CRI_MEMBERS.map((member) => (<div key={member.id} className="rounded-[20px] border border-[rgba(21,38,43,0.08)] bg-white/82 px-4 py-4"><div className="font-syne text-lg font-bold text-[var(--ink)]">{member.role}</div><div className="mt-1 text-sm text-[var(--ink-soft)]">{member.name}</div></div>))}</div></div></section>
            <section className="xl:col-span-2"><CrisisHistory clientId={effectiveClientId} /></section>
          </div>
        ) : (
          <div className="mt-8 grid gap-6 2xl:grid-cols-[minmax(0,1.2fr)_minmax(380px,0.8fr)]">
            <div className="space-y-6">
              <section className="app-panel rounded-[34px] p-6 shadow-[0_24px_48px_rgba(21,38,43,0.08)] md:p-7">
                <div className="flex flex-wrap items-start justify-between gap-4"><div><div className="font-mono text-[11px] uppercase tracking-[0.26em] text-[var(--ink-soft)]">Cockpit de comando</div><h2 className="mt-3 font-syne text-3xl font-extrabold text-[var(--ink)]">Coordenação ativa do caso</h2><p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--ink-soft)]">Use esta visão para conduzir a sala, alinhar frentes e registrar cada decisão importante da crise.</p></div><div className="rounded-[22px] border border-[rgba(21,38,43,0.08)] bg-[rgba(245,247,248,0.85)] px-4 py-3"><div className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--ink-soft)]">Crisis ID</div><div className="mt-2 font-syne text-lg font-bold text-[var(--ink)]">{crisis.crisisId}</div></div></div>
                <div className="mt-6 grid gap-4 lg:grid-cols-2">
                  <div className="rounded-[26px] border border-[rgba(21,38,43,0.08)] bg-white/82 p-5"><div className="font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--ink-soft)]">Foco da sala</div><div className="mt-4 grid gap-3">{FOCUS_OPTIONS.map((option) => (<button key={option.id} type="button" onClick={() => { setCommandFocus(option.id); saveCrisis({ commandFocus: option.id }); }} className={`rounded-[20px] border px-4 py-4 text-left transition-all ${commandFocus === option.id ? 'border-[rgba(214,255,99,0.42)] bg-[rgba(214,255,99,0.14)] text-[var(--ink)] shadow-[0_14px_32px_rgba(21,38,43,0.06)]' : 'border-[rgba(21,38,43,0.08)] bg-[rgba(245,247,248,0.85)] text-[var(--ink-soft)] hover:border-[rgba(21,38,43,0.14)] hover:text-[var(--ink)]'}`}><div className="font-syne text-lg font-bold">{option.label}</div><div className="mt-2 text-sm leading-6">{option.helper}</div></button>))}</div></div>
                  <div className="space-y-4"><div className="rounded-[26px] border border-[rgba(21,38,43,0.08)] bg-white/82 p-5"><div className="font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--ink-soft)]">Próximo checkpoint</div><div className="mt-3 flex flex-col gap-3"><div className="inline-flex items-center gap-2 text-sm text-[var(--ink)]"><CalendarClock size={16} className="text-[var(--ink-soft)]" />{nextBriefingAt ? formatDateTime(nextBriefingAt) : 'Não definido'}</div><input type="datetime-local" value={nextBriefingAt} onChange={(event) => { const value = event.target.value; setNextBriefingAt(value); saveCrisis({ nextBriefingAt: value }); }} className="w-full rounded-[18px] border border-[rgba(21,38,43,0.12)] bg-white px-4 py-3 font-dm text-sm text-[var(--ink)] outline-none transition-colors focus:border-[var(--accent-deep)]" /></div></div><div className="rounded-[26px] border border-[rgba(21,38,43,0.08)] bg-white/82 p-5"><div className="font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--ink-soft)]">Próximas decisões</div><div className="mt-4 grid gap-3">{openActions.slice(0, 3).map((action) => (<div key={action.id} className="rounded-[18px] border border-[rgba(21,38,43,0.08)] bg-[rgba(245,247,248,0.85)] px-4 py-3 text-sm text-[var(--ink)]"><div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-soft)]">{action.id}</div><div className="mt-1 font-dm leading-6">{action.label}</div></div>))}{openActions.length === 0 && <div className="rounded-[18px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">Todas as ações imediatas previstas foram registradas.</div>}</div></div></div>
                </div>
              </section>
              <section className="app-panel rounded-[34px] p-6 shadow-[0_24px_48px_rgba(21,38,43,0.08)] md:p-7">
                <div className="flex items-start justify-between gap-4"><div><div className="font-mono text-[11px] uppercase tracking-[0.26em] text-[var(--ink-soft)]">Registro da sala</div><h3 className="mt-3 font-syne text-2xl font-bold text-[var(--ink)]">Feed de comando</h3></div><div className="rounded-full border border-[rgba(21,38,43,0.08)] bg-[rgba(245,247,248,0.85)] px-4 py-2 font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--ink-soft)]">{feed.length} entradas</div></div>
                <div className="mt-5 rounded-[26px] border border-[rgba(21,38,43,0.08)] bg-[rgba(245,247,248,0.85)] p-4"><textarea value={feedInput} onChange={(event) => setFeedInput(event.target.value)} rows={3} placeholder="Registre uma atualização objetiva para a sala." className="w-full rounded-[20px] border border-[rgba(21,38,43,0.12)] bg-white px-4 py-3 font-dm text-sm text-[var(--ink)] outline-none transition-colors focus:border-[var(--accent-deep)]" /><div className="mt-3 flex flex-wrap gap-2">{QUICK_FEED_TEMPLATES.map((item) => (<button key={item} type="button" onClick={() => setFeedInput(item)} className="rounded-full border border-[rgba(21,38,43,0.08)] bg-white px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--ink-soft)] transition-colors hover:border-[rgba(214,255,99,0.35)] hover:text-[var(--ink)]">{item}</button>))}</div><div className="mt-4"><button type="button" onClick={addFeedEntry} className="inline-flex items-center gap-2 rounded-full bg-[#173038] px-5 py-3 font-syne text-sm font-bold uppercase tracking-[0.14em] text-white transition-colors hover:bg-[#21424d]"><MessageSquareText size={16} />Registrar update</button></div></div>
                <div className="mt-5 grid gap-3 max-h-[520px] overflow-y-auto pr-1">{feed.length === 0 ? <div className="rounded-[22px] border border-dashed border-[rgba(21,38,43,0.16)] bg-white/72 px-5 py-10 text-center text-sm text-[var(--ink-soft)]">Nenhuma atualização registrada ainda.</div> : feed.map((entry, index) => (<div key={entry.id} className={`rounded-[24px] border p-4 ${index === 0 ? 'border-[rgba(214,255,99,0.35)] bg-[rgba(214,255,99,0.1)]' : 'border-[rgba(21,38,43,0.08)] bg-white/82'}`}><div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-[var(--ink-soft)]"><Clock3 size={12} /><span>{formatDateTime(entry.timestamp)}</span><span>•</span><span className="truncate">{entry.user}</span></div><p className="mt-3 text-sm leading-7 text-[var(--ink)]">{entry.text}</p></div>))}</div>
              </section>
            </div>
            <div className="space-y-6">
              <section className="app-panel-dark rounded-[34px] p-6 shadow-[0_24px_48px_rgba(21,38,43,0.14)]"><div className="font-mono text-[11px] uppercase tracking-[0.26em] text-[var(--accent)]">{'Frentes de coordena\u00e7\u00e3o'}</div><h3 className="mt-3 font-syne text-2xl font-bold text-white">{'Linha de comando por frente'}</h3><p className="mt-2 text-sm leading-6 text-[#d8e1e4]">{'Distribui\u00e7\u00e3o pr\u00e1tica das responsabilidades que precisam ser acompanhadas at\u00e9 a estabiliza\u00e7\u00e3o da crise.'}</p><div className="mt-5 grid gap-3">{workstreams.map((stream) => (<WorkstreamCard key={stream.stream} {...stream} />))}</div></section>
              <section className="app-panel rounded-[34px] p-6 shadow-[0_24px_48px_rgba(21,38,43,0.08)]"><div className="flex items-center justify-between gap-4"><div><div className="font-mono text-[11px] uppercase tracking-[0.26em] text-[var(--ink-soft)]">Comitê mobilizado</div><h3 className="mt-2 font-syne text-2xl font-bold text-[var(--ink)]">Presença dos membros</h3></div><span className="rounded-full border border-[rgba(21,38,43,0.08)] bg-[rgba(245,247,248,0.85)] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-soft)]">{membersPresent}/5 presentes</span></div><div className="mt-4 grid gap-3">{members.map((member) => (<div key={member.id} className="flex items-center justify-between rounded-[22px] border border-[rgba(21,38,43,0.08)] bg-white/82 px-4 py-4"><div><div className="font-syne text-lg font-bold text-[var(--ink)]">{member.role}</div><div className="mt-1 text-sm text-[var(--ink-soft)]">{member.name}</div></div><button type="button" onClick={() => toggleMember(member.id)} className={`rounded-full px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] transition-colors ${member.present ? 'border border-emerald-200 bg-emerald-50 text-emerald-700' : 'border border-[rgba(21,38,43,0.08)] bg-[rgba(245,247,248,0.85)] text-[var(--ink-soft)] hover:text-[var(--ink)]'}`}>{member.present ? 'Presente' : 'Ausente'}</button></div>))}</div></section>
              <section className="app-panel rounded-[34px] p-6 shadow-[0_24px_48px_rgba(21,38,43,0.08)]"><div className="font-mono text-[11px] uppercase tracking-[0.26em] text-[var(--ink-soft)]">Canais e evidências</div><div className="mt-4 space-y-3"><div className="rounded-[22px] border border-[rgba(21,38,43,0.08)] bg-white/82 p-4"><div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-[var(--ink-soft)]"><Link2 size={12} />Sala virtual</div><div className="mt-3 break-all font-mono text-xs text-[var(--ink-soft)]">{safeTeamsLink || "Link indisponível"}</div><div className="mt-3 flex flex-wrap gap-2">{safeTeamsLink ? <><CopyButton text={safeTeamsLink} label="Copiar" /><a href={safeTeamsLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-[rgba(21,38,43,0.12)] bg-white px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--ink-soft)] transition-colors hover:text-[var(--ink)]">Abrir<ArrowUpRight size={12} /></a></> : <span className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-red-700">URL inválida</span>}</div></div><div className="rounded-[22px] border border-[rgba(21,38,43,0.08)] bg-white/82 p-4"><div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-[var(--ink-soft)]"><Shield size={12} />Hash de auditoria</div><div className="mt-3 break-all font-mono text-xs text-[var(--ink-soft)]">{crisis.crisisHash}</div><div className="mt-3"><CopyButton text={crisis.crisisHash} label="Copiar hash" /></div></div><div className="rounded-[22px] border border-[rgba(21,38,43,0.08)] bg-white/82 p-4"><div className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--ink-soft)]">Último movimento</div><div className="mt-3 text-sm leading-7 text-[var(--ink)]">{latestFeed ? latestFeed.text : 'Aguardando primeiro registro na sala.'}</div></div></div></section>
            </div>
            <section className="2xl:col-span-2 app-panel rounded-[34px] p-6 shadow-[0_24px_48px_rgba(21,38,43,0.08)] md:p-7"><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="font-mono text-[11px] uppercase tracking-[0.26em] text-[var(--ink-soft)]">Execução imediata</div><h3 className="mt-3 font-syne text-3xl font-bold text-[var(--ink)]">Quadro de ações da sala</h3></div><button type="button" onClick={() => setShowCloseModal(true)} className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-5 py-3 font-syne text-sm font-bold uppercase tracking-[0.14em] text-emerald-800 transition-colors hover:bg-emerald-100"><ShieldOff size={16} />Encerrar War Room</button></div><div className="mt-6 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">{actions.map((action) => (<button key={action.id} type="button" onClick={() => toggleAction(action.id)} className={`rounded-[26px] border p-5 text-left transition-all ${action.done ? 'border-emerald-200 bg-emerald-50 shadow-[0_16px_32px_rgba(76,175,80,0.08)]' : 'border-[rgba(21,38,43,0.08)] bg-white/82 hover:border-[rgba(21,38,43,0.16)] hover:bg-white'}`}><div className="flex items-start justify-between gap-3"><div className="rounded-full border border-[rgba(21,38,43,0.08)] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--ink-soft)]">{action.id}</div><span className={`rounded-full px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] ${action.done ? 'bg-emerald-100 text-emerald-700' : 'bg-[rgba(21,38,43,0.08)] text-[var(--ink-soft)]'}`}>{action.done ? 'Concluída' : 'Aberta'}</span></div><div className="mt-4 font-syne text-xl font-bold text-[var(--ink)]">{action.label}</div></button>))}</div></section>
          </div>
        )}
      </div>
      {showDeclareModal && <DeclarationModal onClose={() => setShowDeclareModal(false)} onConfirm={handleDeclareCrisis} clientId={effectiveClientId} info={info} />}
      {showCloseModal && <CloseModal onClose={() => setShowCloseModal(false)} onConfirm={handleCloseCrisis} activities={jornadaActivities} currentMembers={members} />}
    </Layout>
  );
}