import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import { CrisisHistory } from '../components/CrisisHistory';
import { getStorage, setStorage, KEYS, generateId, generateHash, addNotification } from '../utils/storage';
import { formatSLALabel, calcSLAHours } from '../hooks/useSLA';
import {
  Shield, ShieldOff, ShieldCheck, Zap, Copy, Check,
  AlertOctagon, X, Clock, Users, ChevronDown
} from 'lucide-react';

const CRI_MEMBERS = [
  { id: 'dpo', role: 'DPO', name: 'Delegado de Proteção de Dados' },
  { id: 'juridico', role: 'Jurídico', name: 'Equipe Jurídica' },
  { id: 'cto', role: 'CTO', name: 'Chief Technology Officer' },
  { id: 'rh', role: 'RH', name: 'Recursos Humanos' },
  { id: 'imprensa', role: 'Assessoria de Imprensa', name: 'Comunicação Corporativa' },
];

const IMMEDIATE_ACTIONS = [
  { id: 'A001', label: 'Isolar sistemas comprometidos' },
  { id: 'A002', label: 'Revogar credenciais suspeitas' },
  { id: 'A003', label: 'Notificar ANPD (prazo 3 dias úteis)' },
  { id: 'A004', label: 'Briefing para diretoria' },
  { id: 'A005', label: 'Avaliar necessidade de nota à imprensa' },
  { id: 'A006', label: 'Contatar correspondentes afetados' },
  { id: 'A007', label: 'Preservar e catalogar evidências forenses' },
];

const CLOSE_CHECKLIST = [
  'Ameaça contida e sistemas restaurados',
  'Comunicação à ANPD realizada ou protocolada',
  'Comunicação aos titulares realizada ou protocolada',
  'Evidências preservadas e documentadas',
  'Todos os membros do CRI notificados do encerramento',
  'Hotwash (reunião de lições aprendidas) agendado',
];

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="flex items-center gap-1 text-xs font-mono rounded-full text-[var(--ink-soft)] hover:bg-white hover:text-[var(--ink)] transition-colors"
    >
      {copied ? <Check size={12} className="text-green-600" /> : <Copy size={12} />}
      {copied ? 'Copiado' : 'Copiar'}
    </button>
  );
}

function useCrisisTimer(timestamp) {
  const [elapsed, setElapsed] = useState('0h 0m');
  useEffect(() => {
    if (!timestamp) return;
    const update = () => setElapsed(formatSLALabel(calcSLAHours(timestamp)));
    update();
    const iv = setInterval(update, 60000);
    return () => clearInterval(iv);
  }, [timestamp]);
  return elapsed;
}

