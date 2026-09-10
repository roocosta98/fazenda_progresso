import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const files = {
  'vite.config.ts': `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
})
`,
  'src/index.css': `@import "tailwindcss";

@theme {
  --color-brand-primary: #1b4332;
  --color-brand-secondary: #2d6a4f;

  --color-status-pending: #eab308;
  --color-status-scheduled: #3b82f6;
  --color-status-running: #a855f7;
  --color-status-completed: #22c55e;
  --color-status-cancelled: #ef4444;
}

body {
  @apply bg-gray-50 text-gray-900;
}
`,
  'src/types/index.ts': `export type UserRole = 'SOLICITANTE' | 'LOGISTICA';

export interface User {
  id: string;
  name: string;
  role: UserRole;
}
`,
  'src/mock/data.ts': `import { User } from '../types';

export const MOCK_USERS: User[] = [
  { id: '1', name: 'João - Técnico de Campo', role: 'SOLICITANTE' },
  { id: '2', name: 'Carlos - Gestor de Frota', role: 'LOGISTICA' }
];
`,
  'src/context/AuthContext.tsx': `import React, { createContext, useContext, useState, ReactNode } from 'react';
import { User } from '../types';
import { MOCK_USERS } from '../mock/data';

interface AuthContextType {
  user: User | null;
  login: (userId: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(MOCK_USERS[0]);

  const login = (userId: string) => {
    const found = MOCK_USERS.find(u => u.id === userId);
    if (found) setUser(found);
  };

  const logout = () => setUser(null);

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
`,
  'src/components/layout/Sidebar.tsx': `import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { FilePlus, List, Clock, LayoutDashboard, Truck, Map as MapIcon } from 'lucide-react';

export const Sidebar = () => {
  const { user } = useAuth();
  
  if (!user) return null;

  const links = user.role === 'SOLICITANTE' 
    ? [
        { to: '/nova-solicitacao', icon: <FilePlus size={20} />, label: 'Nova Solicitação' },
        { to: '/minhas-solicitacoes', icon: <List size={20} />, label: 'Minhas Solicitações' },
      ]
    : [
        { to: '/dashboard', icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
        { to: '/fila-pendentes', icon: <Clock size={20} />, label: 'Fila de Solicitações' },
        { to: '/gestao-frota', icon: <Truck size={20} />, label: 'Frota & Motoristas' },
        { to: '/monitoramento', icon: <MapIcon size={20} />, label: 'Monitoramento em Tempo Real' },
      ];

  return (
    <aside className="w-64 bg-white border-r border-gray-200 h-full flex flex-col">
      <nav className="p-4 space-y-2">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              \`flex items-center space-x-3 p-3 rounded-lg transition-colors \${
                isActive 
                  ? 'bg-brand-primary/10 text-brand-primary font-medium' 
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }\`
            }
          >
            {link.icon}
            <span>{link.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
};
`,
  'src/components/layout/Header.tsx': `import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { MOCK_USERS } from '../../mock/data';
import { LogOut, Tractor } from 'lucide-react';

export const Header = () => {
  const { user, login, logout } = useAuth();

  return (
    <header className="bg-brand-primary text-white p-4 shadow-md flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <Tractor className="w-8 h-8 text-brand-secondary" />
        <h1 className="text-xl font-bold">Fazenda Progresso</h1>
      </div>
      
      {user && (
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2">
            <span className="text-sm opacity-80">Perfil:</span>
            <select 
              value={user.id}
              onChange={(e) => login(e.target.value)}
              className="bg-brand-secondary border-none rounded-md px-3 py-1 text-sm focus:ring-2 focus:ring-white outline-none"
            >
              {MOCK_USERS.map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>
          
          <button 
            onClick={logout}
            className="flex items-center space-x-2 text-sm hover:text-red-200 transition-colors"
          >
            <LogOut size={16} />
            <span>Sair</span>
          </button>
        </div>
      )}
    </header>
  );
};
`,
  'src/components/layout/MainLayout.tsx': `import React from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

export const MainLayout = () => {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
`,
  'src/pages/auth/Login.tsx': `import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Navigate } from 'react-router-dom';

export const Login = () => {
  const { user, login } = useAuth();

  if (user) {
    return <Navigate to={user.role === 'SOLICITANTE' ? '/nova-solicitacao' : '/dashboard'} replace />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-lg w-96 max-w-full text-center">
        <h2 className="text-2xl font-bold text-brand-primary mb-6">Login - Fazenda Progresso</h2>
        <div className="space-y-4">
          <button 
            onClick={() => login('1')}
            className="w-full bg-brand-primary text-white py-2 rounded hover:bg-brand-secondary transition-colors"
          >
            Entrar como Solicitante (João)
          </button>
          <button 
            onClick={() => login('2')}
            className="w-full bg-brand-secondary text-white py-2 rounded hover:bg-brand-primary transition-colors"
          >
            Entrar como Logística (Carlos)
          </button>
        </div>
      </div>
    </div>
  );
};
`,
  'src/pages/solicitante/NovaSolicitacao.tsx': `import React from 'react';

export const NovaSolicitacao = () => {
  return (
    <div>
      <h2 className="text-2xl font-bold text-brand-primary mb-4">Nova Solicitação</h2>
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <p className="text-gray-500">Formulário de nova solicitação em construção...</p>
      </div>
    </div>
  );
};
`,
  'src/pages/solicitante/MinhasSolicitacoes.tsx': `import React from 'react';

export const MinhasSolicitacoes = () => {
  return (
    <div>
      <h2 className="text-2xl font-bold text-brand-primary mb-4">Minhas Solicitações</h2>
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <p className="text-gray-500">Lista de solicitações do usuário em construção...</p>
      </div>
    </div>
  );
};
`,
  'src/pages/logistica/Dashboard.tsx': `import React from 'react';

export const Dashboard = () => {
  return (
    <div>
      <h2 className="text-2xl font-bold text-brand-primary mb-4">Dashboard</h2>
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <p className="text-gray-500">Métricas e gráficos em construção...</p>
      </div>
    </div>
  );
};
`,
  'src/pages/logistica/FilaPendentes.tsx': `import React from 'react';

export const FilaPendentes = () => {
  return (
    <div>
      <h2 className="text-2xl font-bold text-brand-primary mb-4">Fila de Solicitações</h2>
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <p className="text-gray-500">Fila de aprovações pendentes em construção...</p>
      </div>
    </div>
  );
};
`,
  'src/pages/logistica/GestaoFrota.tsx': `import React from 'react';

export const GestaoFrota = () => {
  return (
    <div>
      <h2 className="text-2xl font-bold text-brand-primary mb-4">Gestão de Frota e Motoristas</h2>
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <p className="text-gray-500">Gestão de veículos em construção...</p>
      </div>
    </div>
  );
};
`,
  'src/pages/logistica/MapaMonitoramento.tsx': `import React from 'react';

export const MapaMonitoramento = () => {
  return (
    <div>
      <h2 className="text-2xl font-bold text-brand-primary mb-4">Monitoramento em Tempo Real</h2>
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <p className="text-gray-500">Mapa de rastreio em construção...</p>
      </div>
    </div>
  );
};
`,
  'src/routes/AppRoutes.tsx': `import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { MainLayout } from '../components/layout/MainLayout';
import { Login } from '../pages/auth/Login';
import { NovaSolicitacao } from '../pages/solicitante/NovaSolicitacao';
import { MinhasSolicitacoes } from '../pages/solicitante/MinhasSolicitacoes';
import { Dashboard } from '../pages/logistica/Dashboard';
import { FilaPendentes } from '../pages/logistica/FilaPendentes';
import { GestaoFrota } from '../pages/logistica/GestaoFrota';
import { MapaMonitoramento } from '../pages/logistica/MapaMonitoramento';

const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode, allowedRoles?: string[] }) => {
  const { user } = useAuth();
  
  if (!user) return <Navigate to="/login" replace />;
  
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={user.role === 'SOLICITANTE' ? '/nova-solicitacao' : '/dashboard'} replace />;
  }
  
  return <>{children}</>;
};

export const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      
      <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
        {/* Solicitante Routes */}
        <Route 
          path="/nova-solicitacao" 
          element={<ProtectedRoute allowedRoles={['SOLICITANTE']}><NovaSolicitacao /></ProtectedRoute>} 
        />
        <Route 
          path="/minhas-solicitacoes" 
          element={<ProtectedRoute allowedRoles={['SOLICITANTE']}><MinhasSolicitacoes /></ProtectedRoute>} 
        />
        
        {/* Logistica Routes */}
        <Route 
          path="/dashboard" 
          element={<ProtectedRoute allowedRoles={['LOGISTICA']}><Dashboard /></ProtectedRoute>} 
        />
        <Route 
          path="/fila-pendentes" 
          element={<ProtectedRoute allowedRoles={['LOGISTICA']}><FilaPendentes /></ProtectedRoute>} 
        />
        <Route 
          path="/gestao-frota" 
          element={<ProtectedRoute allowedRoles={['LOGISTICA']}><GestaoFrota /></ProtectedRoute>} 
        />
        <Route 
          path="/monitoramento" 
          element={<ProtectedRoute allowedRoles={['LOGISTICA']}><MapaMonitoramento /></ProtectedRoute>} 
        />
        
        {/* Default redirect based on role is handled by ProtectedRoute if accessing / */}
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Route>
      
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};
`,
  'src/App.tsx': `import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AppRoutes } from './routes/AppRoutes';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
`
};

for (const [filePath, content] of Object.entries(files)) {
  const fullPath = path.join(__dirname, filePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content, 'utf8');
  console.log("Created " + filePath);
}
