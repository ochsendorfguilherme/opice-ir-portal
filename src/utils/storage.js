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
  mfaVerified: (email) => `opice_ir_mfa_verified_${email}`,
  welcomeShown: (clientId) => `opice_ir_welcome_shown_${clientId}`,
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