// ——— DECLARATION MODAL ———
function DeclarationModal({ onClose, onConfirm, clientId, info }) {
  const [step, setStep] = useState(1);
  const [membersState, setMembersState] = useState(CRI_MEMBERS.map(m => ({ ...m, state: 'pending' })));
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);

  const slaHours = info?.dataConhecimento ? calcSLAHours(info.dataConhecimento) : 0;
  const quickFeedTemplates = [
    'Atualizacao tecnica registrada',
    'Escalonamento juridico solicitado',
    'Comunicação executiva enviada',
    'Evidencias preservadas e validadas',
  ];
  const presentMembers = members.filter((m) => m.present).length;

  // Step 2: simulate sequential notification
  const runNotification = () => {
    setStep(2);
    let idx = 0;
    const next = () => {
      if (idx >= CRI_MEMBERS.length) {
        setTimeout(() => {
          const hash = generateHash();
          const crisisId = `CRISIS-${clientId}-${generateId('').slice(0, 6)}`;
          const teamsLink = `https://teams.microsoft.com/l/meetup-join/crisis-${hash.slice(0, 6)}`;
          setResult({ hash, crisisId, teamsLink });
          setStep(3);
        }, 600);
        return;
      }
      setMembersState(prev => prev.map((m, i) => i === idx ? { ...m, state: 'sending' } : m));
      setTimeout(() => {
        setMembersState(prev => prev.map((m, i) => i === idx ? { ...m, state: 'done' } : m));
        setProgress((idx + 1) * 20);
        idx++;
        setTimeout(next, 800);
      }, 800);
    };
    setTimeout(next, 300);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#15262b]/38 backdrop-blur-md" />
      <div className="relative w-full max-w-lg">

        {/* STEP 1 */}
        {step === 1 && (
          <div className="rounded-[30px] border border-red-200 bg-[linear-gradient(135deg,rgba(255,247,245,0.98),rgba(255,237,234,0.96))] p-8 shadow-[0_28px_80px_rgba(172,55,48,0.16)]">
            <div className="flex justify-center mb-6">
              <AlertOctagon size={56} className="text-red-400 animate-siren" />
            </div>
            <h2 className="font-syne font-extrabold text-red-950 text-3xl uppercase text-center mb-2">
              DECLARAR ESTADO DE CRISE
            </h2>
            <p className="text-red-700 font-mono text-xs text-center mb-6">
              Esta ação ativará o Comitê de Resposta a Incidentes imediatamente
            </p>

            <div className="space-y-2 mb-6">
              {[
                '✉ E-mail de convocação aos 5 membros do CRI',
                '📹 Link de sala virtual Microsoft Teams gerado',
                '🔐 Hash SHA-256 de auditoria registrado',
                '🏷 Badge WAR ROOM ATIVA aplicado ao incidente',
                '📋 Log inserido na Timeline Mestre',
                '⏱ SLA pausado e marcado como "Crise Declarada"',
              ].map((item, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 text-[var(--ink)] font-dm text-sm animate-fade-in-left"
                  style={{ animationDelay: `${i * 100}ms`, animationFillMode: 'both' }}
                >
                  <span>{item}</span>
                </div>
              ))}
            </div>

            <div className="rounded-[22px] bg-white/80 border border-red-100 p-4 mb-6 font-mono text-xs text-red-900/80 space-y-1">
              <div>Cliente: {info?.nomeCliente || clientId}</div>
              <div>SLA Atual: {formatSLALabel(slaHours)}</div>
              <div>Status: Em crise</div>
            </div>

            <div className="flex gap-3">
              <button onClick={onClose} className="flex-1 rounded-full border border-[rgba(21,38,43,0.12)] text-[var(--ink-soft)] font-dm py-3 hover:bg-white transition-colors text-sm">
                Cancelar
              </button>
              <button
                onClick={runNotification}
                className="flex-1 rounded-full bg-red-700 text-white font-syne font-bold py-3 hover:bg-red-600 transition-colors text-sm uppercase tracking-wide"
              >
                CONFIRMAR DECLARAÇÃO
              </button>
            </div>
          </div>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <div className="app-panel rounded-[28px] p-8 shadow-[0_22px_56px_rgba(21,38,43,0.12)]">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
            </div>
            <h2 className="font-syne font-bold text-[var(--ink)] text-xl text-center uppercase mb-6">
              Notificando membros do CRI...
            </h2>

            <div className="w-full h-2 bg-gray-700 mb-6">
              <div
                className="h-2 transition-all duration-700"
                style={{ width: `${progress}%`, background: progress === 100 ? '#22C55E' : '#DC2626' }}
              />
            </div>

            <div className="space-y-3">
              {membersState.map(m => (
                <div key={m.id} className={`flex items-center gap-3 ${m.state === 'pending' ? 'opacity-40' : 'opacity-100'} transition-opacity`}>
                  <div className={`w-2 h-2 rounded-full ${m.state === 'done' ? 'bg-green-500' :
                      m.state === 'sending' ? 'bg-amber-400 animate-pulse' :
                        'bg-gray-600'
                    }`} />
                  <span className="font-dm text-sm text-[var(--ink)] flex-1">{m.role}</span>
                  {m.state === 'sending' && <span className="font-mono text-xs text-amber-400">Enviando...</span>}
                  {m.state === 'done' && <span className="font-mono text-xs text-green-400 flex items-center gap-1"><Check size={11} /> Notificado</span>}
                  {m.state === 'pending' && <span className="font-mono text-xs text-white/45">Pendente</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STEP 3 */}
        {step === 3 && result && (
          <div className="rounded-[30px] border border-green-200 bg-[linear-gradient(135deg,rgba(245,255,245,0.98),rgba(235,250,238,0.96))] p-8 shadow-[0_28px_80px_rgba(52,130,73,0.14)]">
            <div className="flex justify-center mb-4">
              <ShieldCheck size={56} className="text-green-400 animate-bounce-in" />
            </div>
            <h2 className="font-syne font-extrabold text-green-950 text-2xl uppercase text-center mb-6">
              CRISE DECLARADA COM SUCESSO
            </h2>

            <div className="space-y-3 mb-6">
              <div className="rounded-[22px] bg-white/80 border border-green-100 p-4">
                <div className="font-mono text-xs text-green-400 mb-1">SALA TEAMS</div>
                <div className="font-mono text-xs text-[var(--ink-soft)] break-all">{result.teamsLink}</div>
                <div className="mt-1"><CopyButton text={result.teamsLink} /></div>
              </div>

              <div className="rounded-[22px] bg-white/80 border border-green-100 p-4">
                <div className="font-mono text-xs text-green-400 mb-1">HASH SHA-256 DE AUDITORIA</div>
                <div className="font-mono text-xs text-[var(--ink-soft)] break-all">{result.hash}</div>
                <div className="mt-1"><CopyButton text={result.hash} /></div>
              </div>

              <div className="rounded-[22px] bg-white/80 border border-green-100 p-4 font-mono text-xs text-[var(--ink-soft)] space-y-1">
                <div>5/5 membros notificados ✓</div>
                <div>Crisis ID: {result.crisisId}</div>
                <div>Sala Teams: criada ✓</div>
                <div>SLA: pausado ✓</div>
                <div>Timestamp: {new Date().toISOString()}</div>
              </div>
            </div>

            <button
              onClick={() => onConfirm(result)}
              className="w-full rounded-full bg-green-600 text-white font-syne font-bold py-3 hover:bg-green-500 transition-colors uppercase tracking-wide"
            >
              RETORNAR AO INCIDENTE
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ——— CLOSE MODAL ———
function CloseModal({ crisis, onClose, onConfirm, activities }) {
  const [step, setStep] = useState(1);
  const [checklist, setChecklist] = useState([]);
  const [motivo, setMotivo] = useState('');
  const [members, setMembers] = useState(CRI_MEMBERS.map(m => ({ ...m, present: false })));
  const [activityUpdates, setActivityUpdates] = useState([]);
  const elapsed = useCrisisTimer(crisis?.crisisTimestamp);

  // Pre-select active activities for update
  useEffect(() => {
    const active = (activities || []).filter(a => a.status === 'Em andamento' || a.status === 'Planejado');
    setActivityUpdates(active.map(a => ({ ...a, selected: false })));
  }, [activities]);

  const allChecked = checklist.length >= 1 && motivo.trim().length >= 20;
  const closeHelper = checklist.length >= 1 ? 'Ao menos um critério foi marcado.' : 'Marque pelo menos um critério para encerrar a War Room.';

  const toggle = (item) => {
    setChecklist(prev => prev.includes(item) ? prev.filter(c => c !== item) : [...prev, item]);
  };

  const toggleActivityUpdate = (id) => {
    setActivityUpdates(prev => prev.map(a => a.id === id ? { ...a, selected: !a.selected } : a));
  };

  const confirm = () => {
    const closeHash = generateHash();
    const selectedActivityIds = activityUpdates.filter(a => a.selected).map(a => a.id);
    onConfirm({ closeHash, motivo, members, elapsed, selectedActivityIds });
    setStep(2);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#15262b]/45" />
      <div className="relative w-full max-w-md">
        {step === 1 && (
          <div className="app-panel rounded-[30px] p-6 max-h-[90vh] overflow-y-auto shadow-[0_28px_80px_rgba(21,38,43,0.16)]">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-syne font-bold text-[var(--ink)] text-xl uppercase">Encerrar Crise</h2>
              <button onClick={onClose} className="text-[var(--ink-soft)] hover:text-[var(--ink)]"><X size={18} /></button>
            </div>

            <div className="space-y-2 mb-5">
              {CLOSE_CHECKLIST.map(item => (
                <label key={item} className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={checklist.includes(item)} onChange={() => toggle(item)} className="w-4 h-4" />
                  <span className={`font-dm text-sm ${checklist.includes(item) ? 'text-green-700 line-through' : 'text-[var(--ink)]'}`}>{item}</span>
                </label>
              ))}
            </div>

            <div className="mb-5">
              <label className="block font-mono text-xs text-[var(--ink-soft)] uppercase mb-2">
                Motivo / Resumo da Resolução * (mín. 50 chars)
              </label>
              <textarea
                value={motivo}
                onChange={e => setMotivo(e.target.value)}
                rows={4}
                className="w-full rounded-[22px] bg-white/80 text-[var(--ink)] border border-[rgba(21,38,43,0.12)] px-4 py-3 font-dm text-sm resize-none focus:outline-none focus:border-[var(--accent)]"
                placeholder="Descreva como a crise foi resolvida..."
              />
              <div className={`text-xs font-mono mt-1 ${motivo.length >= 50 ? 'text-green-400' : 'text-[var(--ink-soft)]'}`}>
                {motivo.length}/20 caracteres mínimos
              </div>
            </div>

            {/* INT-4: Activity update selection */}
            {activityUpdates.length > 0 && (
              <div className="mb-5">
                <label className="block font-mono text-xs text-[var(--ink-soft)] uppercase mb-2">
                  Atualizar status das atividades vinculadas? (marcar como Feito)
                </label>
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {activityUpdates.map(a => (
                    <label key={a.id} className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={a.selected} onChange={() => toggleActivityUpdate(a.id)} className="w-3.5 h-3.5" />
                      <span className={`font-dm text-xs ${a.selected ? 'text-green-700' : 'text-[var(--ink-soft)]'}`}>
                        #{a.id} {a.nome}
                        <span className="ml-1 font-mono text-[10px] text-[var(--ink-soft)]">({a.status})</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={confirm}
              disabled={!allChecked}
              className={`w-full font-syne font-bold py-3 uppercase tracking-wide transition-colors ${allChecked ? 'rounded-full bg-green-600 text-white hover:bg-green-500 cursor-pointer' : 'rounded-full bg-[rgba(21,38,43,0.12)] text-[var(--ink-soft)] cursor-not-allowed'
                }`}
            >
              CONFIRMAR ENCERRAMENTO
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="rounded-[30px] border border-green-200 bg-[linear-gradient(135deg,rgba(245,255,245,0.98),rgba(235,250,238,0.96))] p-8 text-center shadow-[0_28px_80px_rgba(52,130,73,0.14)]">
            <ShieldCheck size={56} className="text-green-400 mx-auto mb-4 animate-bounce-in" />
            <h2 className="font-syne font-extrabold text-green-950 text-2xl uppercase mb-2">CRISE ENCERRADA</h2>
            <div className="rounded-[22px] bg-white/80 border border-green-100 p-4 font-mono text-xs text-[var(--ink-soft)] text-left space-y-1 mb-6">
              <div>Duração: {elapsed}</div>
              <div>Membros presentes: {members.filter(m => m.present).length}/5</div>
              <div>Timestamp: {new Date().toISOString()}</div>
            </div>
            <button onClick={onClose} className="btn-lime w-full rounded-full font-syne text-sm uppercase tracking-wide">
              RETORNAR AO PMO →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ——— MAIN WAR ROOM PAGE ———
export default function WarRoom({ clientId: propClientId, isAdmin = false, adminClientName, onAdminBack }) {
  const { user } = useAuth();
  const effectiveClientId = propClientId || user?.clientId;

  const [crisis, setCrisis] = useState(null);
  const [info, setInfo] = useState({});
  const [showDeclareModal, setShowDeclareModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [members, setMembers] = useState(CRI_MEMBERS.map(m => ({ ...m, present: false })));
  const [actions, setActions] = useState(IMMEDIATE_ACTIONS.map(a => ({ ...a, done: false })));
  const [feedInput, setFeedInput] = useState('');
  const [feed, setFeed] = useState([]);
  const [jornadaActivities, setJornadaActivities] = useState([]);

  const elapsed = useCrisisTimer(crisis?.crisisTimestamp);
  const slaHours = info?.dataConhecimento ? calcSLAHours(info.dataConhecimento) : 0;

  useEffect(() => {
    const c = getStorage(KEYS.crisis(effectiveClientId, 'active'));
    setCrisis(c?.crisisActive === true && c?.crisisStatus !== 'closed' ? c : null);
    setInfo(getStorage(KEYS.info(effectiveClientId), {}));
    if (c?.feed) setFeed(c.feed);
    if (c?.members) setMembers(c.members);
    if (c?.immediateActions) setActions(c.immediateActions);
    setJornadaActivities(getStorage(KEYS.activities(effectiveClientId), []));
  }, [effectiveClientId]);

  const saveCrisis = (update) => {
    const updated = { ...crisis, ...update };
    setCrisis(updated);
    setStorage(KEYS.crisis(effectiveClientId, 'active'), updated);
  };

  const handleDeclareCrisis = (result) => {
    const crisisData = {
      crisisActive: true,
      crisisStatus: 'active',
      crisisId: result.crisisId,
      crisisTimestamp: new Date().toISOString(),
      crisisHash: result.hash,
      crisisTeamsLink: result.teamsLink,
      crisisMembers: CRI_MEMBERS,
      slaPausedAt: slaHours,
      feed: [{
        id: Date.now(),
        timestamp: new Date().toISOString(),
        text: 'CRISE DECLARADA — Comitê de Crise ativado. 5 membros do CRI notificados.',
        user: user?.email,
      }],
    };
    setStorage(KEYS.crisis(effectiveClientId, 'active'), crisisData);
    setCrisis(crisisData);
    setFeed(crisisData.feed);

    // Add to PMO timeline
    const pmoData = getStorage(KEYS.pmo(effectiveClientId), {});
    const timeline = pmoData.timeline || [];
    timeline.unshift({
      id: Date.now(),
      datetime: new Date().toISOString().slice(0, 16),
      fase: 'Contenção',
      evento: `CRISE DECLARADA — Comitê de Crise ativado. 5 membros do CRI notificados.`,
      fonte: user?.email || 'Sistema',
      evidencia: `Crisis ID: ${result.crisisId} | Hash: ${result.hash}`,
    });

    // Add immediate actions to PMO RACI
    const existingActions = pmoData.actions || [];
    const newActions = IMMEDIATE_ACTIONS.map(a => ({
      id: a.id,
      descricao: a.label,
      responsavel: '',
      area: a.id === 'A003' ? 'DPO' : a.id === 'A004' || a.id === 'A006' ? 'Jurídico' : a.id === 'A005' ? 'Comunicação' : 'TI',
      status: 'Aberto',
      prazo: '',
      prioridade: ['A001', 'A002', 'A003'].includes(a.id) ? 'Crítica' : 'Alta',
      observacoes: '',
    }));

    setStorage(KEYS.pmo(effectiveClientId), { ...pmoData, timeline, actions: [...existingActions, ...newActions] });

    // INT-4: Auto-update Jornada activities Planejado → Em andamento
    const currentActivities = getStorage(KEYS.activities(effectiveClientId), []);
    const updatedActivities = currentActivities.map(a =>
      a.status === 'Planejado' ? { ...a, status: 'Em andamento' } : a
    );
    setStorage(KEYS.activities(effectiveClientId), updatedActivities);
    setJornadaActivities(updatedActivities);

    // Add notification
    addNotification(effectiveClientId, {
      type: 'crisis',
      message: `CRISE DECLARADA — ${result.crisisId}`,
      link: '/pmo/warroom',
    });

    setShowDeclareModal(false);
  };

  const handleCloseCrisis = ({ closeHash, motivo, elapsed: dur, selectedActivityIds }) => {
    const closed = {
      ...crisis,
      crisisStatus: 'closed',
      crisisActive: false,
      crisisClosedAt: new Date().toISOString(),
      crisisCloseHash: closeHash,
      crisisDuration: dur,
      crisisResummo: motivo,
    };
    setStorage(KEYS.crisis(effectiveClientId, 'active'), closed);
    setCrisis(null);

    // PMO timeline
    const pmoData = getStorage(KEYS.pmo(effectiveClientId), {});
    const timeline = pmoData.timeline || [];
    timeline.unshift({
      id: Date.now(),
      datetime: new Date().toISOString().slice(0, 16),
      fase: 'Pós-Incidente',
      evento: `CRISE ENCERRADA — ${motivo}`,
      fonte: user?.email || 'Sistema',
      evidencia: `Hash: ${closeHash} | Duração: ${dur}`,
    });
    setStorage(KEYS.pmo(effectiveClientId), { ...pmoData, timeline });

    // INT-4: Update selected activities to Feito
    if (selectedActivityIds?.length > 0) {
      const currentActivities = getStorage(KEYS.activities(effectiveClientId), []);
      const updatedActivities = currentActivities.map(a =>
        selectedActivityIds.includes(a.id) ? { ...a, status: 'Feito' } : a
      );
      setStorage(KEYS.activities(effectiveClientId), updatedActivities);
      setJornadaActivities(updatedActivities);
    }

    setShowCloseModal(false);
  };

  const addFeedEntry = () => {
    if (!feedInput.trim()) return;
    const entry = { id: Date.now(), timestamp: new Date().toISOString(), text: feedInput, user: user?.email };
    const newFeed = [entry, ...feed];
    setFeed(newFeed);
    saveCrisis({ feed: newFeed });

    // Also add to PMO timeline
    const pmoData = getStorage(KEYS.pmo(effectiveClientId), {});
    const timeline = pmoData.timeline || [];
    timeline.unshift({
      id: Date.now(),
      datetime: new Date().toISOString().slice(0, 16),
      fase: 'Contenção',
      evento: feedInput,
      fonte: user?.email || 'War Room',
      evidencia: `Crisis ID: ${crisis?.crisisId}`,
    });
    setStorage(KEYS.pmo(effectiveClientId), { ...pmoData, timeline });
    setFeedInput('');
  };

  const toggleMember = (id) => {
    const updated = members.map(m => m.id === id ? { ...m, present: !m.present } : m);
    setMembers(updated);
    saveCrisis({ members: updated });
  };

  const toggleAction = (id) => {
    const updated = actions.map(a => a.id === id ? { ...a, done: !a.done } : a);
    setActions(updated);
    saveCrisis({ immediateActions: updated });
  };

  return (
    <Layout clientId={propClientId} isAdmin={isAdmin} adminClientName={adminClientName} onAdminBack={onAdminBack}>
      <div className="px-6 pb-8 pt-6 md:px-10 md:pt-10">
        {/* Crisis active banner */}
        {crisis && (
          <div className="mb-8 flex w-full items-center gap-3 rounded-[28px] border border-red-200 bg-red-50/90 px-6 py-4 text-red-800 shadow-[0_18px_34px_rgba(212,90,88,0.12)] animate-pulse-red">
            <Zap size={18} />
            <span className="font-syne font-bold uppercase text-sm">
              ⚡ WAR ROOM ATIVA — {crisis.crisisId} — Em crise desde: {new Date(crisis.crisisTimestamp).toLocaleString('pt-BR')} — {elapsed}
            </span>
          </div>
        )}

        <h1 className="font-syne font-extrabold text-[var(--ink)] text-4xl uppercase mb-2">
          WAR ROOM — Comitê de Crise
        </h1>

        {!crisis ? (
          /* NOT ACTIVE */
          <div className="flex flex-col items-center justify-center py-24">
            <Shield size={80} className="text-[var(--ink)] mb-6" />
            <h2 className="font-syne font-bold text-[var(--ink)] text-2xl uppercase mb-2">Nenhuma crise ativa</h2>
            <p className="text-[var(--ink-soft)] font-dm text-sm mb-8">Declare uma crise para ativar o Comitê de Resposta a Incidentes</p>
            <button
              onClick={() => setShowDeclareModal(true)}
              className="rounded-full bg-red-700 px-10 py-4 font-syne text-lg font-bold uppercase text-white transition-colors hover:bg-red-600 flex items-center gap-3"
            >
              <AlertOctagon size={22} />
              🚨 Declarar Crise
            </button>

            <div className="w-full max-w-2xl mt-16">
              <CrisisHistory clientId={effectiveClientId} />
            </div>
          </div>
        ) : (
          /* ACTIVE CRISIS */
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Left panel — 60% */}
            <div className="lg:col-span-3 space-y-5">
              {/* Teams Card */}
              <div className="app-panel rounded-[28px] p-5 shadow-[0_18px_36px_rgba(21,38,43,0.06)]">
                <h3 className="font-syne font-bold text-[var(--ink)] uppercase text-sm mb-3 flex items-center gap-2">
                  📹 Sala Virtual Teams
                </h3>
                <div className="bg-white/72 border border-[rgba(21,38,43,0.12)] px-4 py-3 font-mono text-xs text-[var(--ink-soft)] break-all mb-2">
                  {crisis.crisisTeamsLink}
                </div>
                <div className="flex gap-3">
                  <CopyButton text={crisis.crisisTeamsLink} />
                  <a href={crisis.crisisTeamsLink} target="_blank" rel="noopener noreferrer" className="font-mono text-xs text-blue-600 hover:underline">
                    Abrir Teams →
                  </a>
                </div>
              </div>

              {/* Hash Card */}
              <div className="app-panel rounded-[28px] p-5 shadow-[0_18px_36px_rgba(21,38,43,0.06)]">
                <h3 className="font-syne font-bold text-[var(--ink)] uppercase text-sm mb-3 flex items-center gap-2">
                  🔐 Hash de Auditoria SHA-256
                </h3>
                <div className="bg-white/72 border border-[rgba(21,38,43,0.12)] px-4 py-3 font-mono text-xs text-[var(--ink-soft)] break-all mb-2">
                  {crisis.crisisHash}
                </div>
                <CopyButton text={crisis.crisisHash} />
              </div>

              {/* CRI Members */}
              <div className="app-panel rounded-[28px] p-5 shadow-[0_18px_36px_rgba(21,38,43,0.06)]">
                <h3 className="font-syne font-bold text-[var(--ink)] uppercase text-sm mb-3 flex items-center gap-2">
                  <Users size={15} /> Membros do CRI
                </h3>
                <div className="space-y-2">
                  {members.map(m => (
                    <div key={m.id} className="flex items-center justify-between">
                      <div>
                        <span className="font-dm text-sm text-[var(--ink)]">{m.role}</span>
                        <span className="text-[var(--ink-soft)] font-dm text-xs ml-2">{m.name}</span>
                      </div>
                      <button
                        onClick={() => toggleMember(m.id)}
                        className={`rounded-full font-mono text-xs px-3 py-1 border transition-colors ${m.present
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : 'bg-white/72 text-[var(--ink-soft)] border-gray-200 hover:bg-white/70'
                          }`}
                      >
                        {m.present ? '✓ Presente' : 'Ausente'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Immediate Actions */}
              <div className="app-panel rounded-[28px] p-5 shadow-[0_18px_36px_rgba(21,38,43,0.06)]">
                <h3 className="font-syne font-bold text-[var(--ink)] uppercase text-sm mb-3">Ações Imediatas</h3>
                <div className="space-y-2">
                  {actions.map(a => (
                    <label key={a.id} className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" checked={a.done} onChange={() => toggleAction(a.id)} className="w-4 h-4" />
                      <span className="font-mono text-xs text-[var(--ink-soft)] shrink-0">{a.id}</span>
                      <span className={`font-dm text-sm ${a.done ? 'line-through text-[var(--ink-soft)]' : 'text-[var(--ink)]'}`}>{a.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Close button */}
              <button
                onClick={() => setShowCloseModal(true)}
                className="inline-flex items-center gap-2 rounded-full border border-[rgba(21,38,43,0.12)] bg-white/75 text-[var(--ink)] font-dm font-medium px-6 py-3 hover:bg-[var(--accent)] transition-colors"
              >
                <ShieldOff size={16} />
                Encerrar Crise
              </button>
            </div>

            {/* Right panel — feed — 40% */}
            <div className="lg:col-span-2">
              <div className="app-panel rounded-[28px] h-full flex flex-col overflow-hidden shadow-[0_18px_36px_rgba(21,38,43,0.06)]">
                <div className="soft-ribbon rounded-t-[24px] px-4 py-3">
                  <h3 className="font-syne font-bold text-[var(--ink)] text-sm uppercase">Feed da War Room</h3>
                </div>

                {/* Input */}
                <div className="p-3 border-b border-[rgba(21,38,43,0.12)] flex gap-2">
                  <input
                    type="text"
                    value={feedInput}
                    onChange={e => setFeedInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addFeedEntry()}
                    placeholder="Registrar atualização..."
                    className="flex-1 rounded-full border border-[rgba(21,38,43,0.12)] bg-white px-4 py-2 font-dm text-sm focus:outline-none focus:border-[var(--accent)]"
                  />
                  <button onClick={addFeedEntry} className="btn-primary px-4 py-2 rounded-full font-mono text-xs uppercase">
                    +
                  </button>
                </div>

                <div className="flex flex-wrap gap-2 border-b border-[rgba(21,38,43,0.12)] px-3 pb-3">
                  {quickFeedTemplates.map((item) => (
                    <button key={item} onClick={() => setFeedInput(item)} className="rounded-full border border-[rgba(21,38,43,0.08)] bg-white px-3 py-1.5 font-mono text-[10px] uppercase text-[var(--ink-soft)] hover:border-[rgba(183,236,35,0.34)] hover:bg-[rgba(214,255,99,0.12)] hover:text-[#6e8617]">
                      {item}
                    </button>
                  ))}
                </div>

                {/* Feed */}
                <div className="flex-1 overflow-y-auto divide-y divide-[rgba(21,38,43,0.08)]" style={{ maxHeight: '400px' }}>
                  {feed.length === 0 && (
                    <div className="p-6 text-center text-[var(--ink-soft)] font-dm text-sm">Nenhuma atualização</div>
                  )}
                  {feed.map(f => (
                    <div key={f.id} className="px-4 py-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Clock size={10} className="text-[var(--ink-soft)]" />
                        <span className="font-mono text-xs text-[var(--ink-soft)]">
                          {new Date(f.timestamp).toLocaleTimeString('pt-BR')}
                        </span>
                        <span className="font-mono text-xs text-[var(--ink-soft)] truncate">{f.user}</span>
                      </div>
                      <p className="font-dm text-sm text-[var(--ink)]">{f.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {showDeclareModal && (
        <DeclarationModal
          onClose={() => setShowDeclareModal(false)}
          onConfirm={handleDeclareCrisis}
          clientId={effectiveClientId}
          info={info}
        />
      )}

      {showCloseModal && (
        <CloseModal
          crisis={crisis}
          onClose={() => setShowCloseModal(false)}
          onConfirm={handleCloseCrisis}
          activities={jornadaActivities}
        />
      )}
    </Layout>
  );
}
