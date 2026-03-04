import { createContext, useContext, useState, useEffect } from 'react';
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

  const login = (email, password) => {
    const found = USERS.find(u => u.email === email && u.password === password);
    if (found) {
      const { password: _, ...safe } = found;
      setUser(safe);
      localStorage.setItem('opice_ir_session', JSON.stringify(safe));
      return { success: true, user: safe };
    }
    return { success: false, error: 'Credenciais inválidas' };
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('opice_ir_session');
  };

  const getClientId = () => {
    if (!user) return null;
    if (user.role === 'admin') return null;
    return user.clientId;
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, getClientId }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
