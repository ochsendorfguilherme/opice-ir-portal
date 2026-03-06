import { createElement } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useParams } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute, AdminRoute, OnboardingRoute, ChangePasswordRoute } from './components/ProtectedRoute';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Jornada from './pages/Jornada';
import Perguntas from './pages/Perguntas';
import Informacoes from './pages/Informacoes';
import PMO from './pages/PMO';
import WarRoom from './pages/WarRoom';
import Admin from './pages/Admin';
import AdminModulesHub from './pages/AdminModulesHub';
import AdminRiskModule from './pages/AdminRiskModule';
import AdminThirdPartyModule from './pages/AdminThirdPartyModule';
import AdminFinanceModule from './pages/AdminFinanceModule';
import AdminPrivacyModule from './pages/AdminPrivacyModule';
import AccessControl from './pages/AccessControl';
import ANPD from './pages/ANPD';
import ANPDComunicacaoTitulares from './pages/ANPDComunicacaoTitulares';
import ANPDRegistroIncidente from './pages/ANPDRegistroIncidente';
import ANPDFormularioCIS from './pages/ANPDFormularioCIS';
import Reunioes from './pages/Reunioes';
import ReuniaoDetalhe from './pages/ReuniaoDetalhe';
import MFAPage from './pages/MFAPage';
import ChangePassword from './pages/ChangePassword';

function AdminClientWrapper({ Page, pageProps = {} }) {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const clientName = (() => {
    try {
      const info = JSON.parse(localStorage.getItem(`opice_ir_info_${clientId}`) || '{}');
      return info.nomeCliente || clientId;
    } catch { return clientId; }
  })();
  return createElement(Page, {
    clientId,
    isAdmin: true,
    adminClientName: clientName,
    onAdminBack: () => navigate('/admin/modulos'),
    ...pageProps,
  });
}

function AdminClientPMO({ initialTab }) {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const clientName = (() => {
    try {
      const info = JSON.parse(localStorage.getItem(`opice_ir_info_${clientId}`) || '{}');
      return info.nomeCliente || clientId;
    } catch { return clientId; }
  })();
  return (
    <PMO clientId={clientId} isAdmin={true} adminClientName={clientName} onAdminBack={() => navigate('/admin/modulos')} initialTab={initialTab} />
  );
}

function AdminClientWarRoom() {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const clientName = (() => {
    try {
      const info = JSON.parse(localStorage.getItem(`opice_ir_info_${clientId}`) || '{}');
      return info.nomeCliente || clientId;
    } catch { return clientId; }
  })();
  return (
    <WarRoom clientId={clientId} isAdmin={true} adminClientName={clientName} onAdminBack={() => navigate('/admin/modulos')} />
  );
}

