import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getStorage, KEYS } from '../utils/storage';
import BlockedModal from './BlockedModal';
import { useState } from 'react';

export function ProtectedRoute({ children }) {
  const { user, authStep } = useAuth();
  const location = useLocation();

  if (authStep === 'MFA_REQUIRED') return <Navigate to="/mfa" state={{ from: location }} replace />;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;

  return children;
}

export function AdminRoute({ children }) {
  const { user, authStep } = useAuth();
  const location = useLocation();

  if (authStep === 'MFA_REQUIRED') return <Navigate to="/mfa" state={{ from: location }} replace />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'admin') return <Navigate to="/dashboard" replace />;

  return children;
}

export function OnboardingRoute({ children, requireStep }) {
  const { user } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const location = useLocation();

  if (!user) return <Navigate to="/login" replace />;

  if (user.role === 'admin') return children;

  const clientId = user.clientId;
  const info = getStorage(KEYS.info(clientId));
  const answers = getStorage(KEYS.answers(clientId), {});

  const hasInfo = info?.nomeCliente && info?.dataIncidente && info?.dataConhecimento && info?.codigoCliente && info?.contexto?.length >= 30;
  const sectionsStarted = [1, 2, 3, 4, 5].filter(sid => {
    const sAnswers = answers[sid] || {};
    return Object.values(sAnswers).some(v => v?.trim());
  }).length;

  if (requireStep === 'perguntas' && !hasInfo) {
    return (
      <BlockedModal
        message="Você precisa preencher as Informações do Incidente antes de acessar as Perguntas."
        redirectTo="/informacoes"
      />
    );
  }

  if (requireStep === 'jornada' && !hasInfo) {
    return (
      <BlockedModal
        message="Você precisa preencher as Informações do Incidente antes de acessar a Jornada."
        redirectTo="/informacoes"
      />
    );
  }

  if (requireStep === 'jornada' && sectionsStarted < 5) {
    return (
      <BlockedModal
        message="Você precisa responder pelo menos 1 pergunta em cada seção das Perguntas do Incidente antes de acessar a Jornada."
        redirectTo="/perguntas"
      />
    );
  }

  return children;
}
