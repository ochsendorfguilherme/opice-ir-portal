import { createElement, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  Ban,
  CheckCircle,
  Clock3,
  Copy,
  Download,
  Edit2,
  History,
  Mail,
  Plus,
  Save,
  Search,
  Shield,
  ShieldOff,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getStorage, setStorage, KEYS, fetchClients, getAllInvites, updateInviteStatus } from '../utils/storage';
import { withPasswordHash } from '../utils/authSecurity';
import Sidebar from '../components/Sidebar';
import TLPBanner from '../components/TLPBanner';

const USER_TYPES = [
  { label: 'Todos', value: 'Todos' },
  { label: 'Admin', value: 'admin' },
  { label: 'Cliente', value: 'client' },
  { label: 'Convidado', value: 'Convidado' },
];

const TAB_ITEMS = [
  { id: 'users', label: 'Usuários ativos', icon: Users },
  { id: 'guests', label: 'Convidados por cliente', icon: UserPlus },
  { id: 'revoked', label: 'Acessos revogados', icon: ShieldOff },
  { id: 'logs', label: 'Log de atividade', icon: History },
];

const MODULES = [
  'Dashboard',
  'Informações do incidente',
  'Perguntas',
  'Jornada do incidente',
  'Reuniões',
  'ANPD',
  'PMO',
  'War Room',
];

const ROLE_LABEL = {
  admin: 'Admin',
  client: 'Cliente',
  Convidado: 'Convidado',
};

const STATUS_TONE = {
  Ativo: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  Suspenso: 'bg-amber-100 text-amber-700 border-amber-200',
  Revogado: 'bg-rose-100 text-rose-700 border-rose-200',
};

const SESSION_MOCK = [
  { id: 's1', device: 'Chrome • Windows', region: 'São Paulo, BR', status: 'Ativa', lastSeen: 'Agora mesmo' },
  { id: 's2', device: 'Edge • Windows', region: 'São Paulo, BR', status: 'Encerrada', lastSeen: 'Hoje, 08:22' },
];

function defaultModulesForRole(role) {
  if (role === 'admin') return [...MODULES];
  if (role === 'Convidado') return ['Dashboard', 'Reuniões'];
  return ['Dashboard', 'Informações do incidente', 'Perguntas', 'Jornada do incidente', 'Reuniões', 'ANPD', 'PMO'];
}

function normalizeUser(entry) {
  const role = entry?.role || 'client';
  const baseModules = Array.isArray(entry?.allowedModules) && entry.allowedModules.length > 0
    ? entry.allowedModules
    : defaultModulesForRole(role);

  return {
    createdAt: null,
    createdBy: 'Sistema',
    expiresAt: '',
    lastAccess: null,
    ...entry,
    cargo: entry?.cargo || '',
    phone: entry?.phone || entry?.telefone || '',
    status: entry?.status || 'Ativo',
    allowedModules: baseModules,
  };
}

function formatDate(value) {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '-';
  return new Intl.DateTimeFormat('pt-BR').format(parsed);
}

function formatDateTime(value) {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '-';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsed);
}

function getClientName(clients, clientId) {
  if (!clientId) return 'Não vinculado';
  return clients.find((client) => client.id === clientId)?.name || clientId;
}

function getRoleLabel(role) {
  return ROLE_LABEL[role] || role || 'Não definido';
}

