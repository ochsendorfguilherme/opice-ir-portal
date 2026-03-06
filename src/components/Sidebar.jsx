import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  BarChart2,
  ClipboardList,
  HelpCircle,
  Info,
  BookOpen,
  Scale,
  Briefcase,
  Siren,
  LogOut,
  Lock,
  CheckCircle,
  AlertTriangle,
  X,
  Users,
  MessageSquare,
  FileText,
  ClipboardCheck,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getStorage, KEYS, createInvite } from '../utils/storage';
import { useState, useEffect } from 'react';
import OpiceLogo from './OpiceLogo';
import InviteModal from './InviteModal';

function StepIcon({ status }) {
  if (status === 'completed') return <CheckCircle size={12} className="text-emerald-300" />;
  if (status === 'ongoing') return <AlertTriangle size={12} className="text-amber-300" />;
  return <Lock size={12} className="text-white/28" />;
}

export default function Sidebar({ clientId, isAdmin = false, adminClientName = null, onClose }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [crisisActive, setCrisisActive] = useState(false);
  const [pmoAlerts, setPmoAlerts] = useState(0);
  const [activeMeeting, setActiveMeeting] = useState(false);
  const [anpdNeedsSEI, setAnpdNeedsSEI] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const [toast, setToast] = useState(null);

  const effectiveClientId = clientId || user?.clientId;
  const basePath = isAdmin && clientId ? `/admin/cliente/${clientId}` : '';
  const isAdminStandalone = user?.role === 'admin' && !isAdmin && !effectiveClientId;

  useEffect(() => {
    if (!effectiveClientId) return;

    const crisis = getStorage(KEYS.crisis(effectiveClientId, 'active'));
    setCrisisActive(crisis?.crisisActive === true && crisis?.crisisStatus !== 'closed');

    const pmoData = getStorage(KEYS.pmo(effectiveClientId), {});
    const actions = pmoData.actions || [];
    const now = new Date();
    const alerts = actions.filter((action) => {
      const blocked = action.status === 'Bloqueado';
      const overdue = action.prazo && new Date(action.prazo) < now && action.status !== 'Feito';
      return blocked || overdue;
    }).length;
    setPmoAlerts(alerts);

    const meetings = getStorage(KEYS.meetings(effectiveClientId), []);
    setActiveMeeting(meetings.some((meeting) => meeting.status === 'Em andamento'));

    const anpdData = getStorage(KEYS.anpd(effectiveClientId), {});
    const processo = anpdData.processo || {};
    const hasAnpdData = Object.keys(processo).length > 0;
    setAnpdNeedsSEI(hasAnpdData && !processo.numeroProcesso);
  }, [effectiveClientId, location.pathname]);

  const getOnboardingStatus = () => {
    if (!effectiveClientId) return { info: 'completed', perguntas: 'completed', jornada: 'completed' };

    const info = getStorage(KEYS.info(effectiveClientId));
    const answers = getStorage(KEYS.answers(effectiveClientId), {});
    const hasInfo = info?.nomeCliente
      && info?.dataIncidente
      && info?.dataConhecimento
      && info?.codigoCliente
      && info?.contexto?.length >= 30;

    const sectionsDone = [1, 2, 3, 4, 5].filter((sectionId) => {
      const sectionAnswers = answers[sectionId] || {};
      return Object.values(sectionAnswers).some((value) => value?.trim());
    }).length;

    return {
      info: hasInfo ? 'completed' : 'ongoing',
      perguntas: !hasInfo ? 'locked' : sectionsDone >= 1 ? (sectionsDone >= 5 ? 'completed' : 'ongoing') : 'ongoing',
      jornada: !hasInfo ? 'locked' : sectionsDone < 5 ? 'locked' : 'ongoing',
    };
  };

  const onboarding = isAdmin ? { info: 'completed', perguntas: 'completed', jornada: 'completed' } : getOnboardingStatus();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleInviteSubmit = async (formData) => {
    setIsInviting(true);
    await new Promise((resolve) => setTimeout(resolve, 600));

    try {
      createInvite({
        ...formData,
        clientId: effectiveClientId,
        createdBy: user.email,
      });
      setShowInviteModal(false);
      setToast({ type: 'success', message: 'Convite enviado para aprovação!' });
      setTimeout(() => setToast(null), 3000);
    } catch {
      setToast({ type: 'error', message: 'Erro ao enviar convite.' });
      setTimeout(() => setToast(null), 3000);
    } finally {
      setIsInviting(false);
    }
  };

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(`${path}/`);

  return (
    <aside className="app-panel-dark fixed bottom-4 left-4 top-4 z-30 flex w-[16.5rem] flex-col overflow-hidden rounded-[32px]">
      <div className="border-b border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(214,255,99,0.12),transparent_36%)] px-5 pb-5 pt-6">
        <div className="flex items-center justify-between">
          <OpiceLogo />
          {onClose && (
            <button onClick={onClose} className="rounded-full bg-white/5 p-2 text-white/60 transition-colors hover:bg-white/10 hover:text-white">
              <X size={18} />
            </button>
          )}
        </div>

        {isAdmin && (
          <div className="mt-3">
            <span className="rounded-full bg-[#d6ff63] px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[#15262b]">
              {adminClientName ? `ADMIN VIEW: ${adminClientName}` : 'PAINEL ADMIN'}
            </span>
          </div>
        )}

        <div className="mt-4 flex items-center gap-2 rounded-full bg-white/6 px-3 py-2">
          <Lock size={10} className="text-[#f8d383]" />
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#f8d383]">TLP:AMBER+STRICT</span>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-3">
        {(!effectiveClientId && isAdmin) || isAdminStandalone ? (
          <div className="flex h-full flex-col items-center justify-center px-7 text-center">
            <Users size={42} className="mb-4 text-white/30" />
            <p className="text-sm text-white/60">Selecione um cliente no painel admin para navegar.</p>
            {isAdminStandalone && (
              <button
                onClick={() => navigate('/admin/modulos')}
                className="mt-4 rounded-full border border-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white/80 transition-colors hover:bg-white/6 hover:text-white"
              >
                Voltar aos m?dulos
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="mb-6">
              {user?.role === 'client' && (
                <div className="mb-4 px-5">
                  <button
                    onClick={() => setShowInviteModal(true)}
                    className="flex w-full items-center justify-center gap-2 rounded-[20px] bg-[linear-gradient(135deg,#ecffb0_0%,#d6ff63_48%,#b7ec23_100%)] py-3 text-sm font-bold text-[#15262b] shadow-[0_16px_34px_rgba(190,234,62,0.24)] transition-all hover:-translate-y-0.5"
                  >
                    <Users size={16} /> Chamar convidado
                  </button>
                </div>
              )}

              <NavLink
                to={`${basePath}/dashboard`}
                onClick={onClose}
                className={({ isActive: active }) => `sidebar-link ${active || isActive(`${basePath}/dashboard`) ? 'active' : ''}`}
              >
                <BarChart2 size={16} />
                <span className="flex-1">Dashboard</span>
              </NavLink>
            </div>

            <div className="mb-6 space-y-1">
              <NavLink to={`${basePath}/informacoes`} onClick={onClose} className={({ isActive: active }) => `sidebar-link ${active ? 'active' : ''}`}>
                <Info size={16} />
                <span className="flex-1">Informações do incidente</span>
                <StepIcon status={onboarding.info} />
              </NavLink>

              <NavLink to={`${basePath}/perguntas`} onClick={onClose} className={({ isActive: active }) => `sidebar-link ${active ? 'active' : ''}`}>
                <HelpCircle size={16} />
                <span className="flex-1">Perguntas</span>
                <StepIcon status={onboarding.perguntas} />
              </NavLink>

              <NavLink to={`${basePath}/jornada`} onClick={onClose} className={({ isActive: active }) => `sidebar-link ${active || isActive(`${basePath}/jornada`) ? 'active' : ''}`}>
                <ClipboardList size={16} />
                <span className="flex-1">Jornada do incidente</span>
                <StepIcon status={onboarding.jornada} />
              </NavLink>
            </div>

            <div className="space-y-1">
              <NavLink to={`${basePath}/reunioes`} onClick={onClose} className={({ isActive: active }) => `sidebar-link ${active || isActive(`${basePath}/reunioes`) ? 'active' : ''}`}>
                <BookOpen size={16} />
                <span className="flex-1">Reuniões</span>
                {activeMeeting && <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" title="Reunião em andamento" />}
              </NavLink>

              <NavLink to={`${basePath}/anpd`} end onClick={onClose} className={({ isActive: active }) => `sidebar-link ${active || isActive(`${basePath}/anpd`) ? 'active' : ''}`}>
                <Scale size={16} />
                <span className="flex-1">ANPD</span>
                {anpdNeedsSEI && <span className="rounded-full bg-amber-400 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-[#15262b]">SEI</span>}
              </NavLink>

              <NavLink to={`${basePath}/anpd/comunicacao-titulares`} onClick={onClose} className={({ isActive: active }) => `sidebar-link pl-10 ${active ? 'active' : ''}`}>
                <MessageSquare size={14} />
                <span className="flex-1 text-xs">Comunicação Titulares</span>
              </NavLink>

              <NavLink to={`${basePath}/anpd/registro-incidente`} onClick={onClose} className={({ isActive: active }) => `sidebar-link pl-10 ${active ? 'active' : ''}`}>
                <FileText size={14} />
                <span className="flex-1 text-xs">Registro do Incidente</span>
              </NavLink>

              <NavLink to={`${basePath}/anpd/formulario-cis`} onClick={onClose} className={({ isActive: active }) => `sidebar-link pl-10 ${active ? 'active' : ''}`}>
                <ClipboardCheck size={14} />
                <span className="flex-1 text-xs">Formulário CIS</span>
              </NavLink>

              <NavLink to={`${basePath}/pmo`} onClick={onClose} className={({ isActive: active }) => `sidebar-link ${active || isActive(`${basePath}/pmo`) ? 'active' : ''}`}>
                <Briefcase size={16} />
                <span className="flex-1">PMO</span>
                {pmoAlerts > 0 && (
                  <span className="min-w-[20px] rounded-full bg-red-600 px-1.5 py-0.5 text-center font-mono text-xs text-white animate-pulse-red">
                    {pmoAlerts}
                  </span>
                )}
              </NavLink>

              <NavLink
                to={`${basePath}/pmo/resumo-c-level`}
                onClick={onClose}
                className={({ isActive: active }) => `sidebar-link pl-10 ${active ? 'active' : ''}`}
              >
                <ClipboardCheck size={14} />
                <span className="flex-1 text-xs">Resumo C-Level</span>
              </NavLink>

              <NavLink
                to={`${basePath}/pmo/warroom`}
                onClick={onClose}
                className={({ isActive: active }) => `sidebar-link pl-10 ${active ? 'active' : ''} text-[#ff8d8b]`}
              >
                <Siren size={14} />
                <span className="flex-1 text-xs font-bold">
                  War Room
                  {crisisActive && <span className="ml-1 font-mono text-[10px] uppercase tracking-[0.16em]">ativa</span>}
                </span>
              </NavLink>
            </div>
          </>
        )}
      </nav>

      <div className="border-t border-white/10 bg-black/10 px-5 py-5 backdrop-blur-sm">
        <div className="mb-3 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#d6ff63] shadow-[0_10px_20px_rgba(190,234,62,0.2)]">
            <span className="font-syne text-xs font-bold text-[#111111]">{user?.name?.[0]?.toUpperCase() || 'U'}</span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm text-[#fffdf8]">{user?.email}</div>
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/48">{user?.role}</div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-2 rounded-full border border-white/10 px-3 py-2 text-xs font-semibold text-white/72 transition-colors hover:bg-white/6 hover:text-white"
        >
          <LogOut size={13} />
          Sair
        </button>
      </div>

      {toast && (
        <div className="pointer-events-none fixed left-1/2 top-8 z-[100] -translate-x-1/2 animate-in slide-in-from-top-4 fade-in duration-300">
          <div className={`flex items-center gap-3 rounded-full border px-5 py-3 shadow-[0_18px_36px_rgba(21,38,43,0.18)] ${toast.type === 'success' ? 'bg-[linear-gradient(135deg,#ecffb0_0%,#d6ff63_48%,#b7ec23_100%)] border-[#d6ff63] text-[#15262b]' : 'bg-[#d45a58] border-[#d45a58] text-white'}`}>
            {toast.type === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
            <span className="text-sm font-medium">{toast.message}</span>
          </div>
        </div>
      )}

      <InviteModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onInvite={handleInviteSubmit}
        isLoading={isInviting}
      />
    </aside>
  );
}
