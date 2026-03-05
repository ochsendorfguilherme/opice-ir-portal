import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Plus, Search, Filter, MoreHorizontal, User, Mail, Users,
    Shield, AlertTriangle, CheckCircle, Clock, Edit2,
    ShieldOff, Trash2, X, ChevronRight, Copy, Save,
    Eye, EyeOff, Layout, List, History, Download,
    ExternalLink, UserPlus, Ban, ArrowLeft, ArrowUpRight
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getStorage, setStorage, KEYS, fetchClients, getAllInvites, updateInviteStatus } from '../utils/storage';
import Sidebar from '../components/Sidebar';
import TLPBanner from '../components/TLPBanner';

const USER_TYPES = ['Todos', 'Admin', 'Cliente', 'Convidado'];
const STATUS_TYPES = ['Ativo', 'Suspenso', 'Revogado'];


export default function AccessControl() {
    const { user: currentUser, logAction } = useAuth();
    const navigate = useNavigate();

    const [activeTab, setActiveTab] = useState(0);
    const [users, setUsers] = useState([]);
    const [clients, setClients] = useState([]);
    const [accessLogs, setAccessLogs] = useState([]);
    const [invites, setInvites] = useState([]);
    const [toast, setToast] = useState(null);

    // States for Modals/Slide-overs
    const [newUserDefaultRole, setNewUserDefaultRole] = useState(null); // null means modal is hidden
    const [editingUser, setEditingUser] = useState(null);
    const [revokingUser, setRevokingUser] = useState(null);

    useEffect(() => {
        loadData();
    }, []);

    function loadData() {
        const loadedUsers = getStorage(KEYS.users(), []);
        const loadedClients = fetchClients();
        const loadedLogs = getStorage(KEYS.accessLog(), []);
        setUsers(loadedUsers);
        setClients(loadedClients);
        setAccessLogs(loadedLogs);

        const fetchedInvites = getAllInvites();
        setInvites(fetchedInvites);
    }

    const handleSaveUsers = (newUsers) => {
        setUsers(newUsers);
        setStorage(KEYS.users(), newUsers);
        // Reload logs as they might have been updated by other components
        setAccessLogs(getStorage(KEYS.accessLog(), []));
    };

    const notify = (type, message) => {
        setToast({ type, message });
        setTimeout(() => setToast(null), 3000);
    };

    const handleCreateUser = (newUser) => {
        const updatedUsers = [...users, newUser];
        handleSaveUsers(updatedUsers);
        logAction('CRIADO', newUser, currentUser, `Usuário ${newUser.name} criado com perfil ${newUser.role}`);
    };

    const handleUpdateUser = (updatedUser) => {
        const updatedUsers = users.map(u => u.email === updatedUser.email ? updatedUser : u);
        handleSaveUsers(updatedUsers);
        logAction('EDITADO', updatedUser, currentUser, `Perfil de ${updatedUser.name} atualizado`);
    };

    const handleConfirmRevocation = (reason, type) => {
        const updatedUsers = users.map(u =>
            u.email === revokingUser.email ? {
                ...u,
                status: 'Revogado',
                revocationReason: reason,
                revocationType: type,
                revocationDate: new Date().toISOString(),
                revokedBy: currentUser.name
            } : u
        );
        handleSaveUsers(updatedUsers);
        logAction('REVOGADO', revokingUser, currentUser, `Motivo: ${reason} (${type})`);
        notify('success', `Acesso de ${revokingUser.name} revogado.`);
        setRevokingUser(null);
    };

    const handleInviteAction = (inviteId, action, formData = null) => {
        if (action === 'approve') {
            const invite = invites.find(i => i.id === inviteId);
            if (!invite) return;

            // Check if user already exists
            const existingUserIndex = users.findIndex(u => u.email === invite.email);

            let updatedUsers;
            if (existingUserIndex >= 0) {
                // User exists, just update their client and role
                updatedUsers = [...users];
                updatedUsers[existingUserIndex] = {
                    ...updatedUsers[existingUserIndex],
                    role: 'Convidado',
                    clientId: invite.clientId,
                    status: 'Ativo'
                };
            } else {
                // Create new user
                const newUser = {
                    name: invite.name,
                    email: invite.email,
                    role: 'Convidado',
                    cargo: invite.role || 'Convidado',
                    clientId: invite.clientId,
                    status: 'Ativo',
                    password: 'Opice@2025',
                    forcePasswordChange: true,
                    permissions: {
                        dashboard: { visualizar: true, editar: false, exportar: false },
                        informacoes: { visualizar: true, editar: false, exportar: false }
                    }
                };
                updatedUsers = [newUser, ...users];
            }

            handleSaveUsers(updatedUsers);
            updateInviteStatus(inviteId, 'APROVADO');
            logAction('CONVITE', invite.email, currentUser, `Convite aprovado por admin e usuário criado/vinculado nativamente para o cliente ${invite.clientId}.`);
            notify('success', `Convite aprovado e acesso liberado para ${invite.email}.`);

        } else if (action === 'reject') {
            updateInviteStatus(inviteId, 'REJEITADO', formData || 'Rejeitado pelo administrador');
            const invite = invites.find(i => i.id === inviteId);
            logAction('CONVITE', invite?.email || inviteId, currentUser, `Convite rejeitado.`);
            notify('success', `Convite rejeitado.`);
        }

        // Refresh invites
        setInvites(getAllInvites());
    };

    return (
        <div className="min-h-screen bg-[#0A0A0A] text-white flex">
            <Sidebar isAdmin={true} />

            <main className="flex-1 ml-64 flex flex-col min-w-0">
                <TLPBanner />

                {/* Header */}
                <header className="px-8 py-6 border-b border-white/5 flex items-center justify-between bg-[#111111]">
                    <div className="flex items-center gap-6">
                        <button onClick={() => navigate('/admin')} className="flex items-center gap-2 px-4 h-10 bg-white/5 hover:bg-white/10 text-white transition-all rounded-sm border border-white/10 group font-mono text-xs uppercase tracking-wider">
                            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                            Voltar para Admin
                        </button>
                        <div>
                            <h1 className="font-syne font-bold text-2xl uppercase tracking-tight">Gestão de Acessos</h1>
                            <p className="text-gray-500 font-dm text-sm mt-1">Controle de usuários, permissões e auditoria</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setNewUserDefaultRole('client')}
                        className="flex items-center gap-2 bg-[#CAFF00] text-[#111111] font-dm font-bold px-5 py-2.5 rounded-sm hover:opacity-90 transition-all active:scale-95 shadow-[0_0_20px_rgba(202,255,0,0.15)]"
                    >
                        <Plus size={18} />
                        NOVO USUÁRIO
                    </button>
                </header>

                {/* Tabs */}
                <div className="px-8 mt-6">
                    <div className="flex gap-8 border-b border-white/5">
                        {[
                            { label: 'Usuários Ativos', icon: Users },
                            { label: 'Convidados por Cliente', icon: UserPlus },
                            { label: 'Acessos Revogados', icon: ShieldOff },
                            { label: 'Log de Atividade', icon: History }
                        ].map((tab, idx) => (
                            <button
                                key={idx}
                                onClick={() => setActiveTab(idx)}
                                className={`flex items-center gap-2 py-4 font-mono text-xs uppercase tracking-widest transition-all relative ${activeTab === idx ? 'text-[#CAFF00]' : 'text-gray-500 hover:text-gray-300'
                                    }`}
                            >
                                <tab.icon size={14} />
                                {tab.label}
                                {activeTab === idx && (
                                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#CAFF00]" />
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content Area */}
                <div className="p-8 flex-1">
                    {activeTab === 0 && (
                        <UsersTab
                            users={users}
                            onEdit={setEditingUser}
                            onRevoke={setRevokingUser}
                            onSave={handleSaveUsers}
                            notify={notify}
                            clients={clients}
                        />
                    )}
                    {activeTab === 1 && (
                        <GuestsTab
                            clients={clients}
                            users={users}
                            invites={invites}
                            onSave={handleSaveUsers}
                            onInviteAction={handleInviteAction}
                            notify={notify}
                            currentUser={currentUser}
                            onAddGuest={() => setNewUserDefaultRole('Convidado')}
                        />
                    )}
                    {activeTab === 2 && <RevokedTab users={users} onRestore={handleSaveUsers} notify={notify} />}
                    {activeTab === 3 && <LogsTab logs={accessLogs} />}
                </div>
            </main>

            {/* Slide-overs & Modals */}
            <UserSlideOver
                user={editingUser}
                onClose={() => setEditingUser(null)}
                onSave={handleUpdateUser}
                clients={clients}
                notify={notify}
            />

            <NewUserModal
                show={newUserDefaultRole !== null}
                defaultRole={newUserDefaultRole || 'client'}
                onClose={() => setNewUserDefaultRole(null)}
                onSave={handleCreateUser}
                clients={clients}
                notify={notify}
                currentUser={currentUser}
            />

            <RevocationModal
                user={revokingUser}
                onClose={() => setRevokingUser(null)}
                onConfirm={handleConfirmRevocation}
            />

            {toast && (
                <div className={`fixed top-24 right-8 z-[100] animate-in slide-in-from-right-4 fade-in duration-300 pointer-events-none`}>
                    <div className={`px-5 py-3 shadow-2xl flex items-center gap-3 border ${toast.type === 'success' ? 'bg-[#CAFF00] border-[#CAFF00] text-[#111111]' : 'bg-red-600 border-red-600 text-white'}`}>
                        {toast.type === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
                        <span className="font-dm text-sm font-medium">{toast.message}</span>
                    </div>
                </div>
            )}
        </div>
    );
}

function UsersTab({ users, onEdit, onRevoke, onSave, notify, clients }) {
    const [search, setSearch] = useState('');
    const [type, setType] = useState('Todos');
    const [client, setClient] = useState('Todos');

    const filteredUsers = useMemo(() => {
        return users.filter(u => {
            if (u.status === 'Revogado') return false;
            const matchesSearch = u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
            const matchesType = type === 'Todos' || u.role.toLowerCase() === type.toLowerCase();
            const matchesClient = client === 'Todos' || u.clientId === client;
            return matchesSearch && matchesType && matchesClient;
        });
    }, [users, search, type, client]);

    const toggleStatus = (targetUser) => {
        const newStatus = targetUser.status === 'Ativo' ? 'Suspenso' : 'Ativo';
        const updated = users.map(u =>
            u.email === targetUser.email ? { ...u, status: newStatus } : u
        );
        onSave(updated);
        notify('success', `Status de ${targetUser.name} alterado para ${newStatus}`);
    };

    return (
        <div className="space-y-6">
            {/* Filters */}
            <div className="flex flex-wrap gap-4 items-end bg-[#111111] p-4 border border-white/5">
                <div className="flex-1 min-w-[240px]">
                    <label className="block font-mono text-[10px] uppercase text-gray-500 mb-1.5 ml-1">Buscar usuário</label>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input
                            type="text"
                            placeholder="Nome ou e-mail..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full bg-[#0A0A0A] border border-white/10 px-10 py-2 font-dm text-sm focus:border-[#CAFF00] focus:outline-none transition-all"
                        />
                    </div>
                </div>

                <div className="w-48">
                    <label className="block font-mono text-[10px] uppercase text-gray-500 mb-1.5 ml-1">Tipo</label>
                    <select
                        value={type}
                        onChange={e => setType(e.target.value)}
                        className="w-full bg-[#0A0A0A] border border-white/10 px-3 py-2 font-dm text-sm focus:border-[#CAFF00] focus:outline-none transition-all"
                    >
                        {USER_TYPES.map(t => <option key={t}>{t}</option>)}
                    </select>
                </div>

                <div className="w-64">
                    <label className="block font-mono text-[10px] uppercase text-gray-500 mb-1.5 ml-1">Cliente Vinculado</label>
                    <select
                        value={client}
                        onChange={e => setClient(e.target.value)}
                        className="w-full bg-[#0A0A0A] border border-white/10 px-3 py-2 font-dm text-sm focus:border-[#CAFF00] focus:outline-none transition-all"
                    >
                        <option value="Todos">Todos os clientes</option>
                        {clients.map(c => <option key={c.id} value={c.id}>{c.displayName || c.name}</option>)}
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="bg-[#111111] border border-white/5 overflow-hidden">
                <table className="w-full border-collapse">
                    <thead>
                        <tr className="border-b border-white/5 bg-white/5">
                            <th className="px-6 py-4 text-left font-mono text-[10px] uppercase text-gray-400 tracking-wider">Usuário</th>
                            <th className="px-6 py-4 text-left font-mono text-[10px] uppercase text-gray-400 tracking-wider">Email</th>
                            <th className="px-6 py-4 text-left font-mono text-[10px] uppercase text-gray-400 tracking-wider">Tipo</th>
                            <th className="px-6 py-4 text-left font-mono text-[10px] uppercase text-gray-400 tracking-wider">Cliente</th>
                            <th className="px-6 py-4 text-left font-mono text-[10px] uppercase text-gray-400 tracking-wider">Último Acesso</th>
                            <th className="px-6 py-4 text-left font-mono text-[10px] uppercase text-gray-400 tracking-wider">Status</th>
                            <th className="px-6 py-4 text-right font-mono text-[10px] uppercase text-gray-400 tracking-wider">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {filteredUsers.map((u, i) => {
                            const lastAccessDate = u.lastAccess ? new Date(u.lastAccess) : null;
                            const isInactive = lastAccessDate && (new Date() - lastAccessDate) > (30 * 24 * 60 * 60 * 1000);

                            return (
                                <tr key={i} className="hover:bg-white/[0.02] transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-[#CAFF00] flex items-center justify-center text-[#111111] font-syne font-bold text-xs">
                                                {u.name?.[0]?.toUpperCase()}
                                            </div>
                                            <span className="font-dm text-sm font-medium">{u.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2 group/email text-gray-400 hover:text-white transition-colors cursor-pointer" onClick={() => {
                                            navigator.clipboard.writeText(u.email);
                                            notify('success', 'Email copiado!');
                                        }}>
                                            <span className="font-dm text-sm">{u.email}</span>
                                            <Copy size={12} className="opacity-0 group-hover/email:opacity-100 transition-opacity" />
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-0.5 font-mono text-[10px] uppercase font-bold ${u.role === 'admin' ? 'bg-[#CAFF00] text-[#111111]' :
                                            u.role === 'client' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                                                'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                                            }`}>
                                            {u.role}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="font-dm text-sm text-gray-400">
                                            {clients.find(c => c.id === u.clientId)?.displayName || '—'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            {isInactive && <AlertTriangle size={14} className="text-amber-500" />}
                                            <span className={`font-mono text-xs ${isInactive ? 'text-amber-500' : 'text-gray-400'}`}>
                                                {u.lastAccess ? new Date(u.lastAccess).toLocaleDateString() : 'Nunca'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <button
                                            onClick={() => toggleStatus(u)}
                                            className={`px-3 py-1 font-mono text-[10px] uppercase font-bold border rounded-full transition-all ${u.status === 'Ativo' ? 'bg-green-500/10 text-green-500 border-green-500/20 hover:bg-green-500/20' :
                                                'bg-amber-500/10 text-amber-500 border-amber-500/20 hover:bg-amber-500/20'
                                                }`}
                                        >
                                            {u.status || 'Ativo'}
                                        </button>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => onEdit(u)} className="p-1.5 text-gray-400 hover:text-[#CAFF00] transition-colors" title="Editar Profile">
                                                <Edit2 size={16} />
                                            </button>
                                            <button onClick={() => onRevoke(u)} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors" title="Revogar Acesso">
                                                <ShieldOff size={16} />
                                            </button>
                                            <button className="p-1.5 text-gray-400 hover:text-red-600 transition-colors" title="Excluir Definitivamente">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function GuestsTab({ clients, users, invites, onSave, onInviteAction, notify, currentUser, onAddGuest }) {
    const guests = useMemo(() => {
        return users.filter(u => u.role === 'Convidado' && u.status !== 'Revogado');
    }, [users]);

    const toggleStatus = (targetUser) => {
        const newStatus = targetUser.status === 'Ativo' ? 'Suspenso' : 'Ativo';
        const updated = users.map(u =>
            u.email === targetUser.email ? { ...u, status: newStatus } : u
        );
        onSave(updated);
        notify('success', `Status de ${targetUser.name} alterado para ${newStatus}`);
    };

    return (
        <div className="space-y-12">
            {/* Active Guests Section */}
            <div className="space-y-6">
                <div className="flex justify-between items-center bg-[#111111] p-4 border border-white/5">
                    <div>
                        <h3 className="font-syne font-bold text-sm uppercase tracking-tight text-white flex items-center gap-2">
                            <UserPlus size={16} className="text-[#CAFF00]" /> Convidados Ativos
                        </h3>
                        <p className="font-mono text-[9px] text-gray-500 uppercase tracking-widest mt-0.5">
                            Usuários convidados vinculados a clientes
                        </p>
                    </div>
                </div>

                <div className="bg-[#111111] border border-white/5 overflow-hidden">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="border-b border-white/5 bg-white/5">
                                <th className="px-6 py-4 text-left font-mono text-[10px] uppercase text-gray-400 tracking-wider">Convidado</th>
                                <th className="px-6 py-4 text-left font-mono text-[10px] uppercase text-gray-400 tracking-wider">Email/Cargo</th>
                                <th className="px-6 py-4 text-left font-mono text-[10px] uppercase text-gray-400 tracking-wider">Cliente</th>
                                <th className="px-6 py-4 text-left font-mono text-[10px] uppercase text-gray-400 tracking-wider">Último Acesso</th>
                                <th className="px-6 py-4 text-left font-mono text-[10px] uppercase text-gray-400 tracking-wider">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {guests.map((u, i) => (
                                <tr key={i} className="hover:bg-white/[0.02] transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-[#CAFF00] flex items-center justify-center text-[#111111] font-syne font-bold text-xs">
                                                {u.name?.[0]?.toUpperCase()}
                                            </div>
                                            <span className="font-dm text-sm font-medium">{u.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="text-gray-400 font-dm text-sm">{u.email}</span>
                                            <span className="text-gray-600 font-mono text-[9px] uppercase">{u.cargo || 'Convidado'}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="font-dm text-sm text-gray-300 border border-white/10 bg-white/5 px-2 py-0.5 rounded-full whitespace-nowrap">
                                            {clients.find(c => c.id === u.clientId)?.displayName || u.clientId || '—'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="font-mono text-xs text-gray-400">
                                            {u.lastAccess ? new Date(u.lastAccess).toLocaleDateString() : 'Nunca'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <button
                                            onClick={() => toggleStatus(u)}
                                            className={`px-3 py-1 font-mono text-[10px] uppercase font-bold border rounded-full transition-all ${u.status === 'Ativo' ? 'bg-green-500/10 text-green-500 border-green-500/20 hover:bg-green-500/20' :
                                                'bg-amber-500/10 text-amber-500 border-amber-500/20 hover:bg-amber-500/20'
                                                }`}
                                        >
                                            {u.status || 'Ativo'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pending Invites Section - Only for Admins */}
            {(currentUser?.role === 'admin' || currentUser?.role === 'system') && (
                <div className="space-y-6">
                    <div className="flex justify-between items-center bg-[#111111] p-4 border border-white/5">
                        <div>
                            <h3 className="font-syne font-bold text-sm uppercase tracking-tight text-white flex items-center gap-2">
                                <Clock size={16} className="text-amber-500" /> Convites Pendentes
                            </h3>
                            <p className="font-mono text-[9px] text-gray-500 uppercase tracking-widest mt-0.5">
                                Aguardando aprovação do administrador
                            </p>
                        </div>
                    </div>

                    <div className="bg-[#111111] border border-white/5 overflow-hidden">
                        <table className="w-full border-collapse text-sm">
                            <thead>
                                <tr className="border-b border-white/5 bg-white/5">
                                    <th className="px-6 py-4 text-left font-mono text-[10px] uppercase text-gray-400 tracking-wider">Convidado</th>
                                    <th className="px-6 py-4 text-left font-mono text-[10px] uppercase text-gray-400 tracking-wider">Email/Cargo</th>
                                    <th className="px-6 py-4 text-left font-mono text-[10px] uppercase text-gray-400 tracking-wider">Cliente Vinculado</th>
                                    <th className="px-6 py-4 text-left font-mono text-[10px] uppercase text-gray-400 tracking-wider">Mensagem</th>
                                    <th className="px-6 py-4 text-right font-mono text-[10px] uppercase text-gray-400 tracking-wider">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {invites.filter(i => i.status === 'PENDENTE_APROVACAO_ADMIN').length === 0 ? (
                                    <tr><td colSpan="5" className="px-6 py-8 text-center text-gray-500 italic text-xs">Nenhum convite pendente.</td></tr>
                                ) : invites.filter(i => i.status === 'PENDENTE_APROVACAO_ADMIN').map(inv => (
                                    <tr key={inv.id} className="hover:bg-white/[0.02]">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_8px_currentColor] animate-pulse" />
                                                <span className="font-dm text-sm font-medium text-white">{inv.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-gray-400 font-dm">{inv.email}</span>
                                                <span className="text-gray-600 font-mono text-[9px] uppercase">{inv.role || 'Convidado'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="font-dm text-sm text-amber-500 border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 rounded-full whitespace-nowrap">
                                                {clients.find(c => c.id === inv.clientId)?.displayName || inv.clientId || '—'}
                                            </span>
                                            <div className="font-mono text-[9px] text-gray-500 mt-1">Por: {inv.createdBy}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-gray-400 font-dm text-xs italic max-w-[200px] truncate" title={inv.message}>
                                                {inv.message ? `"${inv.message}"` : 'Sem mensagem'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => onInviteAction(inv.id, 'approve')}
                                                    className="bg-green-600 border border-green-500 text-white px-3 py-1.5 font-dm text-xs font-bold uppercase tracking-wider hover:bg-green-500 transition-colors shadow-[0_0_10px_rgba(22,163,74,0.2)] flex items-center gap-1"
                                                >
                                                    <CheckCircle size={14} /> Aprovar
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        const reason = window.prompt("Motivo da rejeição (opcional):");
                                                        if (reason !== null) onInviteAction(inv.id, 'reject', reason);
                                                    }}
                                                    className="bg-red-900/30 border border-red-900/50 text-red-500 hover:text-white px-3 py-1.5 font-dm text-xs font-bold uppercase tracking-wider hover:bg-red-600 transition-colors flex items-center gap-1"
                                                >
                                                    <X size={14} /> Rejeitar
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}

function RevokedTab({ users, onRestore, notify }) {
    const revokedUsers = useMemo(() => users.filter(u => u.status === 'Revogado'), [users]);

    const handleRestore = (user) => {
        const updated = users.map(u =>
            u.email === user.email ? { ...u, status: 'Suspenso' } : u
        );
        onRestore(updated);
        notify('success', `Acesso de ${user.name} restaurado como Suspenso.`);
    };

    return (
        <div className="bg-[#111111] border border-white/5 overflow-hidden">
            <table className="w-full border-collapse text-sm">
                <thead>
                    <tr className="border-b border-white/5 bg-white/5">
                        <th className="px-6 py-4 text-left font-mono text-[10px] uppercase text-gray-400 tracking-wider">Usuário</th>
                        <th className="px-6 py-4 text-left font-mono text-[10px] uppercase text-gray-400 tracking-wider">Tipo/Cliente</th>
                        <th className="px-6 py-4 text-left font-mono text-[10px] uppercase text-gray-400 tracking-wider">Revogado em</th>
                        <th className="px-6 py-4 text-left font-mono text-[10px] uppercase text-gray-400 tracking-wider">Por/Motivo</th>
                        <th className="px-6 py-4 text-right font-mono text-[10px] uppercase text-gray-400 tracking-wider">Ações</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                    {revokedUsers.length === 0 ? (
                        <tr>
                            <td colSpan="5" className="px-6 py-12 text-center text-gray-500 italic opacity-50">Nenhum registro encontrado</td>
                        </tr>
                    ) : revokedUsers.map(u => (
                        <tr key={u.email} className="hover:bg-red-500/[0.01]">
                            <td className="px-6 py-4">
                                <div className="flex flex-col">
                                    <span className="font-dm font-bold">{u.name}</span>
                                    <span className="text-gray-600 text-[10px] font-mono">{u.email}</span>
                                </div>
                            </td>
                            <td className="px-6 py-4 font-mono text-xs uppercase text-gray-400">
                                {u.role} {u.clientId ? `(${u.clientId})` : ''}
                            </td>
                            <td className="px-6 py-4 font-mono text-xs text-gray-500">
                                {u.revocationDate ? new Date(u.revocationDate).toLocaleDateString() : '—'}
                            </td>
                            <td className="px-6 py-4">
                                <div className="flex flex-col">
                                    <span className="text-red-400/80 font-dm text-xs font-bold uppercase">{u.revocationReason || 'Desligamento'}</span>
                                    <span className="text-gray-600 text-[10px] italic">por {u.revokedBy || 'admin'}</span>
                                </div>
                            </td>
                            <td className="px-6 py-4 text-right">
                                <button
                                    onClick={() => handleRestore(u)}
                                    className="bg-white/5 border border-white/10 px-4 py-1.5 font-mono text-[10px] uppercase tracking-widest hover:bg-[#CAFF00] hover:text-[#111111] hover:border-[#CAFF00] transition-all"
                                >
                                    Restaurar Acesso
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

const MODULOS = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'jornada', label: 'Jornada do Incidente' },
    { id: 'perguntas', label: 'Perguntas' },
    { id: 'informacoes', label: 'Informações' },
    { id: 'reunioes', label: 'Reuniões' },
    { id: 'anpd', label: 'ANPD' },
    { id: 'pmo', label: 'PMO' },
    { id: 'warroom', label: 'WarRoom' }
];

function LogsTab({ logs }) {
    const [filter, setFilter] = useState('Todos');

    const filteredLogs = useMemo(() => {
        if (filter === 'Todos') return logs;
        return logs.filter(l => l.action === filter);
    }, [logs, filter]);

    const getBadgeColor = (action) => {
        switch (action) {
            case 'CRIADO': return 'bg-green-500/20 text-green-400 border-green-500/30';
            case 'EDITADO': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
            case 'SUSPENSO': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
            case 'REVOGADO': return 'bg-red-500/20 text-red-400 border-red-500/30';
            case 'RESTAURADO': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
            case 'LOGIN': return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
            case 'CONVITE': return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30';
            case 'PERMISSÃO ALTERADA': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
            default: return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div className="flex gap-2">
                    {['Todos', 'CRIADO', 'EDITADO', 'SUSPENSO', 'REVOGADO', 'LOGIN'].map(act => (
                        <button
                            key={act}
                            onClick={() => setFilter(act)}
                            className={`px-3 py-1.5 font-mono text-[10px] uppercase border transition-all ${filter === act ? 'bg-[#CAFF00] text-[#111111] border-[#CAFF00]' : 'bg-white/5 text-gray-500 border-white/10 hover:border-white/20'
                                }`}
                        >
                            {act}
                        </button>
                    ))}
                </div>
                <button className="flex items-center gap-2 text-gray-400 hover:text-white font-mono text-[10px] uppercase transition-colors">
                    <Download size={14} /> EXPORTAR LOG CSV
                </button>
            </div>

            <div className="bg-[#111111] border border-white/5">
                <table className="w-full border-collapse">
                    <thead>
                        <tr className="border-b border-white/5 bg-white/5">
                            <th className="px-6 py-4 text-left font-mono text-[10px] uppercase text-gray-400 tracking-wider">Data/Hora</th>
                            <th className="px-6 py-4 text-left font-mono text-[10px] uppercase text-gray-400 tracking-wider">Ação</th>
                            <th className="px-6 py-4 text-left font-mono text-[10px] uppercase text-gray-400 tracking-wider">Usuário Afetado</th>
                            <th className="px-6 py-4 text-left font-mono text-[10px] uppercase text-gray-400 tracking-wider">Realizado por</th>
                            <th className="px-6 py-4 text-left font-mono text-[10px] uppercase text-gray-400 tracking-wider">Detalhes</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {filteredLogs.map(log => (
                            <tr key={log.id} className="hover:bg-white/[0.01]">
                                <td className="px-6 py-4 font-mono text-xs text-gray-500">
                                    {new Date(log.timestamp).toLocaleString()}
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-0.5 font-mono text-[9px] uppercase font-bold border ${getBadgeColor(log.action)}`}>
                                        {log.action}
                                    </span>
                                </td>
                                <td className="px-6 py-4 font-dm text-sm text-white">{typeof log.targetUser === 'object' ? (log.targetUser?.name || log.targetUser?.email || log.targetUser?.id || JSON.stringify(log.targetUser)) : log.targetUser}</td>
                                <td className="px-6 py-4 font-dm text-sm text-gray-400">{typeof log.performedBy === 'object' ? (log.performedBy?.name || log.performedBy?.email || log.performedBy?.id || JSON.stringify(log.performedBy)) : (log.performedBy || 'Sistema')}</td>
                                <td className="px-6 py-4 font-dm text-sm text-gray-500 italic">{typeof log.details === 'object' ? JSON.stringify(log.details) : (log.details || '—')}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function UserSlideOver({ user, onSave, onClose, clients, notify }) {
    const [form, setForm] = useState({ ...user });
    const [activeSubTab, setActiveSubTab] = useState('dados');

    if (!user) return null;

    const handlePermissionChange = (moduloId, key) => {
        const currentPerms = form.permissions || {};
        const moduloPerms = currentPerms[moduloId] || { visualizar: false, editar: false, exportar: false };

        const updated = {
            ...form,
            permissions: {
                ...currentPerms,
                [moduloId]: {
                    ...moduloPerms,
                    [key]: !moduloPerms[key]
                }
            }
        };
        setForm(updated);
    };

    const applyPreset = (preset) => {
        const newPerms = {};
        MODULOS.forEach(m => {
            if (preset === 'total') newPerms[m.id] = { visualizar: true, editar: true, exportar: true };
            if (preset === 'leitura') newPerms[m.id] = { visualizar: true, editar: false, exportar: false };
            if (preset === 'operacional') newPerms[m.id] = { visualizar: true, editar: true, exportar: false };
        });
        setForm({ ...form, permissions: newPerms });
    };

    const handleSave = () => {
        onSave(form);
        notify('success', 'Perfil atualizado com sucesso');
        onClose();
    };

    return (
        <div className="fixed inset-y-0 right-0 w-full max-w-xl bg-[#111111] border-l border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] z-[60] flex flex-col items-stretch animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-[#CAFF00] flex items-center justify-center text-[#111111] font-syne font-bold text-lg">
                        {form.name?.[0]?.toUpperCase()}
                    </div>
                    <div>
                        <h2 className="font-syne font-bold text-lg uppercase leading-tight">{form.name}</h2>
                        <p className="text-gray-500 font-mono text-xs uppercase tracking-widest">{form.role} • {form.email}</p>
                    </div>
                </div>
                <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
                    <X size={20} />
                </button>
            </div>

            {/* Internal Tabs */}
            <div className="px-8 flex gap-6 border-b border-white/5 bg-white/[0.02]">
                {[
                    { id: 'dados', label: 'Dados', icon: User },
                    { id: 'permissoes', label: 'Permissões', icon: Shield },
                    { id: 'validade', label: 'Validade', icon: Clock },
                    { id: 'sessões', label: 'Sessões', icon: History },
                ].map(t => (
                    <button
                        key={t.id}
                        onClick={() => setActiveSubTab(t.id)}
                        className={`flex items-center gap-2 py-4 font-mono text-[10px] uppercase tracking-wider transition-all border-b-2 ${activeSubTab === t.id ? 'text-[#CAFF00] border-[#CAFF00]' : 'text-gray-500 border-transparent'
                            }`}
                    >
                        <t.icon size={12} />
                        {t.label}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-8 py-8 custom-scrollbar">
                {activeSubTab === 'dados' && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-6 pb-6 border-b border-white/5">
                            <div>
                                <label className="block font-mono text-[10px] uppercase text-gray-500 mb-2">Nome Completo</label>
                                <input
                                    type="text"
                                    value={form.name}
                                    onChange={e => setForm({ ...form, name: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 px-4 py-2 text-sm focus:border-[#CAFF00] focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="block font-mono text-[10px] uppercase text-gray-500 mb-2">Email</label>
                                <input
                                    type="email"
                                    value={form.email}
                                    onChange={e => setForm({ ...form, email: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 px-4 py-2 text-sm focus:border-[#CAFF00] focus:outline-none"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-6 pb-6 border-b border-white/5">
                            <div>
                                <label className="block font-mono text-[10px] uppercase text-gray-500 mb-2">Tipo de Usuário</label>
                                <select
                                    value={form.role}
                                    onChange={e => setForm({ ...form, role: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 px-4 py-2 text-sm focus:border-[#CAFF00] focus:outline-none"
                                >
                                    <option value="admin">Admin</option>
                                    <option value="client">Cliente</option>
                                    <option value="Convidado">Convidado</option>
                                </select>
                            </div>

                            <div>
                                <label className="block font-mono text-[10px] uppercase text-gray-500 mb-2">
                                    Cliente Vinculado {form.role === 'client' && <span className="text-red-500">*</span>}
                                </label>
                                <select
                                    value={form.clientId || ''}
                                    onChange={e => setForm({ ...form, clientId: e.target.value })}
                                    className={`w-full bg-white/5 border ${form.role === 'client' && !form.clientId ? 'border-red-500' : 'border-white/10'} px-4 py-2 text-sm focus:border-[#CAFF00] focus:outline-none`}
                                >
                                    <option value="">— (Nenhum) —</option>
                                    {clients.map(c => <option key={c.id} value={c.id}>{c.displayName || c.name}</option>)}
                                </select>
                                {form.role === 'admin' && (
                                    <p className="text-[9px] text-gray-600 uppercase font-mono mt-1">Opcional para Admins</p>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-6 pb-6 border-b border-white/5">
                            <div>
                                <label className="block font-mono text-[10px] uppercase text-gray-500 mb-2">Cargo/Função</label>
                                <input
                                    type="text"
                                    value={form.cargo || ''}
                                    placeholder="Ex: DPO, Analista TI"
                                    onChange={e => setForm({ ...form, cargo: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 px-4 py-2 text-sm focus:border-[#CAFF00] focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="block font-mono text-[10px] uppercase text-gray-500 mb-2">Telefone</label>
                                <input
                                    type="text"
                                    value={form.phone || ''}
                                    onChange={e => setForm({ ...form, phone: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 px-4 py-2 text-sm focus:border-[#CAFF00] focus:outline-none"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-6 pb-6 border-b border-white/5 font-mono text-[10px] uppercase">
                            <div>
                                <label className="block text-gray-500 mb-1">Data de Criação</label>
                                <p className="text-gray-300">{form.createdAt ? new Date(form.createdAt).toLocaleDateString() : '—'}</p>
                            </div>
                            <div>
                                <label className="block text-gray-500 mb-1">Criado por</label>
                                <p className="text-gray-300">{form.createdBy || 'Sistema'}</p>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-white/5">
                            <label className="block font-mono text-[10px] uppercase text-gray-500 mb-4">Gerenciamento de Senha</label>
                            <button className="w-full py-2 border border-[#CAFF00]/30 text-[#CAFF00] font-mono text-[10px] uppercase hover:bg-[#CAFF00]/5 transition-all">
                                Enviar Link de Redefinição
                            </button>
                        </div>
                    </div>
                )}

                {activeSubTab === 'permissoes' && (
                    <div className="space-y-6 text-sm">
                        <div className="flex gap-2 mb-6">
                            <button
                                onClick={() => applyPreset('total')}
                                className="flex-1 py-1.5 font-mono text-[9px] uppercase border border-white/10 hover:border-[#CAFF00]/50 transition-all"
                            >
                                Acesso Total
                            </button>
                            <button
                                onClick={() => applyPreset('leitura')}
                                className="flex-1 py-1.5 font-mono text-[9px] uppercase border border-white/10 hover:border-[#CAFF00]/50 transition-all"
                            >
                                Somente Leitura
                            </button>
                            <button
                                onClick={() => applyPreset('operacional')}
                                className="flex-1 py-1.5 font-mono text-[9px] uppercase border border-white/10 hover:border-[#CAFF00]/50 transition-all"
                            >
                                Operacional
                            </button>
                        </div>

                        <div className="space-y-1">
                            <div className="grid grid-cols-4 font-mono text-[9px] uppercase text-gray-500 pb-2 border-b border-white/5 px-2">
                                <div className="col-span-1">Módulo</div>
                                <div className="text-center">Visualizar</div>
                                <div className="text-center">Editar</div>
                                <div className="text-center">Exportar</div>
                            </div>
                            {MODULOS.map(m => {
                                const perms = (form.permissions?.[m.id]) || { visualizar: false, editar: false, exportar: false };
                                return (
                                    <div key={m.id} className="grid grid-cols-4 items-center py-2.5 px-2 border-b border-white/[0.02] hover:bg-white/[0.01]">
                                        <span className="font-dm text-xs text-gray-300">{m.label}</span>
                                        <div className="flex justify-center">
                                            <input
                                                type="checkbox"
                                                checked={perms.visualizar}
                                                onChange={() => handlePermissionChange(m.id, 'visualizar')}
                                                className="accent-[#CAFF00] w-4 h-4"
                                            />
                                        </div>
                                        <div className="flex justify-center">
                                            <input
                                                type="checkbox"
                                                checked={perms.editar}
                                                onChange={() => handlePermissionChange(m.id, 'editar')}
                                                className="accent-[#CAFF00] w-4 h-4"
                                            />
                                        </div>
                                        <div className="flex justify-center">
                                            <input
                                                type="checkbox"
                                                checked={perms.exportar}
                                                onChange={() => handlePermissionChange(m.id, 'exportar')}
                                                className="accent-[#CAFF00] w-4 h-4"
                                            />
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}

                {activeSubTab === 'validade' && (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between p-4 border border-white/5 bg-white/[0.02]">
                            <div>
                                <span className="font-dm text-sm text-gray-300">Acesso Permanente</span>
                                <p className="text-gray-500 text-xs mt-1">Concede acesso sem data de expiração.</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" className="sr-only peer" checked={form.permanentAccess !== false} onChange={(e) => setForm({ ...form, permanentAccess: e.target.checked })} />
                                <div className="w-9 h-5 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#CAFF00] peer-checked:after:bg-[#111111] peer-checked:after:border-[#111111]"></div>
                            </label>
                        </div>

                        {form.permanentAccess === false && (
                            <div className="p-4 border border-white/5 bg-white/[0.01]">
                                <label className="block font-mono text-[10px] uppercase text-gray-500 mb-2">Acesso válido até</label>
                                <input
                                    type="date"
                                    value={form.validUntil || ''}
                                    onChange={(e) => setForm({ ...form, validUntil: e.target.value })}
                                    className="w-full max-w-[200px] bg-white/5 border border-white/10 px-4 py-2 text-sm focus:border-[#CAFF00] focus:outline-none"
                                />
                                {form.validUntil && (
                                    <p className="font-mono text-[10px] text-amber-500 mt-2">
                                        Expira em {Math.ceil((new Date(form.validUntil) - new Date()) / (1000 * 60 * 60 * 24))} dias.
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {activeSubTab === 'sessões' && (
                    <div className="space-y-6">
                        <div className="bg-red-500/10 border border-red-500/20 p-4 flex items-center justify-between">
                            <div>
                                <p className="font-dm text-sm font-bold text-red-500">Security Actions</p>
                                <p className="text-red-500/70 text-xs">Forçar encerramento de todos os acessos ativos.</p>
                            </div>
                            <button className="bg-red-600 text-white px-4 py-2 font-mono text-[10px] uppercase font-bold hover:bg-red-700 transition-all">
                                Kill all Sessions
                            </button>
                        </div>

                        <div className="space-y-2">
                            <label className="block font-mono text-[10px] uppercase text-gray-500 mb-4 tracking-widest">Histórico Recente</label>
                            {[
                                { date: 'Hoje, 14:12', device: 'Chrome / Windows', ip: '187.12.88.XX', duration: '2h 15m' },
                                { date: 'Ontem, 09:45', device: 'Safari / macOS', ip: '177.34.12.XX', duration: '45m' },
                                { date: '02 Mar, 18:20', device: 'Chrome / Windows', ip: '187.12.88.XX', duration: '1h 10m' },
                            ].map((s, idx) => (
                                <div key={idx} className="flex items-center justify-between p-3 border border-white/5 bg-white/[0.01]">
                                    <div>
                                        <p className="font-dm text-sm text-gray-300">{s.date}</p>
                                        <p className="font-mono text-[10px] text-gray-600 uppercase italic">{s.device} • {s.ip}</p>
                                    </div>
                                    <span className="font-mono text-xs text-gray-500">{s.duration}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="px-8 py-6 border-t border-white/5 flex gap-4 bg-[#111111]">
                <button onClick={onClose} className="flex-1 py-3 border border-white/10 font-mono text-[10px] uppercase tracking-widest hover:bg-white/5 transition-all">
                    Cancelar
                </button>
                <button onClick={handleSave} className="flex-1 py-3 bg-[#CAFF00] text-[#111111] font-mono text-[10px] uppercase tracking-widest font-bold shadow-[0_0_20px_rgba(202,255,0,0.1)] transition-all active:scale-95">
                    Salvar Alterações
                </button>
            </div>
        </div>
    );
}

function NewUserModal({ show, onClose, onSave, clients, notify, currentUser, defaultRole }) {
    const [step, setStep] = useState(1);

    // Auto-link logic for non-admins creating users
    const initialClientId = (currentUser?.role === 'client' || currentUser?.role === 'Convidado') ? currentUser.clientId : '';

    const [form, setForm] = useState({
        name: '', email: '', password: '', confirmPassword: '', role: defaultRole || 'client', clientId: initialClientId, cargo: '', status: 'Ativo', permissions: {}
    });

    const [errors, setErrors] = useState({});

    // Reset form when modal opens
    useEffect(() => {
        if (show) {
            setStep(1);
            setForm({
                name: '', email: '', password: '', confirmPassword: '', role: defaultRole || 'client', clientId: initialClientId, cargo: '', status: 'Ativo', permissions: {}
            });
            setErrors({});
        }
    }, [show, defaultRole, initialClientId]);

    if (!show) return null;

    const validate = () => {
        const e = {};
        if (!form.name) e.name = 'Nome obrigatório';
        if (!form.email || !/^\S+@\S+\.\S+$/.test(form.email)) e.email = 'Email inválido';
        if (!form.password || form.password.length < 6) e.password = 'Mínimo 6 caracteres';
        if (form.password !== form.confirmPassword) e.confirmPassword = 'Senhas não conferem';
        if ((form.role === 'client' || form.role === 'Convidado') && !form.clientId) e.clientId = 'Selecione um cliente';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const next = () => {
        if (step === 1 && validate()) setStep(2);
        else if (step === 2) setStep(3);
    };

    const applyPreset = (preset) => {
        const newPerms = {};
        MODULOS.forEach(m => {
            if (preset === 'total') newPerms[m.id] = { visualizar: true, editar: true, exportar: true };
            if (preset === 'leitura') newPerms[m.id] = { visualizar: true, editar: false, exportar: false };
            if (preset === 'operacional') newPerms[m.id] = { visualizar: true, editar: true, exportar: false };
        });
        setForm({ ...form, permissions: newPerms });
    };

    const submit = () => {
        onSave(form);
        notify('success', 'Usuário criado com sucesso!');
        onClose();
        setStep(1);
        setForm({ name: '', email: '', password: '', confirmPassword: '', role: 'client', clientId: '', cargo: '', status: 'Ativo', permissions: {} });
    };

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-[#111111] border border-white/10 w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="px-6 py-4 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#CAFF00] flex items-center justify-center">
                            <UserPlus size={16} className="text-[#111111]" />
                        </div>
                        <div>
                            <h3 className="font-syne font-bold uppercase text-sm tracking-tight">Novo Usuário</h3>
                            <p className="font-mono text-[9px] text-gray-500 uppercase">Passo {step} de 3</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-gray-500 hover:text-white"><X size={20} /></button>
                </div>

                {/* Stepper Progress */}
                <div className="flex">
                    {[1, 2, 3].map(s => (
                        <div key={s} className={`h-1 flex-1 transition-all ${step >= s ? 'bg-[#CAFF00]' : 'bg-white/5'}`} />
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    {step === 1 && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="block font-mono text-[10px] uppercase text-gray-500 mb-2">Nome Completo</label>
                                    <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className={`w-full bg-[#0A0A0A] border ${errors.name ? 'border-red-500' : 'border-white/10'} px-4 py-2.5 text-sm focus:border-[#CAFF00] outline-none transition-all`} />
                                    {errors.name && <p className="text-red-500 text-[9px] font-mono mt-1 uppercase">{errors.name}</p>}
                                </div>
                                <div>
                                    <label className="block font-mono text-[10px] uppercase text-gray-500 mb-2">Email</label>
                                    <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className={`w-full bg-[#0A0A0A] border ${errors.email ? 'border-red-500' : 'border-white/10'} px-4 py-2.5 text-sm focus:border-[#CAFF00] outline-none transition-all`} />
                                    {errors.email && <p className="text-red-500 text-[9px] font-mono mt-1 uppercase">{errors.email}</p>}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="block font-mono text-[10px] uppercase text-gray-500 mb-2">Senha Inicial</label>
                                    <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} className={`w-full bg-[#0A0A0A] border ${errors.password ? 'border-red-500' : 'border-white/10'} px-4 py-2.5 text-sm focus:border-[#CAFF00] outline-none transition-all`} />
                                    {errors.password && <p className="text-red-500 text-[9px] font-mono mt-1 uppercase">{errors.password}</p>}
                                </div>
                                <div>
                                    <label className="block font-mono text-[10px] uppercase text-gray-500 mb-2">Confirmar Senha</label>
                                    <input type="password" value={form.confirmPassword} onChange={e => setForm({ ...form, confirmPassword: e.target.value })} className={`w-full bg-[#0A0A0A] border ${errors.confirmPassword ? 'border-red-500' : 'border-white/10'} px-4 py-2.5 text-sm focus:border-[#CAFF00] outline-none transition-all`} />
                                    {errors.confirmPassword && <p className="text-red-500 text-[9px] font-mono mt-1 uppercase">{errors.confirmPassword}</p>}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6 pt-4 border-t border-white/5">
                                <div>
                                    <label className="block font-mono text-[10px] uppercase text-gray-500 mb-2">Tipo de Usuário</label>
                                    <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} className="w-full bg-[#0A0A0A] border border-white/10 px-4 py-2.5 text-sm focus:border-[#CAFF00] outline-none">
                                        <option value="admin">Administrador</option>
                                        <option value="client">Cliente</option>
                                        <option value="Convidado">Convidado</option>
                                    </select>
                                </div>
                                {form.role !== 'admin' && (
                                    <div>
                                        <label className="block font-mono text-[10px] uppercase text-gray-500 mb-2">
                                            Cliente Vinculado {form.role !== 'admin' && <span className="text-red-500">*</span>}
                                        </label>
                                        <select
                                            value={form.clientId || ''}
                                            onChange={e => setForm({ ...form, clientId: e.target.value })}
                                            className={`w-full bg-[#0A0A0A] border ${errors.clientId ? 'border-red-500' : 'border-white/10'} px-4 py-2.5 text-sm focus:border-[#CAFF00] outline-none`}
                                            disabled={currentUser?.role === 'client' || currentUser?.role === 'Convidado'}
                                        >
                                            <option value="">— (Nenhum) —</option>
                                            {clients.map(c => <option key={c.id} value={c.id}>{c.displayName || c.name}</option>)}
                                        </select>
                                        {errors.clientId && <p className="text-red-500 text-[9px] font-mono mt-1 uppercase">{errors.clientId}</p>}
                                        {form.role === 'admin' && (
                                            <p className="text-gray-500 text-[9px] font-mono mt-1 uppercase">Opcional para Admins</p>
                                        )}
                                        {(currentUser?.role === 'client' || currentUser?.role === 'Convidado') && (
                                            <p className="text-[#CAFF00]/80 text-[9px] font-mono mt-1 uppercase font-bold">Vinculado automaticamente ao seu cliente.</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-6">
                            <div className="flex gap-2">
                                {['total', 'leitura', 'operacional'].map(p => (
                                    <button key={p} onClick={() => applyPreset(p)} className="flex-1 py-1.5 font-mono text-[9px] uppercase border border-white/10 hover:border-[#CAFF00]/40 transition-all">
                                        {p === 'total' ? 'Acesso Total' : p === 'leitura' ? 'Somente Leitura' : 'Operacional'}
                                    </button>
                                ))}
                            </div>

                            <div className="border border-white/5">
                                <div className="grid grid-cols-4 font-mono text-[9px] uppercase text-gray-500 p-3 bg-white/5">
                                    <div className="col-span-1">Módulo</div>
                                    <div className="text-center">Visualizar</div>
                                    <div className="text-center">Editar</div>
                                    <div className="text-center">Exportar</div>
                                </div>
                                {MODULOS.map(m => {
                                    const p = form.permissions[m.id] || { visualizar: false, editar: false, exportar: false };
                                    return (
                                        <div key={m.id} className="grid grid-cols-4 items-center p-3 border-t border-white/5 hover:bg-white/[0.01]">
                                            <span className="font-dm text-xs font-medium">{m.label}</span>
                                            <div className="flex justify-center">
                                                <input type="checkbox" checked={p.visualizar} onChange={() => {
                                                    const updated = { ...form.permissions };
                                                    updated[m.id] = { ...p, visualizar: !p.visualizar };
                                                    setForm({ ...form, permissions: updated });
                                                }} className="accent-[#CAFF00]" />
                                            </div>
                                            <div className="flex justify-center">
                                                <input type="checkbox" checked={p.editar} onChange={() => {
                                                    const updated = { ...form.permissions };
                                                    updated[m.id] = { ...p, editar: !p.editar };
                                                    setForm({ ...form, permissions: updated });
                                                }} className="accent-[#CAFF00]" />
                                            </div>
                                            <div className="flex justify-center">
                                                <input type="checkbox" checked={p.exportar} onChange={() => {
                                                    const updated = { ...form.permissions };
                                                    updated[m.id] = { ...p, exportar: !p.exportar };
                                                    setForm({ ...form, permissions: updated });
                                                }} className="accent-[#CAFF00]" />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-8">
                            <div className="bg-[#CAFF00]/5 border border-[#CAFF00]/20 p-6">
                                <h4 className="font-syne font-bold text-[#CAFF00] uppercase text-xs mb-4 flex items-center gap-2">
                                    <Shield size={14} /> Resumo da Configuração
                                </h4>
                                <div className="grid grid-cols-2 gap-y-4 font-dm text-sm">
                                    <div>
                                        <p className="text-gray-500 text-xs font-mono uppercase">Usuário</p>
                                        <p className="font-bold">{form.name}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-500 text-xs font-mono uppercase">Email</p>
                                        <p className="font-bold text-gray-300">{form.email}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-500 text-xs font-mono uppercase">Tipo</p>
                                        <p className="font-bold uppercase tracking-wider">{form.role}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-500 text-xs font-mono uppercase">Cliente</p>
                                        <p className="font-bold">{clients.find(c => c.id === form.clientId)?.displayName || '—'}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center gap-3 group cursor-pointer">
                                    <input type="checkbox" className="w-4 h-4 accent-[#CAFF00]" id="welcome" />
                                    <label htmlFor="welcome" className="text-sm text-gray-400 group-hover:text-white transition-colors cursor-pointer">Enviar e-mail de boas-vindas imediatamente</label>
                                </div>
                                <div className="flex items-center gap-3 group cursor-pointer">
                                    <input type="checkbox" className="w-4 h-4 accent-[#CAFF00]" id="forcePwd" />
                                    <label htmlFor="forcePwd" className="text-sm text-gray-400 group-hover:text-white transition-colors cursor-pointer">Forçar troca de senha no primeiro acesso</label>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-8 py-6 border-t border-white/5 bg-[#0D0D0D] flex gap-4">
                    {step > 1 && (
                        <button onClick={() => setStep(step - 1)} className="px-6 py-3 border border-white/10 font-mono text-[10px] uppercase tracking-widest hover:bg-white/5 transition-all flex items-center gap-2">
                            <ArrowLeft size={12} /> Voltar
                        </button>
                    )}
                    <div className="flex-1" />
                    <button onClick={onClose} className="px-6 py-3 text-gray-500 hover:text-white font-mono text-[10px] uppercase tracking-widest transition-all">
                        Cancelar
                    </button>
                    <button
                        onClick={step === 3 ? submit : next}
                        className="px-8 py-3 bg-[#CAFF00] text-[#111111] font-mono text-[10px] uppercase tracking-widest font-bold shadow-[0_0_20px_rgba(202,255,0,0.1)] transition-all active:scale-95"
                    >
                        {step === 3 ? 'CRIAR USUÁRIO' : 'PRÓXIMO'}
                    </button>
                </div>
            </div>
        </div>
    );
}

function RevocationModal({ user, onClose, onConfirm }) {
    const [reason, setReason] = useState('');
    const [type, setType] = useState('Desligamento');
    const [closeSessions, setCloseSessions] = useState(false);

    if (!user) return null;

    const handleSubmit = () => {
        if (!reason.trim()) return alert('Motivo é obrigatório');
        onConfirm(reason, type, closeSessions);
    };

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-[#111111] border border-red-500/30 w-full max-w-md shadow-2xl">
                <div className="bg-red-600 px-5 py-4 flex items-center justify-between">
                    <h3 className="font-syne font-bold uppercase text-white flex items-center gap-2">
                        <ShieldOff size={16} /> Revogar Acesso
                    </h3>
                    <button onClick={onClose} className="text-white/70 hover:text-white"><X size={18} /></button>
                </div>
                <div className="p-5 space-y-4">
                    <p className="text-sm font-dm text-gray-300">
                        Você está prestes a revogar permanentemente o acesso de <strong className="text-white">{user.name}</strong>.
                    </p>

                    <div>
                        <label className="block font-mono text-[10px] uppercase text-gray-500 mb-2">Tipo de Revogação *</label>
                        <select
                            value={type}
                            onChange={(e) => setType(e.target.value)}
                            className="w-full bg-[#0A0A0A] border border-white/10 px-4 py-2.5 text-sm focus:border-red-500 outline-none"
                        >
                            {['Desligamento', 'Fim de contrato', 'Violação de política', 'Solicitação do cliente', 'Suspeita de comprometimento', 'Outro'].map(t => (
                                <option key={t} value={t}>{t}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block font-mono text-[10px] uppercase text-gray-500 mb-2">Motivo da Revogação *</label>
                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            rows={3}
                            className="w-full bg-[#0A0A0A] border border-white/10 px-4 py-2 text-sm focus:border-red-500 outline-none resize-none"
                            placeholder="Descreva o motivo..."
                        />
                    </div>

                    <div className="pt-2">
                        <label className="flex items-center gap-3 cursor-pointer group">
                            <input
                                type="checkbox"
                                checked={closeSessions}
                                onChange={(e) => setCloseSessions(e.target.checked)}
                                className="accent-red-500 w-4 h-4 cursor-pointer"
                            />
                            <span className="text-sm font-dm text-gray-400 group-hover:text-white transition-colors">
                                Encerrar sessões ativas imediatamente
                            </span>
                        </label>
                    </div>
                </div>
                <div className="px-5 py-4 border-t border-white/5 bg-white/[0.02] flex gap-3">
                    <button onClick={onClose} className="flex-1 border border-white/10 py-2.5 font-mono text-[10px] uppercase text-gray-400 hover:text-white hover:bg-white/5 transition-all">
                        Cancelar
                    </button>
                    <button onClick={handleSubmit} className="flex-1 bg-red-600 border border-red-500 py-2.5 font-mono text-[10px] uppercase text-white font-bold hover:bg-red-700 transition-all">
                        Confirmar Revogação
                    </button>
                </div>
            </div>
        </div>
    );
}
