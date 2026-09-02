import type { ReactNode } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { MainLayout } from '../components/layout/MainLayout';
import { Login } from '../pages/auth/Login';
import { MinhasSolicitacoes } from '../pages/solicitante/MinhasSolicitacoes';
import { Dashboard } from '../pages/logistica/Dashboard';
import { DashboardBI } from '../pages/logistica/DashboardBI';
import { FilaPendentes } from '../pages/logistica/FilaPendentes';
import { GestaoFrota } from '../pages/logistica/GestaoFrota';
import { MapaMonitoramento } from '../pages/logistica/MapaMonitoramento';
import { TelaTVMonitor } from '../pages/logistica/TelaTVMonitor';

const ProtectedRoute = ({ children, allowedRoles }: { children: ReactNode, allowedRoles?: string[] }) => {
  const { usuario } = useAuth();
  
  if (!usuario) return <Navigate to="/" replace />;
  
  if (allowedRoles && !allowedRoles.includes(usuario.perfil)) {
    return <Navigate to={usuario.perfil === 'solicitante' ? '/solicitante/minhas' : '/logistica/dashboard'} replace />;
  }
  
  return <>{children}</>;
};

export const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      
      <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
        {/* Solicitante Routes */}

        <Route 
          path="/solicitante/minhas" 
          element={<ProtectedRoute allowedRoles={['solicitante']}><MinhasSolicitacoes /></ProtectedRoute>} 
        />
        
        {/* Logistica Routes */}
        <Route 
          path="/logistica/dashboard" 
          element={<ProtectedRoute allowedRoles={['logistica']}><Dashboard /></ProtectedRoute>} 
        />
        <Route 
          path="/logistica/bi" 
          element={<ProtectedRoute allowedRoles={['logistica']}><DashboardBI /></ProtectedRoute>} 
        />
        <Route 
          path="/logistica/pendentes" 
          element={<ProtectedRoute allowedRoles={['logistica']}><FilaPendentes /></ProtectedRoute>} 
        />
        <Route 
          path="/logistica/frota" 
          element={<ProtectedRoute allowedRoles={['logistica']}><GestaoFrota /></ProtectedRoute>} 
        />
        <Route 
          path="/logistica/monitoramento" 
          element={<ProtectedRoute allowedRoles={['logistica']}><MapaMonitoramento /></ProtectedRoute>} 
        />
      </Route>
      
      <Route 
        path="/logistica/monitor-tv" 
        element={<ProtectedRoute allowedRoles={['logistica']}><TelaTVMonitor /></ProtectedRoute>} 
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};
