import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getStorage, setStorage, KEYS, generateId, fetchClients, softDeleteClient } from '../utils/storage';
import { DEFAULT_ACTIVITIES } from '../data/activities';
import { USERS } from '../data/users';
import { useSLATimer } from '../hooks/useSLA';
import { businessDaysRemaining, formatCountdown } from '../utils/businessDays';
import TLPBanner from '../components/TLPBanner';
import OpiceLogo from '../components/OpiceLogo';
import {
  Plus,
  X,
  Users,
  AlertTriangle,
  Zap,
  LogOut,
  ArrowRight,
  Edit2,
  CheckCircle,
  AlertCircle,
  Trash2,
  Shield,
} from 'lucide-react';

const AGENTE_OPTS = ['Controlador', 'Operador', 'Ambos'];

function classifyClient(client, currentTime) {
  const info = getStorage(KEYS.info(client.id), {});
  const crisis = getStorage(KEYS.crisis(client.id, 'active'));
  const hasCrisis = crisis?.crisisActive === true && crisis?.crisisStatus !== 'closed';
  const hoursSinceKnowledge = info.dataConhecimento
    ? (currentTime - new Date(info.dataConhecimento).getTime()) / (1000 * 60 * 60)
    : 0;
  const anpd = info.dataConhecimento ? businessDaysRemaining(new Date(info.dataConhecimento), 3) : null;

  if (hasCrisis || anpd?.overdue || hoursSinceKnowledge >= 48) return 'critical';
  if (hoursSinceKnowledge >= 36 || (anpd && !anpd.overdue && anpd.diffHours < 48)) return 'attention';
  return 'stable';
}

