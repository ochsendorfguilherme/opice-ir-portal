import { createContext, useContext, useState } from 'react';
import { USERS } from '../data/users';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('opice_ir_session');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [pendingUser, setPendingUser] = useState(null);

  const login = (email, password) => {
    const found = USERS.find(u => u.email === email && u.password === password);
    if (found) {
      const { password: _, ...safe } = found;
      // Inicia fluxo MFA (MVP aceita qualquer código)
      setPendingUser(safe);
      return { success: true, needsMFA: true };
    }
    return { success: false, error: 'Credenciais inválidas' };
  };

  const verifyMFA = (code) => {
    if (!code) return { success: false, error: 'Código obrigatório' };
    if (pendingUser) {
      const safe = pendingUser;
      setUser(safe);
      localStorage.setItem('opice_ir_session', JSON.stringify(safe));
      setPendingUser(null);
      return { success: true, user: safe };
    }
    return { success: false, error: 'Sessão expirada' };
  };

  const cancelMFA = () => {
    setPendingUser(null);
  };

  const logout = () => {
    setUser(null);
    setPendingUser(null);
    localStorage.removeItem('opice_ir_session');
  };

  const getClientId = () => {
    if (!user) return null;
    if (user.role === 'admin') return null;
    return user.clientId;
  };

  const authStep = user ? 'AUTHENTICATED' : pendingUser ? 'MFA_REQUIRED' : 'UNAUTHENTICATED';

  return (
    <AuthContext.Provider value={{ user, pendingUser, authStep, login, verifyMFA, cancelMFA, logout, getClientId }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