function getUserInitial(user) {
  return String(user?.name || user?.email || 'U').trim().charAt(0).toUpperCase();
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function fieldInputClass(hasError = false) {
  return [
    'w-full rounded-[18px] border bg-white px-4 py-3 text-sm text-slate-700 outline-none transition-all',
    hasError ? 'border-rose-300 ring-2 ring-rose-100' : 'border-slate-200/90 focus:border-[#d6ff63] focus:ring-4 focus:ring-[#d6ff63]/20',
  ].join(' ');
}

function SummaryCard({ label, value, hint, tone = 'default' }) {
  const toneClass = tone === 'dark'
    ? 'border-white/10 bg-[linear-gradient(135deg,#14333d_0%,#204651_100%)] text-white'
    : 'border-slate-200/80 bg-white text-slate-900';

  return (
    <div className={`rounded-[28px] border p-5 shadow-[0_16px_40px_rgba(15,33,40,0.08)] ${toneClass}`}>
      <p className={`font-mono text-[11px] uppercase tracking-[0.26em] ${tone === 'dark' ? 'text-[#d6ff63]' : 'text-slate-500'}`}>{label}</p>
      <p className="mt-3 text-[34px] font-semibold leading-none">{value}</p>
      {hint && <p className={`mt-3 text-sm ${tone === 'dark' ? 'text-white/70' : 'text-slate-500'}`}>{hint}</p>}
    </div>
  );
}

function SectionHeader({ kicker, title, description, action }) {
  return (
    <div className="flex flex-col gap-4 rounded-[30px] border border-slate-200/80 bg-white px-6 py-5 shadow-[0_16px_40px_rgba(15,33,40,0.08)] lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.26em] text-slate-500">{kicker}</p>
        <h2 className="mt-2 text-[28px] font-semibold tracking-[-0.03em] text-slate-900">{title}</h2>
        {description && <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">{description}</p>}
      </div>
      {action}
    </div>
  );
}

function EmptyState({ icon, title, description }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[28px] border border-dashed border-slate-200 bg-slate-50/80 px-6 py-14 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-slate-400 shadow-[0_10px_25px_rgba(15,33,40,0.08)]">
        {icon ? createElement(icon, { size: 24 }) : null}
      </div>
      <h3 className="mt-5 text-lg font-semibold text-slate-800">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">{description}</p>
    </div>
  );
}

function DataTable({ columns, rows, emptyMessage }) {
  if (!rows.length) {
    return (
      <div className="rounded-[28px] border border-slate-200/80 bg-white p-6 shadow-[0_16px_40px_rgba(15,33,40,0.08)]">
        <p className="text-sm text-slate-500">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-[0_16px_40px_rgba(15,33,40,0.08)]">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50/80">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`px-6 py-4 font-mono text-[11px] uppercase tracking-[0.24em] text-slate-500 ${column.align === 'right' ? 'text-right' : 'text-left'}`}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => (
              <tr key={row.id} className="transition-colors hover:bg-[#f8faea]">
                {columns.map((column) => (
                  <td
                    key={`${row.id}-${column.key}`}
                    className={`px-6 py-5 align-top text-sm text-slate-700 ${column.align === 'right' ? 'text-right' : 'text-left'}`}
                  >
                    {column.render ? column.render(row) : row[column.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="mb-2 block font-mono text-[11px] uppercase tracking-[0.24em] text-slate-500">{label}</span>
      {children}
      {hint && <span className="mt-2 block text-xs leading-5 text-slate-500">{hint}</span>}
    </label>
  );
}

function InfoBlock({ label, value }) {
  return (
    <div className="rounded-[22px] border border-slate-200/80 bg-slate-50/80 p-4">
      <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-medium text-slate-700">{value}</p>
    </div>
  );
}

export default function AccessControl() {
  const { user: currentUser, logAction } = useAuth();
  const navigate = useNavigate();
  const toastTimerRef = useRef(null);

  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState(() => getStorage(KEYS.users(), []).map(normalizeUser));
  const [clients] = useState(() => fetchClients());
  const [accessLogs, setAccessLogs] = useState(() => getStorage(KEYS.accessLog(), []));
  const [invites, setInvites] = useState(() => getAllInvites());
  const [toast, setToast] = useState(null);
  const [newUserDefaultRole, setNewUserDefaultRole] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [revokingUser, setRevokingUser] = useState(null);
  const [rejectingInvite, setRejectingInvite] = useState(null);

  const notify = (type, message) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ type, message });
    toastTimerRef.current = setTimeout(() => setToast(null), 3200);
  };

  const handleSaveUsers = (nextUsers) => {
    const normalized = nextUsers.map(normalizeUser);
    setUsers(normalized);
    setStorage(KEYS.users(), normalized);
    setAccessLogs(getStorage(KEYS.accessLog(), []));
  };

  const handleCreateUser = async (draftUser) => {
    const normalizedEmail = draftUser.email.trim().toLowerCase();
    const duplicateEmail = users.some((entry) => String(entry.email || '').trim().toLowerCase() === normalizedEmail);

    if (duplicateEmail) {
      notify('error', 'Já existe um usuário com este e-mail.');
      return false;
    }

    const newUser = {
      id: `USR_${Date.now()}`,
      ...draftUser,
      email: normalizedEmail,
      name: draftUser.name.trim(),
      cargo: (draftUser.cargo || '').trim(),
      phone: (draftUser.phone || '').trim(),
      telefone: (draftUser.phone || '').trim(),
      clientId: draftUser.role === 'admin' ? null : draftUser.clientId || null,
      createdBy: currentUser?.email || 'Sistema',
      createdAt: new Date().toISOString(),
      status: draftUser.status || 'Ativo',
      lastAccess: null,
      allowedModules: draftUser.role === 'admin' ? [...MODULES] : draftUser.allowedModules,
      forcePasswordChange: Boolean(draftUser.forcePasswordChange),
    };

    const hashedUser = await withPasswordHash(newUser, draftUser.password);
    const updatedUsers = [...users, normalizeUser(hashedUser)];
    handleSaveUsers(updatedUsers);
    logAction('CRIADO', hashedUser, currentUser, `Usuário ${hashedUser.name} criado com perfil ${getRoleLabel(hashedUser.role)}.`);
    notify('success', 'Usuário criado com sucesso.');
    return true;
  };

  const handleUpdateUser = (draftUser) => {
    const normalizedEmail = draftUser.email.trim().toLowerCase();
    const originalEmail = String(draftUser.originalEmail || draftUser.email || '').trim().toLowerCase();
    const duplicateEmail = users.some((entry) => (
      String(entry.email || '').trim().toLowerCase() === normalizedEmail
      && String(entry.email || '').trim().toLowerCase() !== originalEmail
    ));

    if (duplicateEmail) {
      notify('error', 'Já existe outro usuário com este e-mail.');
      return false;
    }

    const updatedUsers = users.map((entry) => {
      const entryEmail = String(entry.email || '').trim().toLowerCase();
      if (entryEmail !== originalEmail) return entry;

      return normalizeUser({
        ...entry,
        ...draftUser,
        email: normalizedEmail,
        name: draftUser.name.trim(),
        cargo: (draftUser.cargo || '').trim(),
        phone: (draftUser.phone || '').trim(),
        telefone: (draftUser.phone || '').trim(),
        clientId: draftUser.role === 'admin' ? null : draftUser.clientId || null,
        allowedModules: draftUser.role === 'admin' ? [...MODULES] : draftUser.allowedModules,
      });
    });

    handleSaveUsers(updatedUsers);
    logAction('EDITADO', draftUser, currentUser, `Cadastro de ${draftUser.name} atualizado em gestão de acessos.`);
    notify('success', 'Usuário atualizado com sucesso.');
    return true;
  };

  const handleConfirmRevocation = (reason) => {
    if (!revokingUser) return;

    const updatedUsers = users.map((entry) => (
      entry.id === revokingUser.id
        ? {
            ...entry,
            status: 'Revogado',
            revokedAt: new Date().toISOString(),
            revocationReason: reason,
          }
        : entry
    ));

    handleSaveUsers(updatedUsers);
    logAction('REVOGADO', revokingUser, currentUser, reason);
    setRevokingUser(null);
    notify('success', 'Acesso revogado com sucesso.');
  };

  const handleRestoreUser = (targetUser) => {
    const updatedUsers = users.map((entry) => (
      entry.id === targetUser.id
        ? { ...entry, status: 'Suspenso', revokedAt: null, revocationReason: null }
        : entry
    ));

    handleSaveUsers(updatedUsers);
    logAction('RESTAURADO', targetUser, currentUser, 'Usuário restaurado para o status Suspenso.');
    notify('success', 'Usuário restaurado com status Suspenso.');
  };

  const handleInviteAction = async (invite, action, reason = '') => {
    if (action === 'approve') {
      const normalizedEmail = String(invite.email || '').trim().toLowerCase();
      const duplicateUser = users.some((entry) => String(entry.email || '').trim().toLowerCase() === normalizedEmail);

      if (duplicateUser) {
        notify('error', 'Este e-mail já está cadastrado como usuário.');
        return;
      }

      updateInviteStatus(invite.id, 'APROVADO');

      const guestUser = await withPasswordHash({
        id: `GUEST_${Date.now()}`,
        name: invite.name || invite.email,
        email: normalizedEmail,
        role: 'Convidado',
        cargo: invite.role || 'Convidado',
        clientId: invite.clientId || null,
        allowedModules: ['Dashboard', 'Reuniões'],
        status: 'Ativo',
        createdBy: currentUser?.email || 'Sistema',
        createdAt: new Date().toISOString(),
        lastAccess: null,
        forcePasswordChange: true,
      }, 'Opice@2025');

      handleSaveUsers([...users, normalizeUser(guestUser)]);
      setInvites(getAllInvites());
      logAction('APROVADO', invite, currentUser, `Convite aprovado e convertido em acesso para ${invite.email}.`);
      notify('success', 'Convite aprovado. O convidado já pode acessar com senha temporária.');
      return;
    }

    updateInviteStatus(invite.id, 'REJEITADO', reason);
    setInvites(getAllInvites());
    logAction('REJEITADO', invite, currentUser, reason || 'Convite rejeitado pelo administrador.');
    notify('success', 'Convite rejeitado com sucesso.');
  };

  const activeUsersCount = users.filter((entry) => entry.status === 'Ativo' && entry.role !== 'Convidado').length;
  const guestCount = users.filter((entry) => entry.status === 'Ativo' && entry.role === 'Convidado').length;
  const revokedCount = users.filter((entry) => entry.status === 'Revogado').length;
  const latestLog = accessLogs[0];

  return (
    <>
      <Sidebar isAdmin />
      <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(214,255,99,0.18),transparent_18%),linear-gradient(180deg,#f5f1e6_0%,#ece7db_100%)] pb-10 pl-[18.5rem] pr-8 pt-5">
        <TLPBanner />

        <div className="mx-auto mt-8 max-w-[1500px] space-y-7">
          <SectionHeader
            kicker="Painel administrativo"
            title="Gestão de acessos"
            description="Controle de usuários, convidados, permissões e auditoria. A tela foi reorganizada para priorizar leitura rápida, ações seguras e operação diária do administrador."
            action={
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => navigate('/admin')}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:text-slate-900"
                >
                  <ArrowLeft size={16} />
                  Voltar para admin
                </button>
                <button
                  onClick={() => setNewUserDefaultRole('Convidado')}
                  className="inline-flex items-center gap-2 rounded-full border border-[#d6ff63]/60 bg-[#ecffb0] px-5 py-3 text-sm font-semibold text-[#173039] transition-all hover:-translate-y-0.5"
                >
                  <UserPlus size={16} />
                  Novo convidado
                </button>
                <button
                  onClick={() => setNewUserDefaultRole('client')}
                  className="inline-flex items-center gap-2 rounded-full bg-[linear-gradient(135deg,#14333d_0%,#204651_100%)] px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_36px_rgba(15,33,40,0.16)] transition-all hover:-translate-y-0.5"
                >
                  <Plus size={16} />
                  Novo usuário
                </button>
              </div>
            }
          />

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <SummaryCard label="Usuários ativos" value={String(activeUsersCount)} hint="Admins e usuários cliente com acesso vigente." />
            <SummaryCard label="Convidados ativos" value={String(guestCount)} hint="Convidados aprovados e vinculados a clientes." />
            <SummaryCard label="Acessos revogados" value={String(revokedCount)} hint="Usuários desativados e auditados." />
            <SummaryCard
              label="Último evento"
              value={latestLog ? latestLog.action : '-'}
              hint={latestLog ? `${formatDateTime(latestLog.timestamp)} • ${latestLog.targetUser}` : 'Nenhum registro recente.'}
              tone="dark"
            />
          </section>

          <section className="rounded-[30px] border border-slate-200/80 bg-white p-3 shadow-[0_16px_40px_rgba(15,33,40,0.08)]">
            <div className="flex flex-wrap gap-2">
              {TAB_ITEMS.map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`inline-flex items-center gap-2 rounded-full px-4 py-3 text-sm font-semibold transition-all ${
                      active
                        ? 'bg-[linear-gradient(135deg,#14333d_0%,#204651_100%)] text-white shadow-[0_14px_32px_rgba(15,33,40,0.16)]'
                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <Icon size={16} className={active ? 'text-[#d6ff63]' : 'text-slate-500'} />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </section>

          {activeTab === 'users' && (
            <UsersTab
              users={users}
              clients={clients}
              onEdit={setEditingUser}
              onRevoke={setRevokingUser}
              notify={notify}
            />
          )}

          {activeTab === 'guests' && (
            <GuestsTab
              users={users}
              invites={invites}
              clients={clients}
              onAddGuest={() => setNewUserDefaultRole('Convidado')}
              onApprove={(invite) => void handleInviteAction(invite, 'approve')}
              onRequestReject={setRejectingInvite}
              notify={notify}
            />
          )}

          {activeTab === 'revoked' && (
            <RevokedTab users={users} clients={clients} onRestore={handleRestoreUser} />
          )}

          {activeTab === 'logs' && (
            <LogsTab logs={accessLogs} notify={notify} />
          )}
        </div>
      </main>

      {editingUser && (
        <UserSlideOver
          key={editingUser.id || editingUser.email}
          user={normalizeUser(editingUser)}
          clients={clients}
          onClose={() => setEditingUser(null)}
          onSave={(nextUser) => {
            const saved = handleUpdateUser(nextUser);
            if (saved) setEditingUser(null);
            return saved;
          }}
          notify={notify}
        />
      )}

      {newUserDefaultRole && (
        <NewUserModal
          key={newUserDefaultRole}
          defaultRole={newUserDefaultRole}
          clients={clients}
          onClose={() => setNewUserDefaultRole(null)}
          onSave={async (draftUser) => {
            const saved = await handleCreateUser(draftUser);
            if (saved) setNewUserDefaultRole(null);
            return saved;
          }}
        />
      )}

      {revokingUser && (
        <RevocationModal
          user={revokingUser}
          onClose={() => setRevokingUser(null)}
          onConfirm={handleConfirmRevocation}
        />
      )}

      {rejectingInvite && (
        <InviteRejectModal
          invite={rejectingInvite}
          onClose={() => setRejectingInvite(null)}
          onConfirm={(reason) => {
            void handleInviteAction(rejectingInvite, 'reject', reason);
            setRejectingInvite(null);
          }}
        />
      )}

      {toast && (
        <div className="fixed right-6 top-6 z-[70] rounded-[18px] border border-slate-200 bg-white px-4 py-3 shadow-[0_18px_40px_rgba(15,33,40,0.18)]">
          <div className="flex items-start gap-3">
            <div className={`mt-0.5 rounded-full p-1 ${toast.type === 'error' ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>
              {toast.type === 'error' ? <AlertTriangle size={14} /> : <CheckCircle size={14} />}
            </div>
            <p className="max-w-sm text-sm font-medium text-slate-700">{toast.message}</p>
          </div>
        </div>
      )}
    </>
  );
}

function UsersTab({ users, clients, onEdit, onRevoke, notify }) {
  const [search, setSearch] = useState('');
  const [userType, setUserType] = useState('Todos');
  const [selectedClient, setSelectedClient] = useState('Todos');

  const filteredUsers = useMemo(() => users.filter((entry) => {
    if (entry.role === 'Convidado') return false;
    if (entry.status === 'Revogado') return false;

    const matchSearch = !search || [entry.name, entry.email, entry.cargo]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(search.toLowerCase());

    const matchType = userType === 'Todos' || entry.role === userType;
    const matchClient = selectedClient === 'Todos' || entry.clientId === selectedClient;
    return matchSearch && matchType && matchClient;
  }), [users, search, userType, selectedClient]);

  const columns = [
    {
      key: 'user',
      label: 'Usuário',
      render: (entry) => (
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[linear-gradient(135deg,#14333d_0%,#295766_100%)] text-sm font-semibold text-[#d6ff63]">
            {getUserInitial(entry)}
          </div>
          <div>
            <p className="font-semibold text-slate-900">{entry.name || 'Sem nome'}</p>
            <p className="text-xs text-slate-500">{entry.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'perfil',
      label: 'Perfil',
      render: (entry) => (
        <div className="space-y-2">
          <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
            {getRoleLabel(entry.role)}
          </span>
          <p className="text-xs text-slate-500">{entry.cargo || 'Cargo não informado'}</p>
        </div>
      ),
    },
    {
      key: 'cliente',
      label: 'Cliente',
      render: (entry) => <span>{getClientName(clients, entry.clientId)}</span>,
    },
    {
      key: 'ultimoAcesso',
      label: 'Último acesso',
      render: (entry) => (
        <div>
          <p>{formatDateTime(entry.lastAccess)}</p>
          <p className="mt-1 text-xs text-slate-500">{entry.status || 'Ativo'}</p>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (entry) => (
        <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${STATUS_TONE[entry.status] || STATUS_TONE.Ativo}`}>
          {entry.status || 'Ativo'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Ações',
      align: 'right',
      render: (entry) => (
        <div className="flex justify-end gap-2">
          <button
            onClick={() => onEdit(entry)}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:text-slate-900"
          >
            <Edit2 size={14} />
            Editar
          </button>
          <button
            onClick={() => onRevoke(entry)}
            className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 transition-colors hover:bg-rose-100"
          >
            <Ban size={14} />
            Revogar
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <SectionHeader
        kicker="Usuários internos e cliente"
        title="Base ativa de acessos"
        description="Filtre rapidamente por perfil, cliente e busca textual. As ações principais ficam na própria linha de cada usuário para reduzir clique desnecessário."
      />

      <div className="rounded-[30px] border border-slate-200/80 bg-white p-5 shadow-[0_16px_40px_rgba(15,33,40,0.08)]">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_220px_240px]">
          <label className="relative block">
            <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por nome, e-mail ou cargo"
              className="w-full rounded-[18px] border border-slate-200 bg-slate-50 pl-11 pr-4 py-3 text-sm text-slate-700 outline-none transition-all focus:border-[#d6ff63] focus:bg-white focus:ring-4 focus:ring-[#d6ff63]/20"
            />
          </label>

          <select
            value={userType}
            onChange={(event) => setUserType(event.target.value)}
            className={fieldInputClass()}
          >
            {USER_TYPES.map((type) => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>

          <select
            value={selectedClient}
            onChange={(event) => setSelectedClient(event.target.value)}
            className={fieldInputClass()}
          >
            <option value="Todos">Todos os clientes</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>{client.name}</option>
            ))}
          </select>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-slate-500">
          <span className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-2 font-medium text-slate-600">
            <Users size={15} />
            {filteredUsers.length} usuário(s) filtrado(s)
          </span>
          <button
            onClick={() => notify('success', 'Filtro copiado para uso operacional.')}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-2 font-medium text-slate-600 transition-colors hover:bg-slate-50"
          >
            <Copy size={14} />
            Compartilhar recorte
          </button>
        </div>
      </div>

      {filteredUsers.length ? (
        <DataTable columns={columns} rows={filteredUsers} emptyMessage="Nenhum usuário encontrado." />
      ) : (
        <EmptyState
          icon={Users}
          title="Nenhum usuário corresponde ao filtro"
          description="Ajuste os filtros ou crie um novo usuário para iniciar o controle de acessos deste cliente."
        />
      )}
    </div>
  );
}
function GuestsTab({ users, invites, clients, onAddGuest, onApprove, onRequestReject, notify }) {
  const activeGuests = useMemo(
    () => users.filter((entry) => entry.role === 'Convidado' && entry.status !== 'Revogado'),
    [users],
  );
  const pendingInvites = useMemo(
    () => invites.filter((invite) => invite.status === 'PENDENTE_APROVACAO_ADMIN'),
    [invites],
  );

  const guestColumns = [
    {
      key: 'name',
      label: 'Convidado',
      render: (entry) => (
        <div>
          <p className="font-semibold text-slate-900">{entry.name || 'Sem nome'}</p>
          <p className="mt-1 text-xs text-slate-500">{entry.email}</p>
        </div>
      ),
    },
    {
      key: 'role',
      label: 'E-mail / cargo',
      render: (entry) => (
        <div>
          <p>{entry.email}</p>
          <p className="mt-1 text-xs text-slate-500">{entry.cargo || 'Convidado'}</p>
        </div>
      ),
    },
    {
      key: 'clientId',
      label: 'Cliente vinculado',
      render: (entry) => getClientName(clients, entry.clientId),
    },
    {
      key: 'lastAccess',
      label: 'Último acesso',
      render: (entry) => formatDateTime(entry.lastAccess),
    },
    {
      key: 'actions',
      label: 'Ações',
      align: 'right',
      render: (entry) => (
        <button
          onClick={async () => {
            const ok = await copyText(entry.email);
            notify(ok ? 'success' : 'error', ok ? 'E-mail copiado para a área de transferência.' : 'Não foi possível copiar o e-mail.');
          }}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:text-slate-900"
        >
          <Copy size={14} />
          Copiar e-mail
        </button>
      ),
    },
  ];

  const inviteColumns = [
    {
      key: 'name',
      label: 'Convidado',
      render: (invite) => (
        <div>
          <p className="font-semibold text-slate-900">{invite.name || 'Sem nome'}</p>
          <p className="mt-1 text-xs text-slate-500">{invite.email}</p>
        </div>
      ),
    },
    {
      key: 'role',
      label: 'Cliente vinculado',
      render: (invite) => getClientName(clients, invite.clientId),
    },
    {
      key: 'message',
      label: 'Mensagem',
      render: (invite) => invite.message || 'Sem mensagem adicional.',
    },
    {
      key: 'createdAt',
      label: 'Solicitado em',
      render: (invite) => formatDateTime(invite.createdAt),
    },
    {
      key: 'actions',
      label: 'Ações',
      align: 'right',
      render: (invite) => (
        <div className="flex justify-end gap-2">
          <button
            onClick={() => onApprove(invite)}
            className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-100"
          >
            <CheckCircle size={14} />
            Aprovar
          </button>
          <button
            onClick={() => onRequestReject(invite)}
            className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 transition-colors hover:bg-rose-100"
          >
            <X size={14} />
            Rejeitar
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <SectionHeader
        kicker="Convidados e aprovações"
        title="Acessos vinculados a clientes"
        description="Acompanhe convites pendentes e convidados já liberados. A separação abaixo deixa claro o que ainda depende de aprovação e o que já está ativo."
        action={
          <button
            onClick={onAddGuest}
            className="inline-flex items-center gap-2 rounded-full bg-[linear-gradient(135deg,#14333d_0%,#204651_100%)] px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_36px_rgba(15,33,40,0.16)] transition-all hover:-translate-y-0.5"
          >
            <UserPlus size={16} />
            Criar convidado
          </button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <SummaryCard label="Convidados ativos" value={String(activeGuests.length)} hint="Acessos liberados e com vínculo de cliente." />
        <SummaryCard label="Convites pendentes" value={String(pendingInvites.length)} hint="Aguardando aprovação do administrador." tone="dark" />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="space-y-4">
          <div className="rounded-[26px] border border-slate-200/80 bg-[linear-gradient(135deg,#14333d_0%,#204651_100%)] px-5 py-4 text-white shadow-[0_16px_40px_rgba(15,33,40,0.16)]">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#d6ff63]/18 text-[#d6ff63]">
                <UserPlus size={18} />
              </div>
              <div>
                <p className="font-semibold">Convidados ativos</p>
                <p className="text-sm text-white/65">Usuários convidados já vinculados a clientes.</p>
              </div>
            </div>
          </div>
          {activeGuests.length ? (
            <DataTable columns={guestColumns} rows={activeGuests} emptyMessage="Nenhum convidado ativo." />
          ) : (
            <EmptyState
              icon={UserPlus}
              title="Nenhum convidado ativo"
              description="Use o botão acima para criar um convidado ou aprove convites pendentes desta carteira."
            />
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-[26px] border border-slate-200/80 bg-white px-5 py-4 shadow-[0_16px_40px_rgba(15,33,40,0.08)]">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                <Clock3 size={18} />
              </div>
              <div>
                <p className="font-semibold text-slate-900">Convites pendentes</p>
                <p className="text-sm text-slate-500">Pendências aguardando decisão do administrador.</p>
              </div>
            </div>
          </div>
          {pendingInvites.length ? (
            <DataTable columns={inviteColumns} rows={pendingInvites} emptyMessage="Nenhum convite pendente." />
          ) : (
            <EmptyState
              icon={Mail}
              title="Nenhum convite pendente"
              description="Quando um cliente solicitar um novo convidado, o fluxo de aprovação vai aparecer aqui."
            />
          )}
        </div>
      </div>
    </div>
  );
}

function RevokedTab({ users, clients, onRestore }) {
  const revokedUsers = useMemo(
    () => users.filter((entry) => entry.status === 'Revogado'),
    [users],
  );

  const columns = [
    {
      key: 'name',
      label: 'Usuário',
      render: (entry) => (
        <div>
          <p className="font-semibold text-slate-900">{entry.name || 'Sem nome'}</p>
          <p className="mt-1 text-xs text-slate-500">{entry.email}</p>
        </div>
      ),
    },
    {
      key: 'clientId',
      label: 'Cliente',
      render: (entry) => getClientName(clients, entry.clientId),
    },
    {
      key: 'revokedAt',
      label: 'Revogado em',
      render: (entry) => formatDateTime(entry.revokedAt),
    },
    {
      key: 'reason',
      label: 'Motivo',
      render: (entry) => entry.revocationReason || 'Não informado',
    },
    {
      key: 'actions',
      label: 'Ações',
      align: 'right',
      render: (entry) => (
        <button
          onClick={() => onRestore(entry)}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:text-slate-900"
        >
          <Shield size={14} />
          Restaurar
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <SectionHeader
        kicker="Histórico de revogação"
        title="Acessos bloqueados"
        description="Use esta visão para auditar revogações e, quando necessário, restaurar o usuário com status Suspenso para nova revisão."
      />

      {revokedUsers.length ? (
        <DataTable columns={columns} rows={revokedUsers} emptyMessage="Nenhum acesso revogado." />
      ) : (
        <EmptyState
          icon={ShieldOff}
          title="Nenhum acesso revogado"
          description="As revogações confirmadas vão aparecer aqui com motivo e data da ação."
        />
      )}
    </div>
  );
}

function LogsTab({ logs, notify }) {
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('Todos');

  const actionOptions = useMemo(
    () => ['Todos', ...Array.from(new Set(logs.map((entry) => entry.action).filter(Boolean)))],
    [logs],
  );

  const filteredLogs = useMemo(() => logs.filter((entry) => {
    const haystack = [entry.action, entry.targetUser, entry.performedBy, entry.details]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    const matchSearch = !search || haystack.includes(search.toLowerCase());
    const matchAction = actionFilter === 'Todos' || entry.action === actionFilter;
    return matchSearch && matchAction;
  }), [logs, search, actionFilter]);

  const exportCsv = () => {
    if (!filteredLogs.length) {
      notify('error', 'Não há registros para exportar.');
      return;
    }

    const lines = [
      ['timestamp', 'action', 'targetUser', 'performedBy', 'details'].join(','),
      ...filteredLogs.map((entry) => [
        JSON.stringify(entry.timestamp || ''),
        JSON.stringify(entry.action || ''),
        JSON.stringify(entry.targetUser || ''),
        JSON.stringify(entry.performedBy || ''),
        JSON.stringify(entry.details || ''),
      ].join(',')),
    ];

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'access-log.csv';
    anchor.click();
    URL.revokeObjectURL(url);
    notify('success', 'CSV do log exportado com sucesso.');
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        kicker="Auditoria"
        title="Log de atividade"
        description="Eventos de criação, edição, aprovação, revogação e login ficam organizados abaixo em ordem cronológica para consulta rápida."
        action={
          <button
            onClick={exportCsv}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:text-slate-900"
          >
            <Download size={16} />
            Exportar CSV
          </button>
        }
      />

      <div className="rounded-[30px] border border-slate-200/80 bg-white p-5 shadow-[0_16px_40px_rgba(15,33,40,0.08)]">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_260px]">
          <label className="relative block">
            <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por ação, usuário ou detalhes"
              className="w-full rounded-[18px] border border-slate-200 bg-slate-50 pl-11 pr-4 py-3 text-sm text-slate-700 outline-none transition-all focus:border-[#d6ff63] focus:bg-white focus:ring-4 focus:ring-[#d6ff63]/20"
            />
          </label>

          <select
            value={actionFilter}
            onChange={(event) => setActionFilter(event.target.value)}
            className={fieldInputClass()}
          >
            {actionOptions.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </div>
      </div>

      {filteredLogs.length ? (
        <div className="space-y-4">
          {filteredLogs.map((entry) => (
            <div
              key={entry.id}
              className="rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-[0_16px_40px_rgba(15,33,40,0.08)]"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="inline-flex rounded-full bg-[linear-gradient(135deg,#14333d_0%,#204651_100%)] px-3 py-1 text-xs font-semibold text-white">
                      {entry.action}
                    </span>
                    <span className="text-sm text-slate-500">{formatDateTime(entry.timestamp)}</span>
                  </div>
                  <p className="text-lg font-semibold text-slate-900">{entry.targetUser}</p>
                  <p className="text-sm leading-6 text-slate-600">{entry.details || 'Sem detalhes adicionais.'}</p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[320px]">
                  <InfoBlock label="Responsável" value={entry.performedBy || 'Sistema'} />
                  <InfoBlock label="Identificador" value={String(entry.id)} />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={History}
          title="Nenhum registro encontrado"
          description="Ajuste os filtros ou aguarde novas ações para acompanhar a trilha de auditoria desta área."
        />
      )}
    </div>
  );
}
function UserSlideOver({ user, clients, onClose, onSave, notify }) {
  const [activeTab, setActiveTab] = useState('dados');
  const [form, setForm] = useState(() => ({
    ...user,
    originalEmail: user.email,
    role: user.role || 'client',
    clientId: user.clientId || '',
    cargo: user.cargo || '',
    phone: user.phone || user.telefone || '',
    status: user.status || 'Ativo',
    allowedModules: user.role === 'admin' ? [...MODULES] : [...(user.allowedModules || defaultModulesForRole(user.role))],
    expiresAt: user.expiresAt || '',
  }));

  const setField = (field, value) => {
    setForm((current) => {
      const next = { ...current, [field]: value };
      if (field === 'role') {
        next.allowedModules = value === 'admin' ? [...MODULES] : defaultModulesForRole(value);
        if (value === 'admin') next.clientId = '';
      }
      return next;
    });
  };

  const toggleModule = (moduleName) => {
    setForm((current) => {
      const alreadySelected = current.allowedModules.includes(moduleName);
      return {
        ...current,
        allowedModules: alreadySelected
          ? current.allowedModules.filter((entry) => entry !== moduleName)
          : [...current.allowedModules, moduleName],
      };
    });
  };

  const handleSave = () => {
    const payload = {
      ...form,
      email: form.email.trim().toLowerCase(),
      name: form.name.trim(),
      cargo: form.cargo.trim(),
      phone: form.phone.trim(),
      telefone: form.phone.trim(),
      clientId: form.role === 'admin' ? null : form.clientId || null,
      allowedModules: form.role === 'admin' ? [...MODULES] : form.allowedModules,
    };
    onSave(payload);
  };

  return (
    <div className="fixed inset-0 z-[60] bg-[#0f2027]/40 backdrop-blur-sm">
      <button className="absolute inset-0" onClick={onClose} aria-label="Fechar" />

      <aside className="absolute right-0 top-0 h-full w-full max-w-[620px] overflow-y-auto border-l border-white/10 bg-[#f6f2e9] shadow-[0_30px_80px_rgba(15,33,40,0.24)]">
        <div className="sticky top-0 z-10 border-b border-slate-200/80 bg-[linear-gradient(135deg,#14333d_0%,#325560_100%)] px-8 py-7 text-white">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#d6ff63] text-lg font-semibold text-[#173039]">
                {getUserInitial(user)}
              </div>
              <div>
                <p className="text-[28px] font-semibold tracking-[-0.03em]">{user.name}</p>
                <p className="mt-1 text-sm text-white/70">{getRoleLabel(user.role)} • {user.email}</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="rounded-full bg-white/8 p-3 text-white/70 transition-colors hover:bg-white/12 hover:text-white"
            >
              <X size={18} />
            </button>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            {[
              { id: 'dados', label: 'Dados' },
              { id: 'permissoes', label: 'Permissões' },
              { id: 'validade', label: 'Validade' },
              { id: 'sessoes', label: 'Sessões' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition-all ${
                  activeTab === tab.id ? 'bg-[#d6ff63] text-[#173039]' : 'bg-white/8 text-white/70 hover:bg-white/12 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-6 px-8 py-8">
          {activeTab === 'dados' && (
            <div className="space-y-6">
              <div className="grid gap-5 md:grid-cols-2">
                <Field label="Nome completo">
                  <input value={form.name} onChange={(event) => setField('name', event.target.value)} className={fieldInputClass()} />
                </Field>
                <Field label="E-mail">
                  <input value={form.email} onChange={(event) => setField('email', event.target.value)} className={fieldInputClass()} />
                </Field>
                <Field label="Tipo de usuário">
                  <select value={form.role} onChange={(event) => setField('role', event.target.value)} className={fieldInputClass()}>
                    <option value="admin">Admin</option>
                    <option value="client">Cliente</option>
                    <option value="Convidado">Convidado</option>
                  </select>
                </Field>
                <Field label="Cliente vinculado" hint="Opcional para administradores.">
                  <select
                    value={form.clientId || ''}
                    onChange={(event) => setField('clientId', event.target.value)}
                    disabled={form.role === 'admin'}
                    className={`${fieldInputClass()} ${form.role === 'admin' ? 'cursor-not-allowed bg-slate-100 text-slate-400' : ''}`}
                  >
                    <option value="">Não vinculado</option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>{client.name}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Cargo / função">
                  <input value={form.cargo} onChange={(event) => setField('cargo', event.target.value)} placeholder="Ex.: DPO, Analista TI" className={fieldInputClass()} />
                </Field>
                <Field label="Telefone">
                  <input value={form.phone} onChange={(event) => setField('phone', event.target.value)} placeholder="(11) 99999-0000" className={fieldInputClass()} />
                </Field>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <InfoBlock label="Data de criação" value={formatDateTime(form.createdAt)} />
                <InfoBlock label="Criado por" value={form.createdBy || 'Sistema'} />
                <InfoBlock label="Último acesso" value={formatDateTime(form.lastAccess)} />
              </div>
            </div>
          )}

          {activeTab === 'permissoes' && (
            <div className="space-y-6">
              <div className="rounded-[26px] border border-slate-200/80 bg-white p-5 shadow-[0_16px_40px_rgba(15,33,40,0.08)]">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-lg font-semibold text-slate-900">Módulos liberados</p>
                    <p className="mt-1 text-sm text-slate-500">Selecione quais frentes ficam visíveis para este usuário.</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                    {form.role === 'admin' ? 'Admin possui acesso total' : `${form.allowedModules.length} módulo(s)`}
                  </span>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  {MODULES.map((moduleName) => {
                    const checked = form.role === 'admin' || form.allowedModules.includes(moduleName);
                    return (
                      <button
                        key={moduleName}
                        type="button"
                        disabled={form.role === 'admin'}
                        onClick={() => toggleModule(moduleName)}
                        className={`flex items-center justify-between rounded-[20px] border px-4 py-3 text-left transition-all ${
                          checked
                            ? 'border-[#d6ff63]/70 bg-[#f8faea] text-slate-900'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                        } ${form.role === 'admin' ? 'cursor-not-allowed opacity-90' : ''}`}
                      >
                        <span className="text-sm font-medium">{moduleName}</span>
                        <span className={`flex h-6 w-6 items-center justify-center rounded-full ${checked ? 'bg-[#d6ff63] text-[#173039]' : 'bg-slate-100 text-slate-400'}`}>
                          {checked ? <CheckCircle size={14} /> : <Plus size={14} />}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <InfoBlock label="Perfil atual" value={getRoleLabel(form.role)} />
                <InfoBlock label="Cliente de contexto" value={getClientName(clients, form.clientId)} />
              </div>
            </div>
          )}

          {activeTab === 'validade' && (
            <div className="space-y-6">
              <div className="grid gap-5 md:grid-cols-2">
                <Field label="Status">
                  <select value={form.status} onChange={(event) => setField('status', event.target.value)} className={fieldInputClass()}>
                    <option value="Ativo">Ativo</option>
                    <option value="Suspenso">Suspenso</option>
                    <option value="Revogado">Revogado</option>
                  </select>
                </Field>
                <Field label="Validade do acesso" hint="Opcional. Use para acessos temporários.">
                  <input type="date" value={form.expiresAt || ''} onChange={(event) => setField('expiresAt', event.target.value)} className={fieldInputClass()} />
                </Field>
              </div>

              <div className="rounded-[26px] border border-slate-200/80 bg-white p-5 shadow-[0_16px_40px_rgba(15,33,40,0.08)]">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold text-slate-900">Gerenciamento de senha</p>
                    <p className="mt-1 text-sm text-slate-500">Envie um link de redefinição ou force a troca obrigatória no próximo acesso.</p>
                  </div>
                  <button
                    onClick={() => notify('success', 'Link de redefinição preparado para envio manual.')}
                    className="inline-flex items-center gap-2 rounded-full border border-[#d6ff63]/60 bg-[#ecffb0] px-4 py-3 text-sm font-semibold text-[#173039] transition-all hover:-translate-y-0.5"
                  >
                    <Mail size={16} />
                    Enviar link de redefinição
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'sessoes' && (
            <div className="space-y-6">
              <div className="rounded-[26px] border border-slate-200/80 bg-[linear-gradient(135deg,#14333d_0%,#204651_100%)] p-5 text-white shadow-[0_16px_40px_rgba(15,33,40,0.16)]">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold">Sessões recentes</p>
                    <p className="mt-1 text-sm text-white/65">Visão operacional simplificada para auditoria local do portal.</p>
                  </div>
                  <button
                    onClick={() => notify('success', 'Sessões locais encerradas para este usuário.')}
                    className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/14"
                  >
                    <ShieldOff size={16} />
                    Encerrar sessões
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                {SESSION_MOCK.map((session) => (
                  <div key={session.id} className="rounded-[24px] border border-slate-200/80 bg-white p-5 shadow-[0_16px_40px_rgba(15,33,40,0.08)]">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <p className="font-semibold text-slate-900">{session.device}</p>
                        <p className="mt-1 text-sm text-slate-500">{session.region}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${session.status === 'Ativa' ? STATUS_TONE.Ativo : 'border-slate-200 bg-slate-100 text-slate-600'}`}>
                          {session.status}
                        </span>
                        <span className="text-sm text-slate-500">{session.lastSeen}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="sticky bottom-0 border-t border-slate-200/80 bg-[#f6f2e9]/95 px-8 py-5 backdrop-blur">
          <div className="flex flex-wrap justify-end gap-3">
            <button
              onClick={onClose}
              className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:text-slate-900"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              className="inline-flex items-center gap-2 rounded-full bg-[linear-gradient(135deg,#d6ff63_0%,#bce53b_100%)] px-5 py-3 text-sm font-semibold text-[#173039] shadow-[0_16px_34px_rgba(190,234,62,0.22)] transition-all hover:-translate-y-0.5"
            >
              <Save size={16} />
              Salvar alterações
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}
function NewUserModal({ defaultRole, clients, onClose, onSave }) {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState(() => ({
    name: '',
    email: '',
    role: defaultRole || 'client',
    clientId: '',
    cargo: '',
    phone: '',
    allowedModules: defaultModulesForRole(defaultRole || 'client'),
    password: '',
    confirmPassword: '',
    forcePasswordChange: true,
    status: 'Ativo',
    expiresAt: '',
  }));

  const setField = (field, value) => {
    setError('');
    setForm((current) => {
      const next = { ...current, [field]: value };
      if (field === 'role') {
        next.allowedModules = defaultModulesForRole(value);
        if (value === 'admin') next.clientId = '';
      }
      return next;
    });
  };

  const toggleModule = (moduleName) => {
    setForm((current) => {
      const alreadySelected = current.allowedModules.includes(moduleName);
      return {
        ...current,
        allowedModules: alreadySelected
          ? current.allowedModules.filter((entry) => entry !== moduleName)
          : [...current.allowedModules, moduleName],
      };
    });
  };

  const validateStep = () => {
    if (step === 0) {
      if (!form.name.trim() || !form.email.trim()) {
        setError('Preencha nome e e-mail para continuar.');
        return false;
      }
      if (form.role !== 'admin' && !form.clientId) {
        setError('Selecione o cliente vinculado para este acesso.');
        return false;
      }
      return true;
    }

    if (step === 1) {
      if (!form.password || !form.confirmPassword) {
        setError('Defina a senha temporária e confirme a senha.');
        return false;
      }
      if (form.password !== form.confirmPassword) {
        setError('As senhas informadas não coincidem.');
        return false;
      }
      return true;
    }

    return true;
  };

  const handleNext = async () => {
    if (!validateStep()) return;

    if (step < 2) {
      setStep((current) => current + 1);
      return;
    }

    setSaving(true);
    const saved = await onSave(form);
    setSaving(false);
    if (saved) onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#0f2027]/45 p-6 backdrop-blur-sm">
      <div className="w-full max-w-[980px] rounded-[34px] border border-slate-200/80 bg-[#f6f2e9] shadow-[0_30px_80px_rgba(15,33,40,0.24)]">
        <div className="border-b border-slate-200/80 px-8 py-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.26em] text-slate-500">Novo cadastro</p>
              <h2 className="mt-2 text-[30px] font-semibold tracking-[-0.03em] text-slate-900">
                {form.role === 'Convidado' ? 'Novo convidado' : 'Novo usuário'}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">Fluxo em três etapas para cadastro, permissões e revisão final.</p>
            </div>

            <button
              onClick={onClose}
              className="rounded-full border border-slate-200 bg-white p-3 text-slate-500 transition-colors hover:border-slate-300 hover:text-slate-800"
            >
              <X size={18} />
            </button>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            {['Dados básicos', 'Acessos e segurança', 'Revisão final'].map((label, index) => (
              <div
                key={label}
                className={`rounded-[22px] border px-4 py-4 ${step === index ? 'border-[#d6ff63]/80 bg-[#f8faea]' : 'border-slate-200 bg-white'}`}
              >
                <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-slate-500">Etapa {index + 1}</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">{label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="px-8 py-8">
          {step === 0 && (
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Nome completo">
                <input value={form.name} onChange={(event) => setField('name', event.target.value)} className={fieldInputClass()} />
              </Field>
              <Field label="E-mail">
                <input value={form.email} onChange={(event) => setField('email', event.target.value)} className={fieldInputClass()} />
              </Field>
              <Field label="Tipo de usuário">
                <select value={form.role} onChange={(event) => setField('role', event.target.value)} className={fieldInputClass()}>
                  <option value="admin">Admin</option>
                  <option value="client">Cliente</option>
                  <option value="Convidado">Convidado</option>
                </select>
              </Field>
              <Field label="Cliente vinculado" hint="Obrigatório para clientes e convidados.">
                <select
                  value={form.clientId}
                  onChange={(event) => setField('clientId', event.target.value)}
                  disabled={form.role === 'admin'}
                  className={`${fieldInputClass()} ${form.role === 'admin' ? 'cursor-not-allowed bg-slate-100 text-slate-400' : ''}`}
                >
                  <option value="">Selecione</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>{client.name}</option>
                  ))}
                </select>
              </Field>
              <Field label="Cargo / função">
                <input value={form.cargo} onChange={(event) => setField('cargo', event.target.value)} className={fieldInputClass()} />
              </Field>
              <Field label="Telefone">
                <input value={form.phone} onChange={(event) => setField('phone', event.target.value)} className={fieldInputClass()} />
              </Field>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-6">
              <div className="grid gap-5 md:grid-cols-2">
                <Field label="Senha temporária">
                  <input type="password" value={form.password} onChange={(event) => setField('password', event.target.value)} className={fieldInputClass()} />
                </Field>
                <Field label="Confirmar senha">
                  <input type="password" value={form.confirmPassword} onChange={(event) => setField('confirmPassword', event.target.value)} className={fieldInputClass()} />
                </Field>
                <Field label="Status inicial">
                  <select value={form.status} onChange={(event) => setField('status', event.target.value)} className={fieldInputClass()}>
                    <option value="Ativo">Ativo</option>
                    <option value="Suspenso">Suspenso</option>
                  </select>
                </Field>
                <Field label="Validade do acesso">
                  <input type="date" value={form.expiresAt} onChange={(event) => setField('expiresAt', event.target.value)} className={fieldInputClass()} />
                </Field>
              </div>

              <div className="rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-[0_16px_40px_rgba(15,33,40,0.08)]">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-lg font-semibold text-slate-900">Módulos liberados</p>
                    <p className="mt-1 text-sm text-slate-500">Ajuste os acessos de acordo com o perfil deste usuário.</p>
                  </div>
                  <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-600">
                    <input
                      type="checkbox"
                      checked={form.forcePasswordChange}
                      onChange={(event) => setField('forcePasswordChange', event.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-[#173039] focus:ring-[#d6ff63]"
                    />
                    Forçar troca de senha
                  </label>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  {MODULES.map((moduleName) => {
                    const checked = form.role === 'admin' || form.allowedModules.includes(moduleName);
                    return (
                      <button
                        key={moduleName}
                        type="button"
                        disabled={form.role === 'admin'}
                        onClick={() => toggleModule(moduleName)}
                        className={`flex items-center justify-between rounded-[20px] border px-4 py-3 text-left transition-all ${
                          checked
                            ? 'border-[#d6ff63]/70 bg-[#f8faea] text-slate-900'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                        } ${form.role === 'admin' ? 'cursor-not-allowed opacity-90' : ''}`}
                      >
                        <span className="text-sm font-medium">{moduleName}</span>
                        <span className={`flex h-6 w-6 items-center justify-center rounded-full ${checked ? 'bg-[#d6ff63] text-[#173039]' : 'bg-slate-100 text-slate-400'}`}>
                          {checked ? <CheckCircle size={14} /> : <Plus size={14} />}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="grid gap-5 md:grid-cols-2">
              <InfoBlock label="Nome" value={form.name || '-'} />
              <InfoBlock label="E-mail" value={form.email || '-'} />
              <InfoBlock label="Perfil" value={getRoleLabel(form.role)} />
              <InfoBlock label="Cliente" value={form.role === 'admin' ? 'Não vinculado' : getClientName(clients, form.clientId)} />
              <InfoBlock label="Cargo" value={form.cargo || 'Não informado'} />
              <InfoBlock label="Telefone" value={form.phone || 'Não informado'} />
              <InfoBlock label="Status inicial" value={form.status} />
              <InfoBlock label="Validade" value={form.expiresAt ? formatDate(form.expiresAt) : 'Sem validade definida'} />
              <div className="md:col-span-2 rounded-[26px] border border-slate-200/80 bg-white p-5 shadow-[0_16px_40px_rgba(15,33,40,0.08)]">
                <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-slate-500">Módulos liberados</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(form.role === 'admin' ? MODULES : form.allowedModules).map((moduleName) => (
                    <span key={moduleName} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
                      {moduleName}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-6 rounded-[20px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
              {error}
            </div>
          )}
        </div>

        <div className="border-t border-slate-200/80 px-8 py-5">
          <div className="flex flex-wrap justify-between gap-3">
            <button
              onClick={() => (step === 0 ? onClose() : setStep((current) => current - 1))}
              className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:text-slate-900"
            >
              {step === 0 ? 'Cancelar' : 'Voltar'}
            </button>

            <button
              onClick={() => void handleNext()}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-full bg-[linear-gradient(135deg,#14333d_0%,#204651_100%)] px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_36px_rgba(15,33,40,0.16)] transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {saving ? 'Salvando...' : step === 2 ? 'Criar usuário' : 'Continuar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function RevocationModal({ user, onClose, onConfirm }) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const handleConfirm = () => {
    if (!reason.trim()) {
      setError('Informe o motivo da revogação para manter o histórico de auditoria.');
      return;
    }
    onConfirm(reason.trim());
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#0f2027]/45 p-6 backdrop-blur-sm">
      <div className="w-full max-w-[560px] rounded-[34px] border border-slate-200/80 bg-[#f6f2e9] shadow-[0_30px_80px_rgba(15,33,40,0.24)]">
        <div className="border-b border-slate-200/80 px-8 py-7">
          <p className="font-mono text-[11px] uppercase tracking-[0.26em] text-slate-500">Revogar acesso</p>
          <h2 className="mt-2 text-[28px] font-semibold tracking-[-0.03em] text-slate-900">Confirmar revogação</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">Você está revogando o acesso de {user.name}. Esta ação vai mover o cadastro para a área de auditoria.</p>
        </div>

        <div className="px-8 py-7">
          <Field label="Motivo da revogação">
            <textarea
              value={reason}
              onChange={(event) => {
                setReason(event.target.value);
                setError('');
              }}
              rows={5}
              className={fieldInputClass(Boolean(error))}
              placeholder="Ex.: desligamento, encerramento do contrato, revisão de escopo."
            />
          </Field>

          {error && (
            <div className="mt-4 rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
              {error}
            </div>
          )}
        </div>

        <div className="border-t border-slate-200/80 px-8 py-5">
          <div className="flex flex-wrap justify-end gap-3">
            <button
              onClick={onClose}
              className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:text-slate-900"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirm}
              className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-5 py-3 text-sm font-semibold text-rose-700 transition-colors hover:bg-rose-100"
            >
              <Ban size={16} />
              Confirmar revogação
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function InviteRejectModal({ invite, onClose, onConfirm }) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const handleConfirm = () => {
    if (!reason.trim()) {
      setError('Informe o motivo da rejeição para concluir a decisão.');
      return;
    }
    onConfirm(reason.trim());
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#0f2027]/45 p-6 backdrop-blur-sm">
      <div className="w-full max-w-[560px] rounded-[34px] border border-slate-200/80 bg-[#f6f2e9] shadow-[0_30px_80px_rgba(15,33,40,0.24)]">
        <div className="border-b border-slate-200/80 px-8 py-7">
          <p className="font-mono text-[11px] uppercase tracking-[0.26em] text-slate-500">Convite pendente</p>
          <h2 className="mt-2 text-[28px] font-semibold tracking-[-0.03em] text-slate-900">Rejeitar convite</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">Informe o motivo para rejeitar o convite de {invite.name || invite.email}.</p>
        </div>

        <div className="px-8 py-7">
          <Field label="Motivo da rejeição">
            <textarea
              value={reason}
              onChange={(event) => {
                setReason(event.target.value);
                setError('');
              }}
              rows={5}
              className={fieldInputClass(Boolean(error))}
              placeholder="Ex.: escopo encerrado, e-mail incorreto, acesso fora de política."
            />
          </Field>

          {error && (
            <div className="mt-4 rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
              {error}
            </div>
          )}
        </div>

        <div className="border-t border-slate-200/80 px-8 py-5">
          <div className="flex flex-wrap justify-end gap-3">
            <button
              onClick={onClose}
              className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:text-slate-900"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirm}
              className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-5 py-3 text-sm font-semibold text-rose-700 transition-colors hover:bg-rose-100"
            >
              <X size={16} />
              Rejeitar convite
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
