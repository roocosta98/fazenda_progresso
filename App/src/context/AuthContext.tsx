import React, { createContext, useContext, useEffect, useState } from 'react';

const STORAGE_KEY = 'fazendaprogresso.motoristaLogado';

interface AuthContextValue {
  motorista: string | null;
  login: (nomeFicha: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Sessão leve (nome do motorista em localStorage, sem senha) — decisão registrada no plano de
// implementação do PRD: construir autenticação forte (matrícula + PIN) é um projeto à parte,
// fora do que o PRD pede. O suficiente pro protótipo é o motorista escolher o próprio nome numa
// lista real (App/api/motoristas/listar.ts, vinda de MetasMotoristas) — isso já garante a regra
// de privacidade (nunca ver meta/remuneração de outro motorista), que é o requisito não-negociável.
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [motorista, setMotorista] = useState<string | null>(() => localStorage.getItem(STORAGE_KEY));

  useEffect(() => {
    if (motorista) {
      localStorage.setItem(STORAGE_KEY, motorista);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [motorista]);

  const login = (nomeFicha: string) => setMotorista(nomeFicha);
  const logout = () => setMotorista(null);

  return <AuthContext.Provider value={{ motorista, login, logout }}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth precisa estar dentro de <AuthProvider>');
  return ctx;
};