function ClientCard({ client, level, onAccess, onEdit, onDelete }) {
  const info = getStorage(KEYS.info(client.id), {});
  const acts = getStorage(KEYS.activities(client.id), []);
  const crisis = getStorage(KEYS.crisis(client.id, 'active'));
  const hasCrisis = crisis?.crisisActive === true && crisis?.crisisStatus !== 'closed';

  const total = acts.length;
  const done = acts.filter((activity) => activity.status === 'Feito').length;
  const ongoing = acts.filter((activity) => activity.status === 'Em andamento').length;
  const waiting = acts.filter((activity) => activity.status === 'Planejado').length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  const sla = useSLATimer(info.dataConhecimento || null);
  const slaAlert = info.dataConhecimento
    ? (Date.now() - new Date(info.dataConhecimento).getTime()) / (1000 * 60 * 60) >= 36
    : false;
  const anpd = info.dataConhecimento ? businessDaysRemaining(new Date(info.dataConhecimento), 3) : null;

  const levelStyle = {
    critical: {
      frame: 'border-red-200 bg-red-50/78',
      rail: 'bg-[linear-gradient(90deg,#d45a58_0%,#f0bd59_100%)]',
      badge: 'bg-red-600 text-white',
      label: hasCrisis ? 'War Room' : 'Crítico',
    },
    attention: {
      frame: 'border-amber-200 bg-amber-50/72',
      rail: 'bg-[linear-gradient(90deg,#d59b32_0%,#f2db77_100%)]',
      badge: 'bg-amber-100 text-amber-700',
      label: 'Atenção',
    },
    stable: {
      frame: 'border-[var(--border)] bg-white/70',
      rail: 'bg-[linear-gradient(90deg,#173038_0%,#d6ff63_100%)]',
      badge: 'bg-emerald-100 text-emerald-700',
      label: 'Estável',
    },
  }[level];

  return (
    <article className={`app-panel relative flex h-full flex-col overflow-hidden rounded-[30px] p-5 ${levelStyle.frame}`}>
      <div className={`absolute inset-x-0 top-0 h-1 ${levelStyle.rail}`} />

      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {hasCrisis && <Zap size={14} className="shrink-0 text-red-600 animate-pulse" />}
            <h3 className="truncate text-xl font-bold text-[var(--ink)]" title={client.displayName || client.name}>
              {client.displayName || client.name}
            </h3>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className={`rounded-full px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] ${levelStyle.badge}`}>
              {levelStyle.label}
            </span>
            <span className="rounded-full bg-[rgba(21,38,43,0.06)] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-soft)]">
              {client.id}
            </span>
            {info.agente && (
              <span className="rounded-full bg-white/70 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-soft)]">
                {info.agente}
              </span>
            )}
          </div>
        </div>

        <div className="flex w-full max-w-[178px] flex-col gap-2">
          <button
            onClick={() => onAccess(client)}
            className="btn-primary flex items-center justify-center gap-2 rounded-full px-4 py-3 text-xs uppercase tracking-[0.16em]"
          >
            Acessar <ArrowRight size={12} />
          </button>
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <button
              onClick={() => onEdit(client)}
              className="btn-outline flex items-center justify-center gap-2 rounded-full px-4 py-2 text-[11px] uppercase tracking-[0.14em]"
            >
              <Edit2 size={12} /> Editar
            </button>
            <button
              onClick={() => onDelete(client)}
              className="flex h-full items-center justify-center rounded-full border border-red-200 bg-white/80 px-3 text-red-600 transition-colors hover:bg-red-50"
              title="Excluir cliente"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <div className="mb-2 flex items-center justify-between gap-3">
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--ink-soft)]">Progresso geral</span>
          <span className="font-mono text-xs font-semibold text-[var(--ink)]">{pct}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-[rgba(21,38,43,0.08)]">
          <div className="h-2 rounded-full bg-[linear-gradient(90deg,#173038_0%,#d6ff63_100%)] transition-all duration-700" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <div className="rounded-[22px] border border-[rgba(21,38,43,0.08)] bg-white/72 p-4">
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-soft)]">Em andamento</div>
          <div className="mt-2 text-2xl font-bold text-amber-700">{ongoing}</div>
        </div>
        <div className="rounded-[22px] border border-[rgba(21,38,43,0.08)] bg-white/72 p-4">
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-soft)]">Concluídas</div>
          <div className="mt-2 text-2xl font-bold text-emerald-700">{done}</div>
        </div>
        <div className="rounded-[22px] border border-[rgba(21,38,43,0.08)] bg-white/72 p-4">
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-soft)]">Planejadas</div>
          <div className="mt-2 text-2xl font-bold text-sky-700">{waiting}</div>
        </div>
        <div className={`rounded-[22px] border p-4 ${slaAlert ? 'border-red-200 bg-red-50/85' : 'border-[rgba(21,38,43,0.08)] bg-white/72'}`}>
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-soft)]">
            <AlertTriangle size={12} className={slaAlert ? 'text-red-600' : 'text-[var(--ink-soft)]'} />
            Alertas SLA
          </div>
          <div className={`mt-2 text-2xl font-bold ${slaAlert ? 'text-red-700' : 'text-[var(--ink)]'}`}>{slaAlert ? '1' : '0'}</div>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {info.dataConhecimento && (
          <span className={`rounded-full px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] ${sla.status === 'critical' ? 'bg-red-600 text-white' : sla.status === 'warning' ? 'bg-amber-100 text-amber-700' : 'bg-stone-100 text-stone-700'}`}>
            SLA: {sla.label}
          </span>
        )}

        {anpd && (
          <span className={`rounded-full px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] ${anpd.overdue ? 'bg-red-100 text-red-700' : anpd.diffHours < 24 ? 'bg-red-50 text-red-700' : anpd.diffHours < 48 ? 'bg-amber-100 text-amber-700' : 'bg-stone-100 text-stone-700'}`}>
            ANPD: {anpd.overdue ? 'Vencido' : formatCountdown(anpd.diffHours)}
          </span>
        )}

        {hasCrisis && (
          <span className="rounded-full bg-red-600 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-white">
            WarRoom ativa
          </span>
        )}
      </div>
    </article>
  );
}