function AdminClientReuniaoDetalhe() {
  const { clientId, meetingId } = useParams();
  const navigate = useNavigate();
  const clientName = (() => {
    try {
      const info = JSON.parse(localStorage.getItem(`opice_ir_info_${clientId}`) || '{}');
      return info.nomeCliente || clientId;
    } catch { return clientId; }
  })();
  return (
    <ReuniaoDetalhe clientId={clientId} meetingId={meetingId} isAdmin={true} adminClientName={clientName} onAdminBack={() => navigate('/admin/modulos')} />
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/mfa" element={<MFAPage />} />
          <Route path="/change-password" element={<ChangePasswordRoute><ChangePassword /></ChangePasswordRoute>} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* Client routes */}
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/informacoes" element={<ProtectedRoute><Informacoes /></ProtectedRoute>} />
          <Route path="/perguntas" element={
            <ProtectedRoute><OnboardingRoute requireStep="perguntas"><Perguntas /></OnboardingRoute></ProtectedRoute>
          } />
          <Route path="/jornada" element={
            <ProtectedRoute><OnboardingRoute requireStep="jornada"><Jornada /></OnboardingRoute></ProtectedRoute>
          } />
          <Route path="/jornada/timeline" element={
            <ProtectedRoute><OnboardingRoute requireStep="jornada"><Jornada defaultView="timeline" /></OnboardingRoute></ProtectedRoute>
          } />
          <Route path="/pmo" element={<ProtectedRoute><PMO /></ProtectedRoute>} />
          <Route path="/pmo/resumo-c-level" element={<ProtectedRoute><PMO initialTab="clevel" /></ProtectedRoute>} />
          <Route path="/pmo/warroom" element={<ProtectedRoute><WarRoom /></ProtectedRoute>} />
          <Route path="/anpd" element={<ProtectedRoute><ANPD /></ProtectedRoute>} />
          <Route path="/anpd/comunicacao-titulares" element={<ProtectedRoute><ANPDComunicacaoTitulares /></ProtectedRoute>} />
          <Route path="/anpd/registro-incidente" element={<ProtectedRoute><ANPDRegistroIncidente /></ProtectedRoute>} />
          <Route path="/anpd/formulario-cis" element={<ProtectedRoute><ANPDFormularioCIS /></ProtectedRoute>} />
          <Route path="/reunioes" element={<ProtectedRoute><Reunioes /></ProtectedRoute>} />
          <Route path="/reunioes/:meetingId" element={<ProtectedRoute><ReuniaoDetalhe /></ProtectedRoute>} />

          {/* Admin */}
          <Route path="/admin/modulos" element={<AdminRoute><AdminModulesHub /></AdminRoute>} />
          <Route path="/admin/riscos" element={<AdminRoute><AdminRiskModule /></AdminRoute>} />
          <Route path="/admin/avaliacao-terceiro" element={<AdminRoute><AdminThirdPartyModule /></AdminRoute>} />
          <Route path="/admin/financeiro" element={<AdminRoute><AdminFinanceModule /></AdminRoute>} />
          <Route path="/admin/privacidade" element={<AdminRoute><AdminPrivacyModule /></AdminRoute>} />
          <Route path="/admin" element={<AdminRoute><Admin /></AdminRoute>} />
          <Route path="/admin/acessos" element={<AdminRoute><AccessControl /></AdminRoute>} />
          <Route path="/admin/cliente/:clientId/dashboard" element={<AdminRoute><AdminClientWrapper Page={Dashboard} /></AdminRoute>} />
          <Route path="/admin/cliente/:clientId/informacoes" element={<AdminRoute><AdminClientWrapper Page={Informacoes} /></AdminRoute>} />
          <Route path="/admin/cliente/:clientId/perguntas" element={<AdminRoute><AdminClientWrapper Page={Perguntas} /></AdminRoute>} />
          <Route path="/admin/cliente/:clientId/jornada" element={<AdminRoute><AdminClientWrapper Page={Jornada} /></AdminRoute>} />
          <Route path="/admin/cliente/:clientId/jornada/timeline" element={<AdminRoute><AdminClientWrapper Page={Jornada} pageProps={{ defaultView: 'timeline' }} /></AdminRoute>} />
          <Route path="/admin/cliente/:clientId/pmo" element={<AdminRoute><AdminClientPMO /></AdminRoute>} />
          <Route path="/admin/cliente/:clientId/pmo/resumo-c-level" element={<AdminRoute><AdminClientPMO initialTab="clevel" /></AdminRoute>} />
          <Route path="/admin/cliente/:clientId/pmo/warroom" element={<AdminRoute><AdminClientWarRoom /></AdminRoute>} />
          <Route path="/admin/cliente/:clientId/anpd" element={<AdminRoute><AdminClientWrapper Page={ANPD} /></AdminRoute>} />
          <Route path="/admin/cliente/:clientId/anpd/comunicacao-titulares" element={<AdminRoute><AdminClientWrapper Page={ANPDComunicacaoTitulares} /></AdminRoute>} />
          <Route path="/admin/cliente/:clientId/anpd/registro-incidente" element={<AdminRoute><AdminClientWrapper Page={ANPDRegistroIncidente} /></AdminRoute>} />
          <Route path="/admin/cliente/:clientId/anpd/formulario-cis" element={<AdminRoute><AdminClientWrapper Page={ANPDFormularioCIS} /></AdminRoute>} />
          <Route path="/admin/cliente/:clientId/reunioes" element={<AdminRoute><AdminClientWrapper Page={Reunioes} /></AdminRoute>} />
          <Route path="/admin/cliente/:clientId/reunioes/:meetingId" element={<AdminRoute><AdminClientReuniaoDetalhe /></AdminRoute>} />

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
