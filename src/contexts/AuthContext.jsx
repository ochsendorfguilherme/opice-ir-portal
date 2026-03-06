import { createContext, useContext, useEffect, useState } from 'react';
import { USERS } from '../data/users';
import { getStorage, setStorage, KEYS } from '../utils/storage';
import { DEMO_AUTH_ENABLED, hashPassword, normalizeStoredUsers, sanitizeAuthUser } from '../utils/authSecurity';

const AuthContext = createContext(null);
const SESSION_KEY = 'opice_ir_session';

function writeSession(email) {
  if (!email) return;
  localStorage.setItem(SESSION_KEY, JSON.stringify({ email }));
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

function getUsersSnapshot() {
  const storedUsers = getStorage(KEYS.users(), []);
  if (storedUsers.length > 0) return storedUsers;
  return DEMO_AUTH_ENABLED ? USERS : [];
}

function restoreSessionUser() {
  try {
    const storedSession = localStorage.getItem(SESSION_KEY);
    if (!storedSession) return null;
    const parsed = JSON.parse(storedSession);
    const email = String(parsed?.email || '').trim().toLowerCase();
    if (!email) return null;
    const matchedUser = getUsersSnapshot().find((entry) => String(entry.email || '').trim().toLowerCase() === email);
    if (!matchedUser || matchedUser.status === 'Revogado' || matchedUser.status === 'Suspenso') {
      clearSession();
      return null;
    }
    return sanitizeAuthUser(matchedUser);
  } catch {
    clearSession();
    return null;
  }
}

export function AuthProvider({ children }) {
  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState(() => restoreSessionUser());
  const [pendingUser, setPendingUser] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function initializeUsers() {
      const existingUsers = getStorage(KEYS.users(), []);
      if (existingUsers.length === 0) {
        if (DEMO_AUTH_ENABLED) {
          setStorage(KEYS.users(), USERS);
        }
      } else if (existingUsers.some((entry) => entry.password && !entry.passwordHash)) {
        const migratedUsers = await normalizeStoredUsers(existingUsers);
        if (!cancelled) {
          setStorage(KEYS.users(), migratedUsers);
        }
      }

      if (!cancelled) {
        setUser(restoreSessionUser());
        setAuthReady(true);
      }
    }

    void initializeUsers();
    return () => {
      cancelled = true;
    };
  }, []);

  const logAction = (action, targetUser, performedBy, details = '') => {
    const logKey = KEYS.accessLog();
    const logs = getStorage(logKey, []);
    const newLog = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      action,
      targetUser: targetUser?.email || targetUser?.name || (typeof targetUser === 'object' ? JSON.stringify(targetUser) : targetUser),
      performedBy: performedBy?.email || performedBy?.name || (typeof performedBy === 'object' ? JSON.stringify(performedBy) : performedBy) || 'Sistema',
      details: typeof details === 'object' ? JSON.stringify(details) : details,
    };
    setStorage(logKey, [newLog, ...logs].slice(0, 1000));
  };

  const login = async (email, password) => {
    if (!DEMO_AUTH_ENABLED) {
      return {
        success: false,
        error: 'Autenticação local desabilitada neste ambiente. Configure um provedor de identidade seguro ou habilite o modo de demonstração apenas para testes controlados.',
      };
    }

    const normalizedEmail = String(email || '').trim().toLowerCase();
    const candidateHash = await hashPassword(normalizedEmail, password);
    const allUsers = getStorage(KEYS.users(), USERS);
    const found = allUsers.find((entry) => String(entry.email || '').trim().toLowerCase() === normalizedEmail && entry.passwordHash === candidateHash);

    if (found) {
      if (found.status === 'Revogado' || found.status === 'Suspenso') {
        return { success: false, error: `Conta ${found.status.toLowerCase()}. Entre em contato com o suporte.` };
      }
      setPendingUser(sanitizeAuthUser(found));
      return { success: true, needsMFA: true };
    }

    return { success: false, error: 'Credenciais inválidas' };
  };

  const verifyMFA = (code) => {
    if (!/^\d{6}$/.test(String(code || ''))) return { success: false, error: 'Código MFA inválido.' };
    if (pendingUser) {
      const accessTimestamp = new Date().toISOString();
      const allUsers = getStorage(KEYS.users(), USERS);
      const updatedUsers = allUsers.map((entry) => (
        entry.email === pendingUser.email ? { ...entry, lastAccess: accessTimestamp } : entry
      ));
      setStorage(KEYS.users(), updatedUsers);

      const updatedUser = updatedUsers.find((entry) => entry.email === pendingUser.email) || { ...pendingUser, lastAccess: accessTimestamp };
      const safeUpdatedUser = sanitizeAuthUser(updatedUser);

      setUser(safeUpdatedUser);
      writeSession(safeUpdatedUser.email);
      logAction('LOGIN', safeUpdatedUser, safeUpdatedUser, 'Login realizado via MFA');
      setPendingUser(null);
      return { success: true, user: safeUpdatedUser };
    }
    return { success: false, error: 'Sessão expirada' };
  };

  const cancelMFA = () => {
    setPendingUser(null);
  };

  const logout = () => {
    if (user) {
      logAction('LOGOUT', user, user, 'Logout realizado');
    }
    setUser(null);
    setPendingUser(null);
    clearSession();
  };

  const getClientId = () => {
    if (!user) return null;
    if (user.role === 'admin') return null;
    return user.clientId;
  };

  const changePassword = async (newPassword) => {
    if (!user) return false;

    const allUsers = getStorage(KEYS.users(), USERS);
    const passwordHash = await hashPassword(user.email, newPassword);
    const updatedUsers = allUsers.map((entry) => (
      entry.email === user.email ? { ...entry, passwordHash, forcePasswordChange: false } : entry
    ));

    setStorage(KEYS.users(), updatedUsers);

    const updatedAccount = updatedUsers.find((entry) => entry.email === user.email);
    if (!updatedAccount) return false;

    const safeUpdatedUser = sanitizeAuthUser(updatedAccount);
    setUser(safeUpdatedUser);
    writeSession(safeUpdatedUser.email);

    logAction('EDITADO', safeUpdatedUser, safeUpdatedUser, 'Senha alterada obrigatoriamente no primeiro acesso');
    return true;
  };

  const authStep = !authReady
    ? 'LOADING'
    : user?.forcePasswordChange
      ? 'FORCE_PASSWORD_CHANGE'
      : user
        ? 'AUTHENTICATED'
        : pendingUser
          ? 'MFA_REQUIRED'
          : 'UNAUTHENTICATED';

  return (
    <AuthContext.Provider value={{ user, pendingUser, authReady, authStep, login, verifyMFA, cancelMFA, logout, getClientId, logAction, changePassword, demoAuthEnabled: DEMO_AUTH_ENABLED }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
