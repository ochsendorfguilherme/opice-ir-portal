import { createContext, useContext, useState, useEffect } from 'react';
import { USERS } from '../data/users';
import { getStorage, setStorage, KEYS } from '../utils/storage';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // Initialize users in storage if not present
  useEffect(() => {
    const existing = getStorage(KEYS.users());
    if (!existing || existing.length === 0) {
      setStorage(KEYS.users(), USERS);
    }
  }, []);

  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('opice_ir_session');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [pendingUser, setPendingUser] = useState(null);

  const logAction = (action, targetUser, performedBy, details = '') => {
    const logKey = KEYS.accessLog();
    const logs = getStorage(logKey, []);
    const newLog = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      action,
      targetUser: targetUser?.email || targetUser?.name || (typeof targetUser === 'object' ? JSON.stringify(targetUser) : targetUser),
      performedBy: performedBy?.email || performedBy?.name || (typeof performedBy === 'object' ? JSON.stringify(performedBy) : performedBy) || 'Sistema',
      details: typeof details === 'object' ? JSON.stringify(details) : details
    };
    setStorage(logKey, [newLog, ...logs].slice(0, 1000));
  };

  const login = (email, password) => {
    const allUsers = getStorage(KEYS.users(), USERS);
    const found = allUsers.find(u => u.email === email && u.password === password);

    if (found) {
      if (found.status === 'Revogado' || found.status === 'Suspenso') {
        return { success: false, error: `Conta ${found.status.toLowerCase()}. Entre em contato com o suporte.` };
      }
      const { password: _, ...safe } = found;
      setPendingUser(safe);
      return { success: true, needsMFA: true };
    }
    return { success: false, error: 'Credenciais inválidas' };
  };

  const verifyMFA = (code) => {
    if (!code) return { success: false, error: 'Codigo obrigatorio' };
    if (pendingUser) {
      const safe = pendingUser;
      const accessTimestamp = new Date().toISOString();

      const allUsers = getStorage(KEYS.users(), USERS);
      const updatedUsers = allUsers.map(u =>
        u.email === safe.email ? { ...u, lastAccess: accessTimestamp } : u
      );
      setStorage(KEYS.users(), updatedUsers);

      const updatedUser = updatedUsers.find(u => u.email === safe.email) || { ...safe, lastAccess: accessTimestamp };
      const { password: _ignoredPassword, ...safeUpdatedUser } = updatedUser;

      setUser(safeUpdatedUser);
      localStorage.setItem('opice_ir_session', JSON.stringify(safeUpdatedUser));

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
    localStorage.removeItem('opice_ir_session');
  };

  const getClientId = () => {
    if (!user) return null;
    if (user.role === 'admin') return null;
    return user.clientId;
  };

  const changePassword = (newPassword) => {
    if (!user) return false;

    const allUsers = getStorage(KEYS.users(), USERS);
    const updatedUsers = allUsers.map(u =>
      u.email === user.email ? { ...u, password: newPassword, forcePasswordChange: false } : u
    );

    setStorage(KEYS.users(), updatedUsers);

    const updatedAccount = updatedUsers.find(u => u.email === user.email);
    if (!updatedAccount) return false;

    const { password: _ignoredPassword, ...safeUpdatedUser } = updatedAccount;
    setUser(safeUpdatedUser);
    localStorage.setItem('opice_ir_session', JSON.stringify(safeUpdatedUser));

    logAction('EDITADO', safeUpdatedUser, safeUpdatedUser, 'Senha alterada obrigatoriamente no primeiro acesso');
    return true;
  };

  const authStep = user?.forcePasswordChange ? 'FORCE_PASSWORD_CHANGE' : user ? 'AUTHENTICATED' : pendingUser ? 'MFA_REQUIRED' : 'UNAUTHENTICATED';

  return (
    <AuthContext.Provider value={{ user, pendingUser, authStep, login, verifyMFA, cancelMFA, logout, getClientId, logAction, changePassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