export default function Admin() {
  const { logout, logAction, user: currentUser } = useAuth();
  const navigate = useNavigate();

  const [clients, setClients] = useState([]);
  const [showNewModal, setShowNewModal] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [clientToDelete, setClientToDelete] = useState(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [toast, setToast] = useState(null);

  const [newForm, setNewForm] = useState({
    name: '',
    email: '',
    password: '',
    codigo: '',
    dataIncidente: '',
    agente: 'Controlador',
    displayName: '',
  });

  const [editForm, setEditForm] = useState({
    displayName: '',
    codigo: '',
    dataIncidente: '',
    agente: 'Controlador',
  });

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    setClients(fetchClients());
  }, []);

  const createClient = () => {
    const clientName = newForm.name.trim();
    const clientEmail = newForm.email.trim().toLowerCase();
    const displayName = (newForm.displayName || newForm.name).trim();
    const initialPassword = newForm.password.trim() || 'Opice@2025';

    if (!clientName || !clientEmail) {
      setToast({ type: 'error', message: 'Nome e email são obrigatórios.' });
      return;
    }

    const existingUsers = getStorage(KEYS.users(), USERS);
    const emailInUse = existingUsers.some((user) => (user.email || '').trim().toLowerCase() === clientEmail);
    if (emailInUse) {
      setToast({ type: 'error', message: 'Já existe um usuário com este email.' });
      return;
    }

    const id = `client_dyn_${generateId('').toLowerCase()}`;
    const newClient = { id, name: clientName, email: clientEmail, displayName };
    const newClientUser = {
      id,
      email: clientEmail,
      password: initialPassword,
      role: 'client',
      name: displayName,
      clientId: id,
      status: 'Ativo',
      forcePasswordChange: true,
    };

    setStorage(KEYS.info(id), {
      nomeCliente: displayName,
      codigoCliente: newForm.codigo,
      dataIncidente: newForm.dataIncidente,
      agente: newForm.agente,
      dataConhecimento: '',
      contexto: '',
    });

    const activities = DEFAULT_ACTIVITIES.map((activity) => ({ ...activity, status: 'Planejado' }));
    setStorage(KEYS.activities(id), activities);

    const existingClients = getStorage(KEYS.clients(), []);
    setStorage(KEYS.clients(), [...existingClients.filter((client) => client.id !== id), newClient]);
    setStorage(KEYS.users(), [...existingUsers, newClientUser]);

    setClients(fetchClients());
    logAction('CRIADO', newClientUser, currentUser, `Cliente ${displayName} criado com identificador ${id}.`);
    setToast({
      type: 'success',
      message: newForm.password.trim() ? 'Cliente criado com sucesso!' : 'Cliente criado. Senha inicial: Opice@2025',
    });
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
      agente: info.agente || 'Controlador',
    });
  };

  const saveEdit = () => {
    if (!editForm.displayName || editForm.displayName.length < 2) {
      setToast({ type: 'error', message: 'Nome de exibição deve ter pelo menos 2 caracteres.' });
      return;
    }

    const clientId = editingClient.id;
    const currentClient = clients.find((client) => client.id === clientId) || editingClient;
    const updatedClient = {
      ...currentClient,
      name: currentClient.name,
      displayName: editForm.displayName,
    };

    const existingClients = getStorage(KEYS.clients(), []);
    setStorage(KEYS.clients(), [...existingClients.filter((client) => client.id !== clientId), updatedClient]);

    const info = getStorage(KEYS.info(clientId), {});
    setStorage(KEYS.info(clientId), {
      ...info,
      nomeCliente: editForm.displayName,
      codigoCliente: editForm.codigo,
      dataIncidente: editForm.dataIncidente,
      agente: editForm.agente,
    });

    const existingUsers = getStorage(KEYS.users(), USERS);
    const updatedUsers = existingUsers.map((user) => (
      user.role === 'client' && user.clientId === clientId
        ? { ...user, name: editForm.displayName }
        : user
    ));
    setStorage(KEYS.users(), updatedUsers);

    setClients(fetchClients());
    logAction('EDITADO', updatedClient, currentUser, `Cliente ${clientId} atualizado na visão administrativa.`);
    setToast({ type: 'success', message: 'Informações do cliente atualizadas com sucesso!' });
    setEditingClient(null);
  };

  const confirmDelete = () => {
    if (
      deleteConfirmText !== clientToDelete.id
      && deleteConfirmText !== clientToDelete.name
      && deleteConfirmText !== clientToDelete.displayName
    ) {
      setToast({ type: 'error', message: 'Texto de confirmação incorreto.' });
      return;
    }

    const clientId = clientToDelete.id;
    const timestamp = new Date().toISOString();

    softDeleteClient(clientId);

    const existingUsers = getStorage(KEYS.users(), USERS);
    const updatedUsers = existingUsers.map((user) => (
      user.clientId === clientId
        ? {
            ...user,
            status: 'Revogado',
            revocationReason: 'Cliente excluído',
            revocationType: 'Cliente excluído',
            revocationDate: timestamp,
            revokedBy: currentUser?.name || currentUser?.email || 'Admin',
          }
        : user
    ));
    setStorage(KEYS.users(), updatedUsers);

    const existingInvites = getStorage(KEYS.invites(), []);
    const updatedInvites = existingInvites.map((invite) => (
      invite.clientId === clientId && invite.status === 'PENDENTE_APROVACAO_ADMIN'
        ? {
            ...invite,
            status: 'CANCELADO_CLIENTE_EXCLUIDO',
            rejectionReason: 'Cliente excluído',
            updatedAt: timestamp,
          }
        : invite
    ));
    setStorage(KEYS.invites(), updatedInvites);

    setClients(fetchClients());
    logAction('REVOGADO', clientToDelete, currentUser, `Cliente ${clientId} excluído logicamente e acessos vinculados foram revogados.`);
    setToast({ type: 'success', message: 'Cliente excluído com acessos revogados.' });
    setClientToDelete(null);
    setDeleteConfirmText('');
  };

  const handleAccess = (client) => {
    navigate(`/admin/cliente/${client.id}/dashboard`);
  };

  const [currentTime, setCurrentTime] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

  const allActivities = clients.flatMap((client) => getStorage(KEYS.activities(client.id), []));
  const totalOngoing = allActivities.filter((activity) => activity.status === 'Em andamento').length;

  const slaAlerts = clients.filter((client) => {
    const info = getStorage(KEYS.info(client.id), {});
    if (!info.dataConhecimento) return false;
    const hours = (currentTime - new Date(info.dataConhecimento).getTime()) / (1000 * 60 * 60);
    return hours >= 36;
  }).length;

  const triagedClients = [...clients]
    .sort((a, b) => {
      const crisisA = getStorage(KEYS.crisis(a.id, 'active'))?.crisisActive;
      const crisisB = getStorage(KEYS.crisis(b.id, 'active'))?.crisisActive;
      if (crisisA && !crisisB) return -1;
      if (!crisisA && crisisB) return 1;

      const infoA = getStorage(KEYS.info(a.id), {});
      const infoB = getStorage(KEYS.info(b.id), {});
      const hoursA = infoA.dataConhecimento ? (currentTime - new Date(infoA.dataConhecimento).getTime()) / (1000 * 60 * 60) : 0;
      const hoursB = infoB.dataConhecimento ? (currentTime - new Date(infoB.dataConhecimento).getTime()) / (1000 * 60 * 60) : 0;
      return hoursB - hoursA;
    })
    .map((client) => ({ client, level: classifyClient(client, currentTime) }));

  const groupedClients = {
    critical: triagedClients.filter((entry) => entry.level === 'critical'),
    attention: triagedClients.filter((entry) => entry.level === 'attention'),
    stable: triagedClients.filter((entry) => entry.level === 'stable'),
  };

  const urgentAlerts = triagedClients.flatMap(({ client }) => {
    const info = getStorage(KEYS.info(client.id), {});
    const crisis = getStorage(KEYS.crisis(client.id, 'active'));
    const hasCrisis = crisis?.crisisActive === true && crisis?.crisisStatus !== 'closed';
    const hours = info.dataConhecimento ? (currentTime - new Date(info.dataConhecimento).getTime()) / (1000 * 60 * 60) : 0;
    const anpdResult = info.dataConhecimento ? businessDaysRemaining(new Date(info.dataConhecimento), 3) : null;

    if (hasCrisis) {
      return [{
        id: client.id,
        title: `${client.displayName || client.name} com WarRoom ativa`,
        meta: crisis.crisisTimestamp ? `${Math.round((currentTime - new Date(crisis.crisisTimestamp)) / 3600000)}h de crise` : 'Crise ativa',
        tone: 'border-red-200 bg-red-50/85 text-red-800',
      }];
    }

    if (anpdResult?.overdue) {
      return [{
        id: client.id,
        title: `${client.displayName || client.name} com prazo ANPD vencido`,
        meta: formatCountdown(anpdResult.diffHours),
        tone: 'border-red-200 bg-red-50/85 text-red-800',
      }];
    }

    if (hours >= 48) {
      return [{
        id: client.id,
        title: `${client.displayName || client.name} com SLA crítico`,
        meta: `${Math.round(hours)}h desde o conhecimento`,
        tone: 'border-amber-200 bg-amber-50/85 text-amber-800',
      }];
    }

    return [];
  });

  const inputClass = 'w-full rounded-[20px] border border-[rgba(21,38,43,0.12)] bg-white/78 px-4 py-3 text-sm text-[var(--ink)] outline-none transition focus:border-[rgba(23,48,56,0.42)] focus:bg-white';

  const sectionMeta = {
    critical: {
      kicker: 'Fila crítica',
      title: 'Crise e risco imediato',
      description: 'Clientes com WarRoom ativa, ANPD vencido ou SLA já em zona crítica.',
      badge: 'bg-red-100 text-red-700',
    },
    attention: {
      kicker: 'Observação',
      title: 'Atenção nas próximas horas',
      description: 'Clientes que estão se aproximando de pressão regulatória ou operacional.',
      badge: 'bg-amber-100 text-amber-700',
    },
    stable: {
      kicker: 'Operação regular',
      title: 'Carteira estável',
      description: 'Clientes sem sinais imediatos de escalada na leitura atual.',
      badge: 'bg-emerald-100 text-emerald-700',
    },
  };

  return (
    <div className="min-h-screen bg-transparent text-[var(--ink)]">
      <TLPBanner />

      <div className="px-6 pb-10 pt-6 md:px-10 md:pt-8">
        <section className="app-panel mb-8 rounded-[34px] px-6 py-6 md:px-8 md:py-8">
          <div className="flex flex-wrap items-center gap-4">
            <OpiceLogo />
            <div>
              <p className="section-kicker">Admin command center</p>
              <h1 className="text-3xl font-bold text-[var(--ink)] md:text-4xl">Gestão de Incidentes</h1>
            </div>
            <span className="soft-ribbon rounded-full px-4 py-2 font-mono text-[10px] uppercase tracking-[0.22em]">Admin</span>
            <div className="ml-auto flex flex-wrap items-center gap-3">
              <button
                onClick={() => navigate('/admin/acessos')}
                className="btn-outline flex items-center gap-2 rounded-full text-xs uppercase tracking-[0.16em]"
                title="Gestão de acessos"
              >
                <Users size={15} /> Acessos
              </button>
              <button
                onClick={() => setShowNewModal(true)}
                className="btn-lime flex items-center gap-2 rounded-full text-xs uppercase tracking-[0.16em]"
              >
                <Plus size={15} /> Novo cliente
              </button>
              <button
                onClick={() => { logout(); navigate('/login'); }}
                className="btn-primary flex items-center gap-2 rounded-full text-xs uppercase tracking-[0.16em]"
              >
                <LogOut size={15} /> Sair
              </button>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-[24px] border border-[rgba(21,38,43,0.08)] bg-white/70 p-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-soft)]">Clientes ativos</p>
              <div className="mt-2 text-3xl font-bold text-[var(--ink)]">{clients.length}</div>
            </div>
            <div className="rounded-[24px] border border-[rgba(21,38,43,0.08)] bg-white/70 p-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-soft)]">Em crise</p>
              <div className="mt-2 text-3xl font-bold text-red-700">{groupedClients.critical.length}</div>
            </div>
            <div className="rounded-[24px] border border-[rgba(21,38,43,0.08)] bg-white/70 p-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-soft)]">Alertas SLA</p>
              <div className="mt-2 text-3xl font-bold text-amber-700">{slaAlerts}</div>
            </div>
            <div className="rounded-[24px] border border-[rgba(21,38,43,0.08)] bg-white/70 p-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-soft)]">Atividades em andamento</p>
              <div className="mt-2 text-3xl font-bold text-[var(--ink)]">{totalOngoing}</div>
            </div>
          </div>
        </section>

        {urgentAlerts.length > 0 ? (
          <section className="app-panel mb-8 overflow-hidden rounded-[30px]">
            <div className="soft-ribbon px-6 py-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/60">Queue</p>
              <h2 className="text-xl font-bold text-white">Atenção imediata</h2>
            </div>
            <div className="space-y-3 p-5">
              {urgentAlerts.map((alert) => (
                <div key={`${alert.id}-${alert.title}`} className={`flex flex-wrap items-center gap-4 rounded-[24px] border px-4 py-4 ${alert.tone}`}>
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/70">
                    <Shield size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold">{alert.title}</div>
                    <div className="mt-1 font-mono text-[11px] uppercase tracking-[0.16em] opacity-75">{alert.meta}</div>
                  </div>
                  <button onClick={() => handleAccess({ id: alert.id })} className="btn-primary flex items-center gap-2 rounded-full text-xs uppercase tracking-[0.16em]">
                    Acessar <ArrowRight size={12} />
                  </button>
                </div>
              ))}
            </div>
          </section>
        ) : (
          <section className="app-panel mb-8 rounded-[30px] border border-emerald-200 bg-emerald-50/78 px-5 py-4">
            <div className="flex items-center gap-3 text-emerald-800">
              <CheckCircle size={18} />
              <span className="text-sm font-semibold">Nenhum cliente exige intervenção imediata neste recorte.</span>
            </div>
          </section>
        )}

        {(['critical', 'attention', 'stable']).map((groupKey) => {
          const entries = groupedClients[groupKey];
          if (!entries.length) return null;
          const meta = sectionMeta[groupKey];

          return (
            <section key={groupKey} className="mb-9">
              <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="section-kicker">{meta.kicker}</p>
                  <h2 className="text-2xl font-bold text-[var(--ink)]">{meta.title}</h2>
                  <p className="mt-1 text-sm text-[var(--ink-soft)]">{meta.description}</p>
                </div>
                <span className={`rounded-full px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] ${meta.badge}`}>
                  {entries.length} cliente(s)
                </span>
              </div>
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                {entries.map(({ client, level }) => (
                  <ClientCard
                    key={client.id}
                    client={client}
                    level={level}
                    onAccess={handleAccess}
                    onEdit={handleEdit}
                    onDelete={setClientToDelete}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {toast && (
        <div className="fixed right-6 top-24 z-[100] animate-in slide-in-from-right-4 fade-in duration-300 pointer-events-none">
          <div className={`flex items-center gap-3 rounded-full border px-5 py-3 shadow-[0_18px_36px_rgba(21,38,43,0.18)] ${toast.type === 'success' ? 'bg-[linear-gradient(135deg,#ecffb0_0%,#d6ff63_48%,#b7ec23_100%)] border-[#d6ff63] text-[#15262b]' : 'bg-[#d45a58] border-[#d45a58] text-white'}`}>
            {toast.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
            <span className="text-sm font-semibold">{toast.message}</span>
          </div>
        </div>
      )}

      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#15262b]/45 p-4 backdrop-blur-sm">
          <div className="app-panel w-full max-w-xl overflow-hidden rounded-[32px]">
            <div className="soft-ribbon flex items-center justify-between px-6 py-4">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/60">Provisionamento</p>
                <h3 className="text-xl font-bold text-white">Novo cliente</h3>
              </div>
              <button onClick={() => setShowNewModal(false)} className="rounded-full bg-white/10 p-2 text-white/72 transition-colors hover:bg-white/16 hover:text-white">
                <X size={18} />
              </button>
            </div>
            <div className="grid gap-4 p-6 md:grid-cols-2">
              <div>
                <label className="mb-1 block font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-soft)]">Login / identificador *</label>
                <input type="text" value={newForm.name} onChange={(e) => setNewForm((form) => ({ ...form, name: e.target.value }))} className={inputClass} placeholder="cliente_exemplo" />
              </div>
              <div>
                <label className="mb-1 block font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-soft)]">Nome de exibição</label>
                <input type="text" value={newForm.displayName} onChange={(e) => setNewForm((form) => ({ ...form, displayName: e.target.value }))} className={inputClass} placeholder="Exemplo SA" />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-soft)]">Email *</label>
                <input type="email" value={newForm.email} onChange={(e) => setNewForm((form) => ({ ...form, email: e.target.value }))} className={inputClass} />
              </div>
              <div>
                <label className="mb-1 block font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-soft)]">Senha inicial</label>
                <input type="password" value={newForm.password} onChange={(e) => setNewForm((form) => ({ ...form, password: e.target.value }))} className={inputClass} />
                <p className="mt-2 text-xs text-[var(--ink-soft)]">Se ficar vazio, será usada a senha padrão `Opice@2025`.</p>
              </div>
              <div>
                <label className="mb-1 block font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-soft)]">Código do cliente</label>
                <input type="text" value={newForm.codigo} onChange={(e) => setNewForm((form) => ({ ...form, codigo: e.target.value }))} className={inputClass} placeholder="CLI-001" />
              </div>
              <div>
                <label className="mb-1 block font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-soft)]">Data do incidente</label>
                <input type="date" value={newForm.dataIncidente} onChange={(e) => setNewForm((form) => ({ ...form, dataIncidente: e.target.value }))} className={inputClass} />
              </div>
              <div>
                <label className="mb-1 block font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-soft)]">Agente de tratamento</label>
                <select value={newForm.agente} onChange={(e) => setNewForm((form) => ({ ...form, agente: e.target.value }))} className={inputClass}>
                  {AGENTE_OPTS.map((option) => <option key={option}>{option}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button onClick={() => setShowNewModal(false)} className="btn-outline flex-1 rounded-full">Cancelar</button>
              <button onClick={createClient} className="btn-primary flex-1 rounded-full">Criar cliente</button>
            </div>
          </div>
        </div>
      )}

      {editingClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#15262b]/45 p-4 backdrop-blur-sm">
          <div className="app-panel w-full max-w-xl overflow-hidden rounded-[32px]">
            <div className="soft-ribbon flex items-center justify-between px-6 py-4">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/60">Cadastro</p>
                <h3 className="flex items-center gap-2 text-xl font-bold text-white"><Edit2 size={16} /> Editar cliente</h3>
              </div>
              <button onClick={() => setEditingClient(null)} className="rounded-full bg-white/10 p-2 text-white/72 transition-colors hover:bg-white/16 hover:text-white">
                <X size={18} />
              </button>
            </div>
            <div className="grid gap-4 p-6 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-1 block font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-soft)]">Identificador</label>
                <input type="text" value={editingClient.id} disabled className={`${inputClass} opacity-60`} />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-soft)]">Nome de exibição *</label>
                <input type="text" value={editForm.displayName} onChange={(e) => setEditForm((form) => ({ ...form, displayName: e.target.value }))} className={inputClass} placeholder="Exemplo SA" />
              </div>
              <div>
                <label className="mb-1 block font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-soft)]">Código do cliente</label>
                <input type="text" value={editForm.codigo} onChange={(e) => setEditForm((form) => ({ ...form, codigo: e.target.value }))} className={inputClass} placeholder="CLI-001" />
              </div>
              <div>
                <label className="mb-1 block font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-soft)]">Data do incidente</label>
                <input type="date" value={editForm.dataIncidente} onChange={(e) => setEditForm((form) => ({ ...form, dataIncidente: e.target.value }))} className={inputClass} />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-soft)]">Agente de tratamento</label>
                <select value={editForm.agente} onChange={(e) => setEditForm((form) => ({ ...form, agente: e.target.value }))} className={inputClass}>
                  {AGENTE_OPTS.map((option) => <option key={option}>{option}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button onClick={() => setEditingClient(null)} className="btn-outline flex-1 rounded-full">Cancelar</button>
              <button onClick={saveEdit} className="btn-primary flex-1 rounded-full">Salvar alterações</button>
            </div>
          </div>
        </div>
      )}

      {clientToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#15262b]/45 p-4 backdrop-blur-sm">
          <div className="app-panel w-full max-w-xl overflow-hidden rounded-[32px] border border-red-200">
            <div className="flex items-center justify-between border-b border-red-200 bg-red-50/90 px-6 py-4">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-red-700">Ação sensível</p>
                <h3 className="mt-1 flex items-center gap-2 text-xl font-bold text-red-800"><Trash2 size={16} /> Excluir cliente</h3>
              </div>
              <button onClick={() => setClientToDelete(null)} className="rounded-full bg-white/70 p-2 text-red-700 transition-colors hover:bg-white">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-4 p-6">
              <p className="text-sm leading-6 text-[var(--ink-soft)]">
                Confirme a exclusão de <strong className="text-[var(--ink)]">{clientToDelete.displayName || clientToDelete.name}</strong> ({clientToDelete.id}).
                O cliente sairá da visão administrativa e os acessos vinculados serão revogados.
              </p>
              <div className="rounded-[24px] border border-amber-200 bg-amber-50/85 p-4 text-amber-800">
                <div className="flex items-start gap-3">
                  <AlertTriangle size={18} className="mt-0.5 shrink-0" />
                  <p className="text-sm leading-6">
                    Os dados do incidente permanecem no histórico lógico, mas o cliente deixa de aparecer na carteira ativa e em gestão de acessos.
                  </p>
                </div>
              </div>
              <div>
                <label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-soft)]">
                  Digite <strong>{clientToDelete.id}</strong> ou o nome exato para confirmar
                </label>
                <input type="text" value={deleteConfirmText} onChange={(e) => setDeleteConfirmText(e.target.value)} className={inputClass} placeholder={clientToDelete.id} />
              </div>
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button onClick={() => { setClientToDelete(null); setDeleteConfirmText(''); }} className="btn-outline flex-1 rounded-full">Cancelar</button>
              <button
                onClick={confirmDelete}
                disabled={!(deleteConfirmText === clientToDelete.id || deleteConfirmText === clientToDelete.name || deleteConfirmText === clientToDelete.displayName)}
                className="flex-1 rounded-full bg-red-600 px-5 py-2.5 font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Confirmar exclusão
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
