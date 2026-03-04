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
  LogOut, ArrowRight, Edit2, CheckCircle, AlertCircle
} from 'lucide-react';

const AGENTE_OPTS = ['Controlador', 'Operador', 'Ambos'];

function ClientCard({ client, onAccess, onEdit }) {
  const info = getStorage(KEYS.info(client.id), {});
  const acts = getStorage(KEYS.activities(client.id), []);
  const crisis = getStorage(KEYS.crisis(client.id, 'active'));
  const hasCrisis = crisis?.crisisActive === true && crisis?.crisisStatus !== 'closed';

  // Calculate stats
  const total = acts.length;
  const done = acts.filter(a => a.status === 'Feito').length;
  const ongoing = acts.filter(a => a.status === 'Em andamento').length;
  const waiting = acts.filter(a => a.status === 'Planejado').length;
  const pct = total ? Math.round(done / total * 100) : 0;

  const sla = useSLATimer(info.dataConhecimento || null);
  const slaAlert = info.dataConhecimento ? (Date.now() - new Date(info.dataConhecimento).getTime()) / (1000 * 60 * 60) >= 36 : false;
  const anpd = info.dataConhecimento ? businessDaysRemaining(new Date(info.dataConhecimento), 3) : null;

  const slaStatusColor = sla.status === 'critical' ? 'bg-red-50 border-red-300' : sla.status === 'warning' ? 'bg-amber-50 border-amber-300' : 'border-[#E0E0E0]';

  return (
    <div className={`border p-5 ${hasCrisis ? 'border-red-500 bg-red-50/30' : slaStatusColor} transition-colors flex flex-col h-full`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {hasCrisis && <Zap size={14} className="text-red-600 animate-pulse shrink-0" />}
            <h3 className="font-syne font-bold text-[#111111] text-lg truncate" title={client.displayName || client.name}>
              {client.displayName || client.name}
            </h3>
          </div>
          <div className="flex gap-3 mt-0.5">
            <span className="font-mono text-[10px] text-[#555555] uppercase tracking-wider">{client.id}</span>
            {info.agente && <span className="font-mono text-[10px] text-[#555555] uppercase tracking-wider border-l pl-3 border-gray-200">{info.agente}</span>}
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <button
            onClick={() => onAccess(client)}
            className="shrink-0 bg-[#111111] text-white font-mono text-xs px-4 py-2 hover:bg-[#333] transition-colors flex items-center gap-2 border border-black"
          >
            ACESSAR <ArrowRight size={12} />
          </button>
          <button
            onClick={() => onEdit(client)}
            className="shrink-0 bg-white text-[#111111] font-mono text-[10px] px-4 py-1.5 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 border border-gray-200"
          >
            <Edit2 size={10} /> EDITAR
          </button>
        </div>
      </div>

      {/* Progress */}
      <div className="mb-6">
        <div className="flex justify-between text-[10px] font-mono mb-1.5 uppercase tracking-widest">
          <span className="text-[#555555]">Progresso Geral</span>
          <span className="text-[#111111] font-bold">{pct}%</span>
        </div>
        <div className="w-full h-1.5 bg-[#E5E5E5] flex">
          <div className="h-1.5 bg-[#CAFF00] transition-all duration-700" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-2 mb-6">
        <div className="bg-white border border-gray-100 p-3">
          <div className="font-mono text-[9px] text-gray-500 uppercase mb-1">Em Andamento</div>
          <div className="font-syne font-bold text-xl text-amber-600">{ongoing}</div>
        </div>
        <div className="bg-white border border-gray-100 p-3">
          <div className="font-mono text-[9px] text-gray-500 uppercase mb-1">Concluídos</div>
          <div className="font-syne font-bold text-xl text-green-600">{done}</div>
        </div>
        <div className="bg-white border border-gray-100 p-3">
          <div className="font-mono text-[9px] text-gray-500 uppercase mb-1">Aguardando</div>
          <div className="font-syne font-bold text-xl text-blue-600">{waiting}</div>
        </div>
        <div className={`border p-3 ${slaAlert ? 'bg-red-50 border-red-100' : 'bg-white border-gray-100'}`}>
          <div className="font-mono text-[9px] text-gray-500 uppercase mb-1 flex items-center gap-1">
            <AlertTriangle size={9} className={slaAlert ? 'text-red-500' : 'text-gray-400'} />
            Alertas SLA
          </div>
          <div className={`font-syne font-bold text-xl ${slaAlert ? 'text-red-600' : 'text-gray-400'}`}>
            {slaAlert ? '1' : '0'}
          </div>
        </div>
      </div>

      <div className="mt-auto flex flex-wrap gap-2 text-[10px] tracking-tight">
        {/* SLA Status Tag */}
        {info.dataConhecimento && (
          <span className={`font-mono px-2 py-0.5 uppercase border ${sla.status === 'critical' ? 'bg-red-600 text-white border-red-600 animate-pulse' :
            sla.status === 'warning' ? 'bg-amber-100 text-amber-700 border-amber-200' :
              'bg-gray-100 text-gray-600 border-gray-200'
            }`}>
            SLA: {sla.label}
          </span>
        )}

        {/* ANPD Status Tag */}
        {anpd && (
          <span className={`font-mono px-2 py-0.5 uppercase border ${anpd.overdue ? 'bg-red-100 text-red-700 border-red-200' :
            anpd.diffHours < 24 ? 'bg-red-50 text-red-600 border-red-100' :
              anpd.diffHours < 48 ? 'bg-amber-50 text-amber-700 border-amber-100' :
                'bg-gray-50 text-gray-600 border-gray-200'
            }`}>
            ANPD: {anpd.overdue ? 'VENCIDO' : formatCountdown(anpd.diffHours)}
          </span>
        )}

        {/* Crisis status */}
        {hasCrisis && (
          <span className="font-mono px-2 py-0.5 bg-red-600 text-white border border-red-600 animate-pulse">
            ⚡ WARROOM ATIVA
          </span>
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
  const [editingClient, setEditingClient] = useState(null);
  const [toast, setToast] = useState(null);

  const [newForm, setNewForm] = useState({
    name: '', email: '', password: '', codigo: '', dataIncidente: '', agente: 'Controlador', displayName: ''
  });

  const [editForm, setEditForm] = useState({
    displayName: '', codigo: '', dataIncidente: '', agente: 'Controlador'
  });

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

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
    const displayName = newForm.displayName || newForm.name;
    const newClient = { id, name: newForm.name, email: newForm.email, displayName };

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
    setNewForm({ name: '', email: '', password: '', codigo: '', dataIncidente: '', agente: 'Controlador', displayName: '' });
    setShowNewModal(false);
  };

  const handleEdit = (client) => {
    const info = getStorage(KEYS.info(client.id), {});
    setEditingClient(client);
    setEditForm({
      displayName: client.displayName || client.name,
      codigo: info.codigoCliente || '',
      dataIncidente: info.dataIncidente || '',
      agente: info.agente || 'Controlador'
    });
  };

  const saveEdit = () => {
    if (!editForm.displayName || editForm.displayName.length < 2) {
      setToast({ type: 'error', message: 'Nome de exibição deve ter pelo menos 2 caracteres.' });
      return;
    }

    const clientId = editingClient.id;

    // Update clients list
    const existingClients = getStorage(KEYS.clients(), []);
    const updatedClients = existingClients.map(c =>
      c.id === clientId ? { ...c, displayName: editForm.displayName } : c
    );
    setStorage(KEYS.clients(), updatedClients);
    setClients(prev => prev.map(c => c.id === clientId ? { ...c, displayName: editForm.displayName } : c));

    // Update info
    const info = getStorage(KEYS.info(clientId), {});
    setStorage(KEYS.info(clientId), {
      ...info,
      nomeCliente: editForm.displayName,
      codigoCliente: editForm.codigo,
      dataIncidente: editForm.dataIncidente,
      agente: editForm.agente
    });

    setToast({ type: 'success', message: 'Informações do cliente atualizadas com sucesso!' });
    setEditingClient(null);
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
        {/* Global stats REMOVED as requested */}

        {/* Alertas Consolidados */}
        {(() => {
          const alertItems = sorted.flatMap(c => {
            const inf = getStorage(KEYS.info(c.id), {});
            const cr = getStorage(KEYS.crisis(c.id, 'active'));
            const hasCrisis = cr?.crisisActive === true && cr?.crisisStatus !== 'closed';
            const h = inf.dataConhecimento ? (currentTime - new Date(inf.dataConhecimento).getTime()) / (1000 * 60 * 60) : 0;
            const anpdResult = inf.dataConhecimento ? businessDaysRemaining(new Date(inf.dataConhecimento), 3) : null;
            const items = [];
            if (hasCrisis) items.push({ type: 'warroom', label: `⚡ ${c.displayName || c.name} — WARROOM ATIVA`, time: cr.crisisTimestamp ? `${Math.round((currentTime - new Date(cr.crisisTimestamp)) / 3600000)}h` : '', id: c.id, color: 'text-red-700 bg-red-50 border-red-300' });
            else if (anpdResult?.overdue) items.push({ type: 'anpd', label: `⛔ ${c.displayName || c.name} — PRAZO ANPD VENCIDO`, time: formatCountdown(anpdResult.diffHours), id: c.id, color: 'text-red-700 bg-red-50 border-red-300' });
            else if (h >= 48) items.push({ type: 'sla', label: `🔴 ${c.displayName || c.name} — SLA Crítico`, time: `${Math.round(h)}h`, id: c.id, color: 'text-red-700 bg-red-50 border-red-300' });
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
            <ClientCard key={client.id} client={client} onAccess={handleAccess} onEdit={handleEdit} />
          ))}
        </div>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-24 right-6 z-[100] animate-in slide-in-from-right-4 fade-in duration-300 pointer-events-none`}>
          <div className={`px-5 py-3 shadow-2xl flex items-center gap-3 border ${toast.type === 'success' ? 'bg-[#CAFF00] border-[#CAFF00] text-[#111111]' : 'bg-red-600 border-red-600 text-white'}`}>
            {toast.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
            <span className="font-dm text-sm font-medium">{toast.message}</span>
          </div>
        </div>
      )}

      {/* New Client Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white border border-[#E0E0E0] w-full max-w-md shadow-2xl">
            <div className="bg-[#111111] px-5 py-4 flex items-center justify-between">
              <h3 className="font-syne font-bold text-white uppercase">Novo Cliente</h3>
              <button onClick={() => setShowNewModal(false)} className="text-gray-400 hover:text-white"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-mono text-xs uppercase text-[#555555] mb-1">Login/Identificador *</label>
                  <input type="text" value={newForm.name} onChange={e => setNewForm(f => ({ ...f, name: e.target.value }))} className={inputClass} placeholder="cliente_exemplo" />
                </div>
                <div>
                  <label className="block font-mono text-xs uppercase text-[#555555] mb-1">Nome de Exibição</label>
                  <input type="text" value={newForm.displayName} onChange={e => setNewForm(f => ({ ...f, displayName: e.target.value }))} className={inputClass} placeholder="Exemplo S.A." />
                </div>
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

      {/* Edit Client Modal */}
      {editingClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white border border-[#E0E0E0] w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-[#111111] px-5 py-4 flex items-center justify-between">
              <h3 className="font-syne font-bold text-white uppercase flex items-center gap-2">
                <Edit2 size={16} className="text-[#CAFF00]" /> Editar Cliente
              </h3>
              <button onClick={() => setEditingClient(null)} className="text-gray-400 hover:text-white"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block font-mono text-[10px] uppercase text-[#555555] mb-1 tracking-wider">Identificador (Não editável)</label>
                <input type="text" value={editingClient.id} disabled className={`${inputClass} bg-gray-50 opacity-60 text-gray-500`} />
              </div>
              <div>
                <label className="block font-mono text-[10px] uppercase text-[#555555] mb-1 tracking-wider">Nome de Exibição *</label>
                <input
                  type="text"
                  value={editForm.displayName}
                  onChange={e => setEditForm(f => ({ ...f, displayName: e.target.value }))}
                  className={inputClass}
                  placeholder="Exemplo S.A."
                />
              </div>
              <div>
                <label className="block font-mono text-[10px] uppercase text-[#555555] mb-1 tracking-wider">Código do Cliente</label>
                <input
                  type="text"
                  value={editForm.codigo}
                  onChange={e => setEditForm(f => ({ ...f, codigo: e.target.value }))}
                  className={inputClass}
                  placeholder="CLI-001"
                />
              </div>
              <div>
                <label className="block font-mono text-[10px] uppercase text-[#555555] mb-1 tracking-wider">Data do Incidente</label>
                <input
                  type="date"
                  value={editForm.dataIncidente}
                  onChange={e => setEditForm(f => ({ ...f, dataIncidente: e.target.value }))}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block font-mono text-[10px] uppercase text-[#555555] mb-1 tracking-wider">Agente de Tratamento</label>
                <select
                  value={editForm.agente}
                  onChange={e => setEditForm(f => ({ ...f, agente: e.target.value }))}
                  className={inputClass}
                >
                  {AGENTE_OPTS.map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
            </div>
            <div className="px-5 pb-5 flex gap-3">
              <button onClick={() => setEditingClient(null)} className="flex-1 border border-[#E0E0E0] font-dm text-sm py-3 hover:bg-gray-50 transition-colors">Cancelar</button>
              <button onClick={saveEdit} className="flex-1 bg-[#111111] text-white font-dm text-sm py-3 hover:bg-[#333] transition-colors border border-black uppercase font-bold tracking-wider">Salvar Alterações</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
