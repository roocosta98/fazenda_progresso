import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import type { Usuario } from '../types';
import { MOCK_USUARIOS } from '../mock/data';

interface AuthContextType {
  usuario: Usuario | null;
  login: (userId: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [usuario, setUsuario] = useState<Usuario | null>(null);

  const login = (userId: string) => {
    const found = MOCK_USUARIOS.find(u => u.id === userId);
    if (found) setUsuario(found);
  };

  const logout = () => setUsuario(null);

  return (
    <AuthContext.Provider value={{ usuario, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
