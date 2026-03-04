import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import TabDashboard from '../components/pmo/TabDashboard';
import TabCLevel from '../components/pmo/TabCLevel';
import TabTimeline from '../components/pmo/TabTimeline';
import TabMatriz from '../components/pmo/TabMatriz';
import TabComms from '../components/pmo/TabComms';
import TabTerceiros from '../components/pmo/TabTerceiros';
import TabSLA from '../components/pmo/TabSLA';
import { getStorage, KEYS } from '../utils/storage';

const TABS = [
  { id: 'dashboard', label: 'Dashboard Executivo' },
  { id: 'clevel', label: 'Resumo C-Level' },
  { id: 'timeline', label: 'Timeline Mestre' },
  { id: 'matriz', label: 'Matriz de Ações' },
  { id: 'comms', label: 'Comms Log' },
  { id: 'terceiros', label: 'Terceiros' },
  { id: 'sla', label: 'SLA & Prazos' },
];

export default function PMO({ clientId: propClientId, isAdmin = false, adminClientName, onAdminBack, initialTab }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const effectiveClientId = propClientId || user?.clientId;
  const [activeTab, setActiveTab] = useState(initialTab || 'dashboard');

  const pmoData = getStorage(KEYS.pmo(effectiveClientId), {});
  const actions = pmoData.actions || [];
  const now = new Date();
  const alertCount = actions.filter(a => {
    return a.status === 'Bloqueado' || (a.prazo && new Date(a.prazo) < now && a.status !== 'Feito');
  }).length;

  const getBriefingBadge = () => {
    const { oQueHouve, impacto, oQueFazendo } = pmoData;
    const filledCount = [oQueHouve, impacto, oQueFazendo].filter(v => !!(v || '').trim()).length;
    if (filledCount === 3) return 'bg-green-500';
    if (filledCount > 0) return 'bg-amber-500';
    return 'bg-gray-300';
  };

  return (
    <Layout clientId={propClientId} isAdmin={isAdmin} adminClientName={adminClientName} onAdminBack={onAdminBack}>
      <div className="p-6 md:p-10">
        <div className="mb-6">
          <h1 className="font-syne font-extrabold text-[#111111] text-4xl uppercase">
            IR-PMO
          </h1>
          <p className="text-[#555555] font-dm text-sm mt-1">Incident Response Project Management Office</p>
        </div>

        {/* Tab nav */}
        <div className="flex flex-wrap gap-0 border-b border-[#E0E0E0] mb-8">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 font-mono text-xs uppercase transition-colors relative ${activeTab === tab.id
                  ? 'text-[#111111] border-b-2 border-[#111111] -mb-px'
                  : 'text-[#555555] hover:text-[#111111]'
                }`}
            >
              {tab.label}
              {tab.id === 'matriz' && alertCount > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center bg-red-600 text-white font-mono text-xs w-4 h-4 animate-pulse-red">
                  {alertCount}
                </span>
              )}
              {tab.id === 'clevel' && (
                <span className={`ml-1.5 inline-block w-2 h-2 rounded-full ${getBriefingBadge()}`} title="Status de preenchimento do Briefing" />
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === 'dashboard' && <TabDashboard effectiveClientId={effectiveClientId} onNavigateTab={setActiveTab} />}
        {activeTab === 'clevel' && <TabCLevel effectiveClientId={effectiveClientId} />}
        {activeTab === 'timeline' && <TabTimeline effectiveClientId={effectiveClientId} />}
        {activeTab === 'matriz' && <TabMatriz effectiveClientId={effectiveClientId} />}
        {activeTab === 'comms' && <TabComms effectiveClientId={effectiveClientId} />}
        {activeTab === 'terceiros' && <TabTerceiros effectiveClientId={effectiveClientId} />}
        {activeTab === 'sla' && <TabSLA effectiveClientId={effectiveClientId} />}
      </div>
    </Layout>
  );
}
