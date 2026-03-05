import { USERS } from '../data/users';

export const KEYS = {
  activities: (id) => `opice_ir_activities_${id}`,
  onboarding: (id) => `opice_ir_onboarding_${id}`,
  answers: (id) => `opice_ir_answers_${id}`,
  info: (id) => `opice_ir_info_${id}`,
  clients: () => `opice_ir_clients`,
  pmo: (id) => `opice_ir_pmo_${id}`,
  slaConfig: (id) => `opice_ir_sla_config_${id}`,
  crisis: (id, actId) => `opice_ir_crisis_${id}_${actId}`,
  notifications: (id) => `opice_ir_notifications_${id}`,
  meetings: (id) => `opice_ir_meetings_${id}`,
  anpd: (id) => `opice_ir_anpd_${id}`,
  users: () => `opice_ir_users`,
  accessLog: () => `opice_ir_access_log`,
  mfaVerified: (email) => `opice_ir_mfa_verified_${email}`,
  welcomeShown: (clientId) => `opice_ir_welcome_shown_${clientId}`,
  deletedClients: () => `opice_ir_deleted_clients`,
  invites: () => `opice_ir_invites`,
};

export function getStorage(key, fallback = null) {
  try {
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : fallback;
  } catch {
    return fallback;
  }
}

export function setStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('Storage error', e);
  }
}

export function generateId(prefix = '') {
  return `${prefix}${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

export function generateHash() {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

export function addNotification(clientId, { type, message, link }) {
  if (!clientId) return;
  const key = KEYS.notifications(clientId);
  const existing = getStorage(key, []);
  const notif = { id: Date.now(), type, message, link: link || null, timestamp: new Date().toISOString(), read: false };
  setStorage(key, [notif, ...existing].slice(0, 50));
}

export function fetchClients() {
  const dynamicClients = getStorage(KEYS.clients(), []);

  // Extract clients from hardcoded mock users
  const hardcodedClients = USERS.filter(u => u.role === 'client').map(u => ({
    id: u.clientId,
    name: u.name,
    email: u.email,
    displayName: u.name
  }));

  // We DO NOT merge from opice_ir_users because users are NOT clients entities. 
  // Clients are created strictly through the Admin page + the legacy hardcoded mock array.

  const allClients = [...hardcodedClients, ...dynamicClients];

  // Deduplicate by ID
  const uniqueClients = Array.from(new Map(allClients.map(c => [c.id, c])).values());

  // Filter out soft-deleted clients
  const deletedClientIds = getStorage(KEYS.deletedClients(), []);
  return uniqueClients.filter(c => !deletedClientIds.includes(c.id));
}

export function softDeleteClient(clientId) {
  const deleted = getStorage(KEYS.deletedClients(), []);
  if (!deleted.includes(clientId)) {
    setStorage(KEYS.deletedClients(), [...deleted, clientId]);
  }
}

// Invites System
export function createInvite({ name, email, role, message, clientId, createdBy }) {
  const invites = getStorage(KEYS.invites(), []);
  const newInvite = {
    id: generateId('INV_'),
    name,
    email,
    role: role || 'Convidado',
    message: message || '',
    clientId,
    createdBy,
    status: 'PENDENTE_APROVACAO_ADMIN',
    createdAt: new Date().toISOString()
  };
  setStorage(KEYS.invites(), [...invites, newInvite]);
  return newInvite;
}

export function getAllInvites() {
  return getStorage(KEYS.invites(), []);
}

export function updateInviteStatus(inviteId, status, reason = '') {
  const invites = getStorage(KEYS.invites(), []);
  const updated = invites.map(inv => {
    if (inv.id === inviteId) {
      return { ...inv, status, rejectionReason: reason, updatedAt: new Date().toISOString() };
    }
    return inv;
  });
  setStorage(KEYS.invites(), updated);
}
