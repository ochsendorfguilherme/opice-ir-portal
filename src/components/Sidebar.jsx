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
  AlertOctagon,
  LogOut,
  Lock,
  CheckCircle,
  AlertTriangle,
  X,
  Users,
  MessageSquare,
  FileText,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getStorage, KEYS } from '../utils/storage';
import { useState, useEffect } from 'react';
import OpiceLogo from './OpiceLogo';

function StepIcon({ status }) {
  if (status === 'completed') return <CheckCircle size={12} className="text-green-400" />;
  if (status === 'ongoing') return <AlertTriangle size={12} className="text-amber-400" />;
  return <Lock size={12} className="text-gray-600" />;
}

export default function Sidebar({ clientId, isAdmin = false, adminClientName = null, onClose }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [crisisActive, setCrisisActive] = useState(false);
  const [pmoAlerts, setPmoAlerts] = useState(0);
  const [activeMeeting, setActiveMeeting] = useState(false);
  const [anpdNeedsSEI, setAnpdNeedsSEI] = useState(false);

  const effectiveClientId = clientId || user?.clientId;
  const basePath = isAdmin && clientId ? `/admin/cliente/${clientId}` : '';

  useEffect(() => {
    if (!effectiveClientId) return;
    const crisis = getStorage(KEYS.crisis(effectiveClientId, 'active'));
    setCrisisActive(crisis?.crisisActive === true && crisis?.crisisStatus !== 'closed');

    const pmoData = getStorage(KEYS.pmo(effectiveClientId), {});
    const actions = pmoData.actions || [];
    const now = new Date();
    const alerts = actions.filter(a => {
      const blocked = a.status === 'Bloqueado';
      const overdue = a.prazo && new Date(a.prazo) < now && a.status !== 'Feito';
      return blocked || overdue;
    }).length;
    setPmoAlerts(alerts);

    // Check for active meetings
    const meetings = getStorage(KEYS.meetings(effectiveClientId), []);
    setActiveMeeting(meetings.some(m => m.status === 'Em andamento'));

    // Check for ANPD process without SEI number
    const anpdData = getStorage(KEYS.anpd(effectiveClientId), {});
    const processo = anpdData.processo || {};
    const hasAnpdData = Object.keys(processo).length > 0;
    setAnpdNeedsSEI(hasAnpdData && !processo.numeroProcesso);
  }, [effectiveClientId, location.pathname]);

  const getOnboardingStatus = () => {
    if (!effectiveClientId) return { info: 'completed', perguntas: 'completed', jornada: 'completed' };
    const info = getStorage(KEYS.info(effectiveClientId));
    const answers = getStorage(KEYS.answers(effectiveClientId), {});
    const hasInfo = info?.nomeCliente && info?.dataIncidente && info?.dataConhecimento && info?.codigoCliente && info?.contexto?.length >= 30;
    const sectionsDone = [1, 2, 3, 4, 5].filter(sid => {
      const sAnswers = answers[sid] || {};
      return Object.values(sAnswers).some(v => v?.trim());
    }).length;
    return {
      info: hasInfo ? 'completed' : 'ongoing',
      perguntas: !hasInfo ? 'locked' : sectionsDone >= 1 ? (sectionsDone >= 5 ? 'completed' : 'ongoing') : 'ongoing',
      jornada: !hasInfo ? 'locked' : sectionsDone < 5 ? 'locked' : 'ongoing',
    };
  };

  const onb = isAdmin ? { info: 'completed', perguntas: 'completed', jornada: 'completed' } : getOnboardingStatus();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

  return (
    <aside className="w-64 min-h-screen bg-[#111111] flex flex-col fixed left-0 top-0 bottom-0 z-30">
      {/* Header */}
      <div className="px-5 py-5 border-b border-white/10">
        <div className="flex items-center justify-between">
          <OpiceLogo />
          {onClose && (
            <button onClick={onClose} className="text-gray-400 hover:text-white p-1">
              <X size={18} />
            </button>
          )}
        </div>
        {isAdmin && (
          <div className="mt-2">
            <span className="bg-[#CAFF00] text-[#111111] font-mono text-xs font-medium px-2 py-0.5">
              {adminClientName ? `ADMIN VIEW: ${adminClientName}` : 'PAINEL ADMIN'}
            </span>
          </div>
        )}
        <div className="mt-2 flex items-center gap-1.5">
          <Lock size={9} className="text-[#F59E0B]" />
          <span className="font-mono text-[10px] text-[#F59E0B]">TLP:AMBER+STRICT</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 overflow-y-auto">
        {!effectiveClientId && isAdmin ? (
          <div className="h-full flex flex-col items-center justify-center px-6 text-center">
            <Users size={40} className="text-gray-600 mb-4 opacity-50" />
            <p className="font-dm text-sm text-gray-400">
              Selecione um cliente no Painel Admin para navegar
            </p>
          </div>
        ) : (
          <>
            {/* Dashboard Group */}
            <div className="mb-6">
              <NavLink
                to={`${basePath}/dashboard`}
                onClick={onClose}
                className={({ isActive: active }) => `sidebar-link ${active || isActive(`${basePath}/dashboard`) ? 'active' : ''}`}
              >
                <BarChart2 size={16} />
                <span className="flex-1">Dashboard</span>
              </NavLink>
            </div>

            {/* Incident Info Group */}
            <div className="space-y-1 mb-6">
              <NavLink
                to={`${basePath}/informacoes`}
                onClick={onClose}
                className={({ isActive: active }) => `sidebar-link ${active ? 'active' : ''}`}
              >
                <Info size={16} />
                <span className="flex-1">Informações do Incidente</span>
                <StepIcon status={onb.info} />
              </NavLink>

              <NavLink
                to={`${basePath}/perguntas`}
                onClick={onClose}
                className={({ isActive: active }) => `sidebar-link ${active ? 'active' : ''}`}
              >
                <HelpCircle size={16} />
                <span className="flex-1">Perguntas</span>
                <StepIcon status={onb.perguntas} />
              </NavLink>

              <NavLink
                to={`${basePath}/jornada`}
                onClick={onClose}
                className={({ isActive: active }) => `sidebar-link ${active || isActive(`${basePath}/jornada`) ? 'active' : ''}`}
              >
                <ClipboardList size={16} />
                <span className="flex-1">Jornada do Incidente</span>
                <StepIcon status={onb.jornada} />
              </NavLink>
            </div>

            {/* Management Group */}
            <div className="space-y-1">
              <NavLink
                to={`${basePath}/reunioes`}
                onClick={onClose}
                className={({ isActive: active }) => `sidebar-link ${active || isActive(`${basePath}/reunioes`) ? 'active' : ''}`}
              >
                <BookOpen size={16} />
                <span className="flex-1">Reuniões</span>
                {activeMeeting && (
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" title="Reunião em andamento" />
                )}
              </NavLink>

              <NavLink
                to={`${basePath}/anpd`}
                end
                onClick={onClose}
                className={({ isActive: active }) => `sidebar-link ${active || isActive(`${basePath}/anpd`) ? 'active' : ''}`}
              >
                <Scale size={16} />
                <span className="flex-1">ANPD</span>
                {anpdNeedsSEI && (
                  <span className="font-mono text-[10px] bg-amber-500 text-white px-1.5 py-0.5">SEI</span>
                )}
              </NavLink>

              <NavLink
                to={`${basePath}/anpd/comunicacao-titulares`}
                onClick={onClose}
                className={({ isActive: active }) => `sidebar-link pl-10 ${active ? 'active' : ''}`}
              >
                <MessageSquare size={14} />
                <span className="flex-1 text-xs">Comunicação (Titulares)</span>
              </NavLink>

              <NavLink
                to={`${basePath}/anpd/registro-incidente`}
                onClick={onClose}
                className={({ isActive: active }) => `sidebar-link pl-10 ${active ? 'active' : ''}`}
              >
                <FileText size={14} />
                <span className="flex-1 text-xs">Registro (Art. 10)</span>
              </NavLink>

              <NavLink
                to={`${basePath}/pmo`}
                onClick={onClose}
                className={({ isActive: active }) => `sidebar-link ${active || isActive(`${basePath}/pmo`) ? 'active' : ''}`}
              >
                <Briefcase size={16} />
                <span className="flex-1">PMO</span>
                {pmoAlerts > 0 && (
                  <span className="bg-red-600 text-white text-xs font-mono px-1.5 py-0.5 min-w-[20px] text-center animate-pulse-red">
                    {pmoAlerts}
                  </span>
                )}
              </NavLink>

              <NavLink
                to={`${basePath}/pmo/warroom`}
                onClick={onClose}
                className={({ isActive: active }) =>
                  `sidebar-link pl-10 ${active ? 'active' : ''} ${crisisActive ? 'animate-pulse text-[#DC2626]' : 'text-[#DC2626]'}`
                }
              >
                <Siren size={14} color="#DC2626" />
                <span className="flex-1 text-xs font-bold">
                  WarRoom
                  {crisisActive && (
                    <span className="ml-1 font-mono text-[10px]">⚡ ATIVA</span>
                  )}
                </span>
              </NavLink>
            </div>
          </>
        )}
      </nav>

      {/* Footer */}
      <div className="border-t border-white/10 px-5 py-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 bg-[#CAFF00] flex items-center justify-center">
            <span className="font-syne font-bold text-[#111111] text-xs">
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-white text-xs font-dm truncate">{user?.email}</div>
            <div className="text-gray-500 text-[10px] font-mono uppercase">{user?.role}</div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 text-gray-400 hover:text-white text-xs font-dm py-1.5 transition-colors"
        >
          <LogOut size={13} />
          Sair
        </button>
      </div>
    </aside>
  );
}
