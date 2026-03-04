import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getStorage, setStorage, KEYS, generateId } from '../utils/storage';
import { DEFAULT_ACTIVITIES } from '../data/activities';
import { USERS } from '../data/users';
import { useSLATimer } from '../hooks/useSLA';
import { businessDaysRemaining, formatCountdown } from '../utils/businessDays';
import TLPBanner from '../components/TLPBanner';
import OpiceLogo from '../components/OpiceLogo';
import {
  Plus, X, Shield, Users, Activity, Clock, AlertTriangle, Zap,
  LogOut, ArrowRight
} from 'lucide-react';

const AGENTE_OPTS = ['Controlador', 'Operador', 'Ambos'];

function ClientCard({ client, onAccess }) {
  const info = getStorage(KEYS.info(client.id), {});
  const acts = getStorage(KEYS.activities(client.id), []);
  const crisis = getStorage(KEYS.crisis(client.id, 'active'));
  const hasCrisis = crisis?.crisisActive === true && crisis?.crisisStatus !== 'closed';

  const total = acts.length;
  const done = acts.filter(a => a.status === 'Feito').length;
  const pct = total ? Math.round(done / total * 100) : 0;

  const sla = useSLATimer(info.dataConhecimento || null);
  const anpd = info.dataConhecimento ? businessDaysRemaining(new Date(info.dataConhecimento), 3) : null;

  const slaStatusColor = sla.status === 'critical' ? 'bg-red-50 border-red-300' : sla.status === 'warning' ? 'bg-amber-50 border-amber-300' : 'border-[#E0E0E0]';

  return (
    <div className={`border p-5 ${hasCrisis ? 'border-red-500 bg-red-50/30' : slaStatusColor} transition-colors`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {hasCrisis && <Zap size={14} className="text-red-600 animate-pulse shrink-0" />}
            <h3 className="font-syne font-bold text-[#111111] text-base truncate">{client.name}</h3>
          </div>
          <div className="flex gap-3 mt-0.5">
            <span className="font-mono text-xs text-[#555555]">{info.codigoCliente || client.id}</span>
            {info.agente && <span className="font-mono text-xs text-[#555555]">{info.agente}</span>}
          </div>
          {info.dataIncidente && (
            <div className="font-mono text-xs text-[#555555] mt-0.5">
              Incidente: {info.dataIncidente}
            </div>
          )}
        </div>
        <button
          onClick={() => onAccess(client)}
          className="shrink-0 bg-[#111111] text-white font-mono text-xs px-3 py-1.5 hover:bg-[#333] transition-colors flex items-center gap-1"
        >
          Acessar <ArrowRight size={11} />
        </button>
      </div>

      {/* Progress */}
      <div className="mb-3">
        <div className="flex justify-between text-xs font-mono mb-1">
          <span className="text-[#555555]">Progresso</span>
          <span className="text-[#111111]">{pct}%</span>
        </div>
        <div className="w-full h-1.5 bg-[#E5E5E5]">
          <div className="h-1.5 bg-[#CAFF00] transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="flex flex-wrap gap-3 text-xs">
        {/* SLA */}
        {info.dataConhecimento && (
          <span className={`font-mono px-2 py-0.5 ${sla.status === 'critical' ? 'bg-red-100 text-red-700 animate-pulse-red' :
            sla.status === 'warning' ? 'bg-amber-100 text-amber-700 animate-pulse-amber' :
              'bg-gray-100 text-gray-600'
            }`}>
            SLA: {sla.label}
          </span>
        )}

        {/* ANPD */}
        {anpd && (
          <span className={`font-mono px-2 py-0.5 ${anpd.overdue ? 'bg-red-100 text-red-700' :
            anpd.diffHours < 24 ? 'bg-red-50 text-red-600' :
              anpd.diffHours < 48 ? 'bg-amber-50 text-amber-700' :
                'bg-gray-50 text-gray-600'
            }`}>
            ANPD: {anpd.overdue ? 'VENCIDO' : formatCountdown(anpd.diffHours)}
          </span>
        )}

        {/* Crisis */}
        {hasCrisis && (
          <span className="font-mono px-2 py-0.5 bg-red-600 text-white animate-pulse-red">
            ⚡ WARROOM ATIVA
          </span>
        )}

        {/* Onboarding status */}
        {!info.nomeCliente ? (
          <span className="font-mono px-2 py-0.5 bg-gray-100 text-gray-500">Onboarding pendente</span>
        ) : (
          <span className="font-mono px-2 py-0.5 bg-green-100 text-green-700">✓ Onboarding OK</span>
        )}
      </div>
    </div>
  );
}

export default function Admin() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [clients, setClients] = useState([]);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newForm, setNewForm] = useState({
    name: '', email: '', password: '', codigo: '', dataIncidente: '', agente: 'Controlador'
  });

  useEffect(() => {
    // Load hardcoded clients + dynamic ones
    const dynamicClients = getStorage(KEYS.clients(), []);
    const hardcoded = USERS.filter(u => u.role === 'client').map(u => ({
      id: u.clientId,
      name: u.name,
      email: u.email,
    }));
    // Merge
    const allIds = new Set([...hardcoded.map(c => c.id), ...dynamicClients.map(c => c.id)]);
    const merged = [...hardcoded, ...dynamicClients.filter(c => !hardcoded.some(h => h.id === c.id))];
    setClients(merged);
  }, []);

  const createClient = () => {
    if (!newForm.name || !newForm.email) return;
    const id = `client_dyn_${generateId('').toLowerCase()}`;
    const newClient = { id, name: newForm.name, email: newForm.email };

    // Save client info
    setStorage(KEYS.info(id), {
      nomeCliente: newForm.name,
      codigoCliente: newForm.codigo,
      dataIncidente: newForm.dataIncidente,
      agente: newForm.agente,
      dataConhecimento: '',
      contexto: '',
    });

    // Init activities
    const activities = DEFAULT_ACTIVITIES.map(a => ({ ...a, status: 'Planejado' }));
    setStorage(KEYS.activities(id), activities);

    // Save to clients list
    const existing = getStorage(KEYS.clients(), []);
    setStorage(KEYS.clients(), [...existing, newClient]);
    setClients(prev => [...prev, newClient]);
    setNewForm({ name: '', email: '', password: '', codigo: '', dataIncidente: '', agente: 'Controlador' });
    setShowNewModal(false);
  };

  const handleAccess = (client) => {
    navigate(`/admin/cliente/${client.id}/dashboard`);
  };

  const [currentTime, setCurrentTime] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Global stats
  const allActivities = clients.flatMap(c => getStorage(KEYS.activities(c.id), []));
  const totalOngoing = allActivities.filter(a => a.status === 'Em andamento').length;
  const totalDone = allActivities.filter(a => a.status === 'Feito').length;
  const waiting = allActivities.filter(a => a.status === 'Planejado').length;

  const slaAlerts = clients.filter(c => {
    const info = getStorage(KEYS.info(c.id), {});
    if (!info.dataConhecimento) return false;
    const h = (currentTime - new Date(info.dataConhecimento).getTime()) / (1000 * 60 * 60);
    return h >= 36;
  }).length;

  const criticalAlerts = clients.filter(c => {
    const info = getStorage(KEYS.info(c.id), {});
    if (!info.dataConhecimento) return false;
    const h = (currentTime - new Date(info.dataConhecimento).getTime()) / (1000 * 60 * 60);
    return h >= 48;
  }).length;

  // Sort: crisis first, then critical, warning, ok
  const sorted = [...clients].sort((a, b) => {
    const crisisA = getStorage(KEYS.crisis(a.id, 'active'))?.crisisActive;
    const crisisB = getStorage(KEYS.crisis(b.id, 'active'))?.crisisActive;
    if (crisisA && !crisisB) return -1;
    if (!crisisA && crisisB) return 1;
    const infoA = getStorage(KEYS.info(a.id), {});
    const infoB = getStorage(KEYS.info(b.id), {});
    const hA = infoA.dataConhecimento ? (currentTime - new Date(infoA.dataConhecimento).getTime()) / (1000 * 60 * 60) : 0;
    const hB = infoB.dataConhecimento ? (currentTime - new Date(infoB.dataConhecimento).getTime()) / (1000 * 60 * 60) : 0;
    return hB - hA;
  });

  const inputClass = "border border-[#E0E0E0] px-3 py-2 font-dm text-sm focus:outline-none focus:border-[#111111] w-full";

  return (
    <div className="min-h-screen bg-[#F9F9F9]">
      <TLPBanner />

      {/* Admin Header */}
      <div className="bg-[#111111] px-6 md:px-10 py-5 flex items-center gap-6">
        <OpiceLogo />
        <span className="bg-[#CAFF00] text-[#111111] font-mono text-xs font-bold px-2 py-0.5">ADMIN</span>
        <h1 className="font-syne font-bold text-white text-lg uppercase hidden md:block">
          Gestão de Incidentes — Visão Geral
        </h1>
        <div className="ml-auto flex items-center gap-3">
          <button
            onClick={() => setShowNewModal(true)}
            className="flex items-center gap-1.5 bg-[#CAFF00] text-[#111111] font-dm font-medium text-sm px-4 py-2 hover:bg-[#b8e600] transition-colors"
          >
            <Plus size={15} />
            Novo Cliente
          </button>
          <button
            onClick={() => { logout(); navigate('/login'); }}
            className="flex items-center gap-1.5 text-gray-400 hover:text-white font-dm text-sm transition-colors"
          >
            <LogOut size={15} />
            Sair
          </button>
        </div>
      </div>

      <div className="px-6 md:px-10 py-8">
        {/* Global stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
          <div className="bg-white border border-[#E0E0E0] p-4">
            <div className="font-mono text-xs text-[#555555] uppercase mb-1">Clientes Ativos</div>
            <div className="font-syne font-extrabold text-3xl text-[#111111]">{clients.length}</div>
          </div>
          <div className="bg-white border border-[#E0E0E0] p-4">
            <div className="font-mono text-xs text-[#555555] uppercase mb-1">Em Andamento</div>
            <div className="font-syne font-extrabold text-3xl text-amber-600">{totalOngoing}</div>
          </div>
          <div className="bg-white border border-[#E0E0E0] p-4">
            <div className="font-mono text-xs text-[#555555] uppercase mb-1">Concluídos</div>
            <div className="font-syne font-extrabold text-3xl text-green-600">{totalDone}</div>
          </div>
          <div className="bg-white border border-[#E0E0E0] p-4">
            <div className="font-mono text-xs text-[#555555] uppercase mb-1">Aguardando</div>
            <div className="font-syne font-extrabold text-3xl text-blue-600">{waiting}</div>
          </div>
          <div className={`border p-4 ${criticalAlerts > 0 ? 'bg-red-50 border-red-300 animate-pulse-red' : 'bg-white border-[#E0E0E0]'}`}>
            <div className="font-mono text-xs text-[#555555] uppercase mb-1 flex items-center gap-1">
              <AlertTriangle size={11} className={criticalAlerts > 0 ? 'text-red-500' : 'text-gray-400'} />
              Alertas SLA
            </div>
            <div className={`font-syne font-extrabold text-3xl ${criticalAlerts > 0 ? 'text-red-600' : slaAlerts > 0 ? 'text-amber-600' : 'text-[#111111]'}`}>
              {slaAlerts}
            </div>
          </div>
        </div>

        {/* Alertas Consolidados */}
        {(() => {
          const alertItems = sorted.flatMap(c => {
            const inf = getStorage(KEYS.info(c.id), {});
            const cr = getStorage(KEYS.crisis(c.id, 'active'));
            const hasCrisis = cr?.crisisActive === true && cr?.crisisStatus !== 'closed';
            const h = inf.dataConhecimento ? (currentTime - new Date(inf.dataConhecimento).getTime()) / (1000 * 60 * 60) : 0;
            const anpdResult = inf.dataConhecimento ? businessDaysRemaining(new Date(inf.dataConhecimento), 3) : null;
            const items = [];
            if (hasCrisis) items.push({ type: 'warroom', label: `⚡ ${c.name} — WARROOM ATIVA`, time: cr.crisisTimestamp ? `${Math.round((currentTime - new Date(cr.crisisTimestamp)) / 3600000)}h` : '', id: c.id, color: 'text-red-700 bg-red-50 border-red-300' });
            else if (anpdResult?.overdue) items.push({ type: 'anpd', label: `⛔ ${c.name} — PRAZO ANPD VENCIDO`, time: formatCountdown(anpdResult.diffHours), id: c.id, color: 'text-red-700 bg-red-50 border-red-300' });
            else if (h >= 48) items.push({ type: 'sla', label: `🔴 ${c.name} — SLA Crítico`, time: `${Math.round(h)}h`, id: c.id, color: 'text-red-700 bg-red-50 border-red-300' });
            return items;
          });
          return alertItems.length > 0 ? (
            <div className="mb-8 border border-red-300 bg-white">
              <div className="bg-red-600 px-5 py-3">
                <span className="font-mono text-xs text-white font-bold uppercase tracking-widest">🚨 Alertas que requerem atenção imediata</span>
              </div>
              <div className="divide-y divide-red-100">
                {alertItems.map((alert, i) => (
                  <div key={i} className={`flex items-center gap-4 px-5 py-3 ${alert.color}`}>
                    <span className="font-mono text-sm flex-1">{alert.label}</span>
                    {alert.time && <span className="font-mono text-xs opacity-70">{alert.time}</span>}
                    <button onClick={() => handleAccess({ id: alert.id })} className="flex items-center gap-1 font-mono text-xs bg-[#111111] text-white px-3 py-1 hover:bg-[#333] transition-colors">
                      Acessar <ArrowRight size={10} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="mb-8 border border-green-200 bg-green-50 px-5 py-4 flex items-center gap-3">
              <span className="text-green-700 font-mono text-sm">✓ Todos os clientes dentro dos prazos</span>
            </div>
          );
        })()}
        {/* Client list */}
        <h2 className="font-syne font-bold text-[#111111] text-xl uppercase mb-4">Clientes</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {sorted.map(client => (
            <ClientCard key={client.id} client={client} onAccess={handleAccess} />
          ))}
        </div>
      </div>

      {/* New Client Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white border border-[#E0E0E0] w-full max-w-md shadow-2xl">
            <div className="bg-[#111111] px-5 py-4 flex items-center justify-between">
              <h3 className="font-syne font-bold text-white uppercase">Novo Cliente</h3>
              <button onClick={() => setShowNewModal(false)} className="text-gray-400 hover:text-white"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block font-mono text-xs uppercase text-[#555555] mb-1">Nome *</label>
                <input type="text" value={newForm.name} onChange={e => setNewForm(f => ({ ...f, name: e.target.value }))} className={inputClass} placeholder="Empresa S.A." />
              </div>
              <div>
                <label className="block font-mono text-xs uppercase text-[#555555] mb-1">Email *</label>
                <input type="email" value={newForm.email} onChange={e => setNewForm(f => ({ ...f, email: e.target.value }))} className={inputClass} />
              </div>
              <div>
                <label className="block font-mono text-xs uppercase text-[#555555] mb-1">Senha</label>
                <input type="password" value={newForm.password} onChange={e => setNewForm(f => ({ ...f, password: e.target.value }))} className={inputClass} />
              </div>
              <div>
                <label className="block font-mono text-xs uppercase text-[#555555] mb-1">Código do Cliente</label>
                <input type="text" value={newForm.codigo} onChange={e => setNewForm(f => ({ ...f, codigo: e.target.value }))} className={inputClass} placeholder="CLI-001" />
              </div>
              <div>
                <label className="block font-mono text-xs uppercase text-[#555555] mb-1">Data do Incidente</label>
                <input type="date" value={newForm.dataIncidente} onChange={e => setNewForm(f => ({ ...f, dataIncidente: e.target.value }))} className={inputClass} />
              </div>
              <div>
                <label className="block font-mono text-xs uppercase text-[#555555] mb-1">Agente de Tratamento</label>
                <select value={newForm.agente} onChange={e => setNewForm(f => ({ ...f, agente: e.target.value }))} className={inputClass}>
                  {AGENTE_OPTS.map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
            </div>
            <div className="px-5 pb-5 flex gap-3">
              <button onClick={() => setShowNewModal(false)} className="flex-1 border border-[#E0E0E0] font-dm text-sm py-3 hover:bg-gray-50">Cancelar</button>
              <button onClick={createClient} className="flex-1 bg-[#111111] text-white font-dm text-sm py-3 hover:bg-[#333] transition-colors">Criar Cliente</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
