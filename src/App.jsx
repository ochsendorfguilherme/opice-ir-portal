import { BrowserRouter, Routes, Route, Navigate, useNavigate, useParams } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute, AdminRoute, OnboardingRoute } from './components/ProtectedRoute';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Jornada from './pages/Jornada';
import Perguntas from './pages/Perguntas';
import Informacoes from './pages/Informacoes';
import PMO from './pages/PMO';
import WarRoom from './pages/WarRoom';
import Admin from './pages/Admin';

// Admin client view wrappers
function AdminClientWrapper({ Page, ...props }) {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const clientName = (() => {
    try {
      const info = JSON.parse(localStorage.getItem(`opice_ir_info_${clientId}`) || '{}');
      return info.nomeCliente || clientId;
    } catch { return clientId; }
  })();

  return (
    <Page
      clientId={clientId}
      isAdmin={true}
      adminClientName={clientName}
      onAdminBack={() => navigate('/admin')}
      {...props}
    />
  );
}

function AdminClientPMO() {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const clientName = (() => {
    try {
      const info = JSON.parse(localStorage.getItem(`opice_ir_info_${clientId}`) || '{}');
      return info.nomeCliente || clientId;
    } catch { return clientId; }
  })();
  return (
    <PMO
      clientId={clientId}
      isAdmin={true}
      adminClientName={clientName}
      onAdminBack={() => navigate('/admin')}
    />
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
    <WarRoom
      clientId={clientId}
      isAdmin={true}
      adminClientName={clientName}
      onAdminBack={() => navigate('/admin')}
    />
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* Client routes */}
          <Route path="/dashboard" element={
            <ProtectedRoute><Dashboard /></ProtectedRoute>
          } />
          <Route path="/informacoes" element={
            <ProtectedRoute><Informacoes /></ProtectedRoute>
          } />
          <Route path="/perguntas" element={
            <ProtectedRoute>
              <OnboardingRoute requireStep="perguntas"><Perguntas /></OnboardingRoute>
            </ProtectedRoute>
          } />
          <Route path="/jornada" element={
            <ProtectedRoute>
              <OnboardingRoute requireStep="jornada"><Jornada /></OnboardingRoute>
            </ProtectedRoute>
          } />
          <Route path="/pmo" element={
            <ProtectedRoute><PMO /></ProtectedRoute>
          } />
          <Route path="/pmo/warroom" element={
            <ProtectedRoute><WarRoom /></ProtectedRoute>
          } />

          {/* Admin */}
          <Route path="/admin" element={
            <AdminRoute><Admin /></AdminRoute>
          } />
          <Route path="/admin/cliente/:clientId/dashboard" element={
            <AdminRoute><AdminClientWrapper Page={Dashboard} /></AdminRoute>
          } />
          <Route path="/admin/cliente/:clientId/informacoes" element={
            <AdminRoute><AdminClientWrapper Page={Informacoes} /></AdminRoute>
          } />
          <Route path="/admin/cliente/:clientId/perguntas" element={
            <AdminRoute><AdminClientWrapper Page={Perguntas} /></AdminRoute>
          } />
          <Route path="/admin/cliente/:clientId/jornada" element={
            <AdminRoute><AdminClientWrapper Page={Jornada} /></AdminRoute>
          } />
          <Route path="/admin/cliente/:clientId/pmo" element={
            <AdminRoute><AdminClientPMO /></AdminRoute>
          } />
          <Route path="/admin/cliente/:clientId/pmo/warroom" element={
            <AdminRoute><AdminClientWarRoom /></AdminRoute>
          } />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
