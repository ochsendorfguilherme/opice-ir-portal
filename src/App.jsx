import { Suspense, createElement, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useParams } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ProtectedRoute, AdminRoute, OnboardingRoute, ChangePasswordRoute } from './components/ProtectedRoute';

const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Jornada = lazy(() => import('./pages/Jornada'));
const Perguntas = lazy(() => import('./pages/Perguntas'));
const Informacoes = lazy(() => import('./pages/Informacoes'));
const PMO = lazy(() => import('./pages/PMO'));
const WarRoom = lazy(() => import('./pages/WarRoom'));
const Admin = lazy(() => import('./pages/Admin'));
const AdminModulesHub = lazy(() => import('./pages/AdminModulesHub'));
const AdminRiskModule = lazy(() => import('./pages/AdminRiskModule'));
const AdminThirdPartyModule = lazy(() => import('./pages/AdminThirdPartyModule'));
const AdminFinanceModule = lazy(() => import('./pages/AdminFinanceModule'));
const AdminPrivacyModule = lazy(() => import('./pages/AdminPrivacyModule'));
const AdminForensicsModule = lazy(() => import('./pages/AdminForensicsModule'));
const AdminSupportCenter = lazy(() => import('./pages/AdminSupportCenter'));
const AccessControl = lazy(() => import('./pages/AccessControl'));
const ANPD = lazy(() => import('./pages/ANPD'));
const ANPDComunicacaoTitulares = lazy(() => import('./pages/ANPDComunicacaoTitulares'));
const ANPDRegistroIncidente = lazy(() => import('./pages/ANPDRegistroIncidente'));
const ANPDFormularioCIS = lazy(() => import('./pages/ANPDFormularioCIS'));
const Reunioes = lazy(() => import('./pages/Reunioes'));
const ReuniaoDetalhe = lazy(() => import('./pages/ReuniaoDetalhe'));
const MFAPage = lazy(() => import('./pages/MFAPage'));
const ChangePassword = lazy(() => import('./pages/ChangePassword'));

function RouteLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#fbf8ef_0%,#f5f1e8_100%)] px-6">
      <div className="page-hero-card flex w-full max-w-md flex-col items-center gap-4 px-8 py-10 text-center">
        <div className="h-12 w-12 animate-pulse rounded-full bg-[linear-gradient(135deg,#173038_0%,#2a4b54_100%)] shadow-[0_16px_34px_rgba(21,38,43,0.14)]" />
        <div>
          <p className="section-kicker">{"Carregando m\u00f3dulo"}</p>
          <h2 className="mt-2 text-2xl font-bold text-[#15262b]">Preparando interface</h2>
          <p className="mt-2 text-sm text-[#5a686d]">{"Organizando a tela antes de abrir o conte\u00fado solicitado."}</p>
        </div>
      </div>
    </div>
  );
}

function RootRedirect() {
  const { user, authStep } = useAuth();

  if (authStep === 'LOADING') return <RouteLoader />;
  if (authStep === 'MFA_REQUIRED') return <Navigate to="/mfa" replace />;
  if (authStep === 'FORCE_PASSWORD_CHANGE') return <Navigate to="/change-password" replace />;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === 'admin' ? '/admin/modulos' : '/dashboard'} replace />;
}

function AdminClientWrapper({ Page, pageProps = {} }) {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const clientName = (() => {
    try {
      const info = JSON.parse(localStorage.getItem(`opice_ir_info_${clientId}`) || '{}');
      return info.nomeCliente || clientId;
    } catch {
      return clientId;
    }
  })();
  return createElement(Page, {
    key: `${Page.name}-${clientId}-${pageProps.defaultView || 'default'}`,
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
    } catch {
      return clientId;
    }
  })();
  return (
    <PMO key={initialTab || 'dashboard'} clientId={clientId} isAdmin={true} adminClientName={clientName} onAdminBack={() => navigate('/admin/modulos')} initialTab={initialTab} />
  );
}

function AdminClientWarRoom() {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const clientName = (() => {
    try {
      const info = JSON.parse(localStorage.getItem(`opice_ir_info_${clientId}`) || '{}');
      return info.nomeCliente || clientId;
    } catch {
      return clientId;
    }
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
    } catch {
      return clientId;
    }
  })();
  return (
    <ReuniaoDetalhe clientId={clientId} meetingId={meetingId} isAdmin={true} adminClientName={clientName} onAdminBack={() => navigate('/admin/modulos')} />
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<RouteLoader />}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/mfa" element={<MFAPage />} />
            <Route path="/change-password" element={<ChangePasswordRoute><ChangePassword /></ChangePasswordRoute>} />
            <Route path="/" element={<RootRedirect />} />

            <Route path="/dashboard" element={<ProtectedRoute><Dashboard key="client-dashboard" /></ProtectedRoute>} />
            <Route path="/informacoes" element={<ProtectedRoute><Informacoes key="client-informacoes" /></ProtectedRoute>} />
            <Route path="/perguntas" element={<ProtectedRoute><OnboardingRoute requireStep="perguntas"><Perguntas key="client-perguntas" /></OnboardingRoute></ProtectedRoute>} />
            <Route path="/jornada" element={<ProtectedRoute><OnboardingRoute requireStep="jornada"><Jornada key="client-jornada" /></OnboardingRoute></ProtectedRoute>} />
            <Route path="/jornada/timeline" element={<ProtectedRoute><OnboardingRoute requireStep="jornada"><Jornada key="client-jornada-timeline" defaultView="timeline" /></OnboardingRoute></ProtectedRoute>} />
            <Route path="/pmo" element={<ProtectedRoute><PMO key="dashboard" /></ProtectedRoute>} />
            <Route path="/pmo/resumo-c-level" element={<ProtectedRoute><PMO key="clevel" initialTab="clevel" /></ProtectedRoute>} />
            <Route path="/pmo/warroom" element={<ProtectedRoute><WarRoom /></ProtectedRoute>} />
            <Route path="/anpd" element={<ProtectedRoute><ANPD /></ProtectedRoute>} />
            <Route path="/anpd/comunicacao-titulares" element={<ProtectedRoute><ANPDComunicacaoTitulares key="client-anpd-comunicacao" /></ProtectedRoute>} />
            <Route path="/anpd/registro-incidente" element={<ProtectedRoute><ANPDRegistroIncidente key="client-anpd-registro" /></ProtectedRoute>} />
            <Route path="/anpd/formulario-cis" element={<ProtectedRoute><ANPDFormularioCIS /></ProtectedRoute>} />
            <Route path="/reunioes" element={<ProtectedRoute><Reunioes /></ProtectedRoute>} />
            <Route path="/reunioes/:meetingId" element={<ProtectedRoute><ReuniaoDetalhe /></ProtectedRoute>} />

            <Route path="/admin/modulos" element={<AdminRoute><AdminModulesHub /></AdminRoute>} />
            <Route path="/admin/riscos" element={<AdminRoute><AdminRiskModule /></AdminRoute>} />
            <Route path="/admin/avaliacao-terceiro" element={<AdminRoute><AdminThirdPartyModule /></AdminRoute>} />
            <Route path="/admin/financeiro" element={<AdminRoute><AdminFinanceModule /></AdminRoute>} />
            <Route path="/admin/privacidade" element={<AdminRoute><AdminPrivacyModule /></AdminRoute>} />
            <Route path="/admin/forense" element={<AdminRoute><AdminForensicsModule /></AdminRoute>} />
            <Route path="/admin/suporte" element={<AdminRoute><AdminSupportCenter /></AdminRoute>} />
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
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
}
