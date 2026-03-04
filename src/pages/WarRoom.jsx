import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
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
      className="flex items-center gap-1 text-xs font-mono text-[#555555] hover:text-[#111111] transition-colors"
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

  // Step 2: simulate sequential notification
  const runNotification = () => {
    setStep(2);
    let idx = 0;
    const next = () => {
      if (idx >= CRI_MEMBERS.length) {
        setTimeout(() => {
          const hash = generateHash();
          const crisisId = `CRISIS-${clientId}-${generateId('').slice(0,6)}`;
          const teamsLink = `https://teams.microsoft.com/l/meetup-join/crisis-${hash.slice(0,6)}`;
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
      <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(0,0,0,0.9), rgba(80,0,0,0.5))' }} />
      <div className="relative w-full max-w-lg">

        {/* STEP 1 */}
        {step === 1 && (
          <div style={{ background: 'linear-gradient(135deg, #1a0000, #3d0000, #1a0000)' }} className="border border-red-800 p-8">
            <div className="flex justify-center mb-6">
              <AlertOctagon size={56} className="text-red-400 animate-siren" />
            </div>
            <h2 className="font-syne font-extrabold text-white text-3xl uppercase text-center mb-2">
              DECLARAR ESTADO DE CRISE
            </h2>
            <p className="text-red-300 font-mono text-xs text-center mb-6">
              Esta ação ativará o Comitê de Resposta a Incidentes imediatamente
            </p>

            <div className="space-y-2 mb-6">
              {[
                '✉ E-mail de convocação aos 5 membros do CRI',
                '📹 Link de sala virtual Microsoft Teams gerado',
                '🔐 Hash SHA-256 de auditoria registrado',
                '🏷 Badge WARROOM ATIVA aplicado ao incidente',
                '📋 Log inserido na Timeline Mestre',
                '⏱ SLA pausado e marcado como "Crise Declarada"',
              ].map((item, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 text-gray-200 font-dm text-sm animate-fade-in-left"
                  style={{ animationDelay: `${i * 100}ms`, animationFillMode: 'both' }}
                >
                  <span>{item}</span>
                </div>
              ))}
            </div>

            <div className="bg-black/40 border border-red-900 p-3 mb-6 font-mono text-xs text-gray-300 space-y-1">
              <div>Cliente: {info?.nomeCliente || clientId}</div>
              <div>SLA Atual: {formatSLALabel(slaHours)}</div>
              <div>Status: Em crise</div>
            </div>

            <div className="flex gap-3">
              <button onClick={onClose} className="flex-1 border border-gray-600 text-gray-300 font-dm py-3 hover:bg-white/5 transition-colors text-sm">
                Cancelar
              </button>
              <button
                onClick={runNotification}
                className="flex-1 bg-red-700 text-white font-syne font-bold py-3 hover:bg-red-600 transition-colors text-sm uppercase tracking-wide"
              >
                CONFIRMAR DECLARAÇÃO
              </button>
            </div>
          </div>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <div className="bg-[#111111] border border-gray-700 p-8">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
            </div>
            <h2 className="font-syne font-bold text-white text-xl text-center uppercase mb-6">
              Notificando Membros do CRI...
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
                  <div className={`w-2 h-2 rounded-full ${
                    m.state === 'done' ? 'bg-green-500' :
                    m.state === 'sending' ? 'bg-amber-400 animate-pulse' :
                    'bg-gray-600'
                  }`} />
                  <span className="font-dm text-sm text-gray-200 flex-1">{m.role}</span>
                  {m.state === 'sending' && <span className="font-mono text-xs text-amber-400">Enviando...</span>}
                  {m.state === 'done' && <span className="font-mono text-xs text-green-400 flex items-center gap-1"><Check size={11} /> Notificado</span>}
                  {m.state === 'pending' && <span className="font-mono text-xs text-gray-600">Pendente</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STEP 3 */}
        {step === 3 && result && (
          <div style={{ background: 'linear-gradient(135deg, #001a00, #003d00, #001a00)' }} className="border border-green-800 p-8">
            <div className="flex justify-center mb-4">
              <ShieldCheck size={56} className="text-green-400 animate-bounce-in" />
            </div>
            <h2 className="font-syne font-extrabold text-white text-2xl uppercase text-center mb-6">
              CRISE DECLARADA COM SUCESSO
            </h2>

            <div className="space-y-3 mb-6">
              <div className="bg-black/40 border border-green-900 p-3">
                <div className="font-mono text-xs text-green-400 mb-1">SALA TEAMS</div>
                <div className="font-mono text-xs text-gray-300 break-all">{result.teamsLink}</div>
                <div className="mt-1"><CopyButton text={result.teamsLink} /></div>
              </div>

              <div className="bg-black/40 border border-green-900 p-3">
                <div className="font-mono text-xs text-green-400 mb-1">HASH SHA-256 DE AUDITORIA</div>
                <div className="font-mono text-xs text-gray-300 break-all">{result.hash}</div>
                <div className="mt-1"><CopyButton text={result.hash} /></div>
              </div>

              <div className="bg-black/40 border border-green-900 p-3 font-mono text-xs text-gray-300 space-y-1">
                <div>5/5 membros notificados ✓</div>
                <div>Crisis ID: {result.crisisId}</div>
                <div>Sala Teams: criada ✓</div>
                <div>SLA: pausado ✓</div>
                <div>Timestamp: {new Date().toISOString()}</div>
              </div>
            </div>

            <button
              onClick={() => onConfirm(result)}
              className="w-full bg-green-600 text-white font-syne font-bold py-3 hover:bg-green-500 transition-colors uppercase tracking-wide"
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
function CloseModal({ crisis, slaHours, onClose, onConfirm, user, activities }) {
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

  const allChecked = checklist.length === CLOSE_CHECKLIST.length && motivo.trim().length >= 50;

  const toggle = (item) => {
    setChecklist(prev => prev.includes(item) ? prev.filter(c => c !== item) : [...prev, item]);
  };

  const toggleMember = (id) => {
    setMembers(prev => prev.map(m => m.id === id ? { ...m, present: !m.present } : m));
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
      <div className="absolute inset-0 bg-black/80" />
      <div className="relative w-full max-w-md">
        {step === 1 && (
          <div style={{ background: 'linear-gradient(135deg, #0a0a1a, #1a1a2e)' }} className="border border-gray-700 p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-syne font-bold text-white text-xl uppercase">Encerrar Crise</h2>
              <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={18} /></button>
            </div>

            <div className="space-y-2 mb-5">
              {CLOSE_CHECKLIST.map(item => (
                <label key={item} className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={checklist.includes(item)} onChange={() => toggle(item)} className="w-4 h-4" />
                  <span className={`font-dm text-sm ${checklist.includes(item) ? 'text-green-300 line-through' : 'text-gray-200'}`}>{item}</span>
                </label>
              ))}
            </div>

            <div className="mb-5">
              <label className="block font-mono text-xs text-gray-400 uppercase mb-2">
                Motivo / Resumo da Resolução * (mín. 50 chars)
              </label>
              <textarea
                value={motivo}
                onChange={e => setMotivo(e.target.value)}
                rows={4}
                className="w-full bg-gray-800 text-white border border-gray-600 px-3 py-2 font-dm text-sm resize-none focus:outline-none"
                placeholder="Descreva como a crise foi resolvida..."
              />
              <div className={`text-xs font-mono mt-1 ${motivo.length >= 50 ? 'text-green-400' : 'text-gray-500'}`}>
                {motivo.length}/50 caracteres mínimos
              </div>
            </div>

            {/* INT-4: Activity update selection */}
            {activityUpdates.length > 0 && (
              <div className="mb-5">
                <label className="block font-mono text-xs text-gray-400 uppercase mb-2">
                  Atualizar status das atividades vinculadas? (marcar como Feito)
                </label>
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {activityUpdates.map(a => (
                    <label key={a.id} className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={a.selected} onChange={() => toggleActivityUpdate(a.id)} className="w-3.5 h-3.5" />
                      <span className={`font-dm text-xs ${a.selected ? 'text-green-300' : 'text-gray-400'}`}>
                        #{a.id} {a.nome}
                        <span className="ml-1 font-mono text-[10px] text-gray-500">({a.status})</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={confirm}
              disabled={!allChecked}
              className={`w-full font-syne font-bold py-3 uppercase tracking-wide transition-colors ${
                allChecked ? 'bg-green-600 text-white hover:bg-green-500 cursor-pointer' : 'bg-gray-700 text-gray-500 cursor-not-allowed'
              }`}
            >
              CONFIRMAR ENCERRAMENTO
            </button>
          </div>
        )}

        {step === 2 && (
          <div style={{ background: 'linear-gradient(135deg, #001a00, #003d00, #001a00)' }} className="border border-green-800 p-8 text-center">
            <ShieldCheck size={56} className="text-green-400 mx-auto mb-4 animate-bounce-in" />
            <h2 className="font-syne font-extrabold text-white text-2xl uppercase mb-2">CRISE ENCERRADA</h2>
            <div className="bg-black/40 border border-green-900 p-4 font-mono text-xs text-gray-300 text-left space-y-1 mb-6">
              <div>Duração: {elapsed}</div>
              <div>Membros presentes: {members.filter(m => m.present).length}/5</div>
              <div>Timestamp: {new Date().toISOString()}</div>
            </div>
            <button onClick={onClose} className="w-full bg-[#CAFF00] text-[#111111] font-syne font-bold py-3 uppercase tracking-wide hover:bg-[#b8e600]">
              RETORNAR AO PMO →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ——— MAIN WARROOM PAGE ———
export default function WarRoom({ clientId: propClientId, isAdmin = false, adminClientName, onAdminBack }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const effectiveClientId = propClientId || user?.clientId;

  const [crisis, setCrisis] = useState(null);
  const [info, setInfo] = useState({});
  const [showDeclareModal, setShowDeclareModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [members, setMembers] = useState(CRI_MEMBERS.map(m => ({ ...m, present: false })));
  const [actions, setActions] = useState(IMMEDIATE_ACTIONS.map(a => ({ ...a, done: false })));
  const [feedInput, setFeedInput] = useState('');
  const [feed, setFeed] = useState([]);
  const [copiedTeams, setCopiedTeams] = useState(false);
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
      prioridade: ['A001','A002','A003'].includes(a.id) ? 'Crítica' : 'Alta',
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

  const handleCloseCrisis = ({ closeHash, motivo, members: finalMembers, elapsed: dur, selectedActivityIds }) => {
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
      fonte: user?.email || 'WarRoom',
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
      <div className="p-6 md:p-10">
        {/* Crisis active banner */}
        {crisis && (
          <div className="bg-red-600 text-white px-6 py-3 mb-6 flex items-center gap-3 w-full -mx-6 md:-mx-10 mt-[-40px] mb-8 px-10 animate-pulse-red">
            <Zap size={18} />
            <span className="font-syne font-bold uppercase text-sm">
              ⚡ WARROOM ATIVA — {crisis.crisisId} — Em crise desde: {new Date(crisis.crisisTimestamp).toLocaleString('pt-BR')} — {elapsed}
            </span>
          </div>
        )}

        <h1 className="font-syne font-extrabold text-[#111111] text-4xl uppercase mb-2">
          WARROOM — Comitê de Crise
        </h1>

        {!crisis ? (
          /* NOT ACTIVE */
          <div className="flex flex-col items-center justify-center py-24">
            <Shield size={80} className="text-gray-200 mb-6" />
            <h2 className="font-syne font-bold text-[#111111] text-2xl uppercase mb-2">Nenhuma Crise Ativa</h2>
            <p className="text-[#555555] font-dm text-sm mb-8">Declare uma crise para ativar o Comitê de Resposta a Incidentes</p>
            <button
              onClick={() => setShowDeclareModal(true)}
              className="bg-red-700 text-white font-syne font-bold px-10 py-4 uppercase text-lg hover:bg-red-600 transition-colors flex items-center gap-3"
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
              <div className="border border-[#E0E0E0] p-5">
                <h3 className="font-syne font-bold text-[#111111] uppercase text-sm mb-3 flex items-center gap-2">
                  📹 Sala Virtual Teams
                </h3>
                <div className="bg-gray-50 border border-[#E0E0E0] px-4 py-3 font-mono text-xs text-[#555555] break-all mb-2">
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
              <div className="border border-[#E0E0E0] p-5">
                <h3 className="font-syne font-bold text-[#111111] uppercase text-sm mb-3 flex items-center gap-2">
                  🔐 Hash de Auditoria SHA-256
                </h3>
                <div className="bg-gray-50 border border-[#E0E0E0] px-4 py-3 font-mono text-xs text-[#555555] break-all mb-2">
                  {crisis.crisisHash}
                </div>
                <CopyButton text={crisis.crisisHash} />
              </div>

              {/* CRI Members */}
              <div className="border border-[#E0E0E0] p-5">
                <h3 className="font-syne font-bold text-[#111111] uppercase text-sm mb-3 flex items-center gap-2">
                  <Users size={15} /> Membros do CRI
                </h3>
                <div className="space-y-2">
                  {members.map(m => (
                    <div key={m.id} className="flex items-center justify-between">
                      <div>
                        <span className="font-dm text-sm text-[#111111]">{m.role}</span>
                        <span className="text-gray-400 font-dm text-xs ml-2">{m.name}</span>
                      </div>
                      <button
                        onClick={() => toggleMember(m.id)}
                        className={`font-mono text-xs px-3 py-1 border transition-colors ${
                          m.present
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        {m.present ? '✓ Presente' : 'Ausente'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Immediate Actions */}
              <div className="border border-[#E0E0E0] p-5">
                <h3 className="font-syne font-bold text-[#111111] uppercase text-sm mb-3">Ações Imediatas</h3>
                <div className="space-y-2">
                  {actions.map(a => (
                    <label key={a.id} className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" checked={a.done} onChange={() => toggleAction(a.id)} className="w-4 h-4" />
                      <span className="font-mono text-xs text-gray-500 shrink-0">{a.id}</span>
                      <span className={`font-dm text-sm ${a.done ? 'line-through text-gray-400' : 'text-[#111111]'}`}>{a.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Close button */}
              <button
                onClick={() => setShowCloseModal(true)}
                className="flex items-center gap-2 border border-[#111111] text-[#111111] font-dm font-medium px-6 py-3 hover:bg-[#CAFF00] transition-colors"
              >
                <ShieldOff size={16} />
                Encerrar Crise
              </button>
            </div>

            {/* Right panel — feed — 40% */}
            <div className="lg:col-span-2">
              <div className="border border-[#E0E0E0] h-full flex flex-col">
                <div className="bg-[#111111] px-4 py-3">
                  <h3 className="font-syne font-bold text-white text-sm uppercase">Feed da WarRoom</h3>
                </div>

                {/* Input */}
                <div className="p-3 border-b border-[#E0E0E0] flex gap-2">
                  <input
                    type="text"
                    value={feedInput}
                    onChange={e => setFeedInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addFeedEntry()}
                    placeholder="Registrar atualização..."
                    className="flex-1 border border-[#E0E0E0] px-3 py-2 font-dm text-sm focus:outline-none focus:border-[#111111]"
                  />
                  <button onClick={addFeedEntry} className="bg-[#111111] text-white px-4 font-mono text-xs hover:bg-[#333] transition-colors">
                    +
                  </button>
                </div>

                {/* Feed */}
                <div className="flex-1 overflow-y-auto divide-y divide-[#E0E0E0]" style={{ maxHeight: '400px' }}>
                  {feed.length === 0 && (
                    <div className="p-6 text-center text-gray-400 font-dm text-sm">Nenhuma atualização</div>
                  )}
                  {feed.map(f => (
                    <div key={f.id} className="px-4 py-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Clock size={10} className="text-gray-400" />
                        <span className="font-mono text-xs text-[#555555]">
                          {new Date(f.timestamp).toLocaleTimeString('pt-BR')}
                        </span>
                        <span className="font-mono text-xs text-gray-400 truncate">{f.user}</span>
                      </div>
                      <p className="font-dm text-sm text-[#111111]">{f.text}</p>
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
          slaHours={slaHours}
          onClose={() => setShowCloseModal(false)}
          onConfirm={handleCloseCrisis}
          user={user}
          activities={jornadaActivities}
        />
      )}
    </Layout>
  );
}
