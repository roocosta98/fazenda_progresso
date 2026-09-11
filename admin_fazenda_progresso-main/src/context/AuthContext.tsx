import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import type { Usuario } from '../types';
import { MOCK_USUARIOS } from '../mock/data';

interface AuthContextType {
  usuario: Usuario | null;
  login: (userId: string) => void;
  loginUsuario: (usuario: Usuario) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const CHAVE_ARMAZENAMENTO = 'fazendaProgresso.usuario';

// Login persiste entre recarregamentos de página/aba fechada — só sai ao clicar em
// "Sair" de fato. localStorage (não cookie) porque a autenticação das APIs já é feita
// por header customizado montado em JS a partir deste objeto (x-user-profile/x-user-type),
// nunca por cookie enviado automaticamente pelo navegador.
function lerUsuarioArmazenado(): Usuario | null {
  try {
    const bruto = localStorage.getItem(CHAVE_ARMAZENAMENTO);
    return bruto ? (JSON.parse(bruto) as Usuario) : null;
  } catch {
    return null;
  }
}

function salvarUsuarioArmazenado(usuario: Usuario | null) {
  try {
    if (usuario) localStorage.setItem(CHAVE_ARMAZENAMENTO, JSON.stringify(usuario));
    else localStorage.removeItem(CHAVE_ARMAZENAMENTO);
  } catch {
    // Armazenamento indisponível (aba privada, storage bloqueado etc.) — segue só em memória
    // pela sessão atual da aba, sem travar o login.
  }
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [usuario, setUsuarioState] = useState<Usuario | null>(() => lerUsuarioArmazenado());

  const definirUsuario = (novoUsuario: Usuario | null) => {
    setUsuarioState(novoUsuario);
    salvarUsuarioArmazenado(novoUsuario);
  };

  const login = (userId: string) => {
    const found = MOCK_USUARIOS.find(u => u.id === userId);
    if (found) definirUsuario(found);
  };

  const logout = () => definirUsuario(null);

  return (
    <AuthContext.Provider value={{ usuario, login, loginUsuario: definirUsuario, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
