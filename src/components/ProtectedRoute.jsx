import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getStorage, KEYS } from '../utils/storage';
import BlockedModal from './BlockedModal';
import SupportDock from './SupportDock';

function AuthGateLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#fbf8ef_0%,#f5f1e8_100%)] px-6">
      <div className="page-hero-card max-w-md px-8 py-8 text-center">
        <p className="section-kicker">Segurança</p>
        <h2 className="mt-2 text-xl font-bold text-[#15262b]">Validando sessão</h2>
      </div>
    </div>
  );
}

export function ProtectedRoute({ children }) {
  const { user, authStep } = useAuth();
  const location = useLocation();

  if (authStep === 'LOADING') return <AuthGateLoader />;
  if (authStep === 'MFA_REQUIRED') return <Navigate to="/mfa" state={{ from: location }} replace />;
  if (authStep === 'FORCE_PASSWORD_CHANGE') return <Navigate to="/change-password" state={{ from: location }} replace />;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;

  return (
    <>
      {children}
      <SupportDock />
    </>
  );
}

export function AdminRoute({ children }) {
  const { user, authStep } = useAuth();
  const location = useLocation();

  if (authStep === 'LOADING') return <AuthGateLoader />;
  if (authStep === 'MFA_REQUIRED') return <Navigate to="/mfa" state={{ from: location }} replace />;
  if (authStep === 'FORCE_PASSWORD_CHANGE') return <Navigate to="/change-password" state={{ from: location }} replace />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'admin') return <Navigate to="/dashboard" replace />;

  return (
    <>
      {children}
      <SupportDock />
    </>
  );
}

export function ChangePasswordRoute({ children }) {
  const { authStep } = useAuth();
  if (authStep === 'LOADING') return <AuthGateLoader />;
  if (authStep !== 'FORCE_PASSWORD_CHANGE') return <Navigate to="/login" replace />;
  return children;
}

export function OnboardingRoute({ children, requireStep }) {
  const { user, authStep } = useAuth();

  if (authStep === 'LOADING') return <AuthGateLoader />;
  if (!user) return <Navigate to="/login" replace />;

  if (user.role === 'admin') return children;

  const clientId = user.clientId;
  const info = getStorage(KEYS.info(clientId));
  const answers = getStorage(KEYS.answers(clientId), {});

  const hasInfo = info?.nomeCliente && info?.dataIncidente && info?.dataConhecimento && info?.codigoCliente && info?.contexto?.length >= 30;
  const sectionsStarted = [1, 2, 3, 4, 5].filter((sid) => {
    const sAnswers = answers[sid] || {};
    return Object.values(sAnswers).some((value) => value?.trim());
  }).length;

  if (requireStep === 'perguntas' && !hasInfo) {
    return (
      <BlockedModal
        message={"Você precisa preencher as Informações do Incidente antes de acessar as Perguntas."}
        redirectTo="/informacoes"
      />
    );
  }

  if (requireStep === 'jornada' && !hasInfo) {
    return (
      <BlockedModal
        message={"Você precisa responder pelo menos 1 pergunta em cada seção das Perguntas do Incidente antes de acessar a Jornada."}
        redirectTo="/informacoes"
      />
    );
  }

  if (requireStep === 'jornada' && sectionsStarted < 5) {
    return (
      <BlockedModal
        message={"Você precisa preencher as Informações do Incidente antes de acessar a Jornada."}
        redirectTo="/perguntas"
      />
    );
  }

  return children;
}
