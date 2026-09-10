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
import { PainelMetas } from '../pages/logistica/PainelMetas';
import { MetasOrfas } from '../pages/logistica/MetasOrfas';
import { AvaliacaoConducao } from '../pages/logistica/AvaliacaoConducao';
import { MapaMonitoramento } from '../pages/logistica/MapaMonitoramento';
import { TelaTVMonitor } from '../pages/logistica/TelaTVMonitor';
import { Safras } from '../pages/logistica/Safras';
import { ColheitaTransporte } from '../pages/logistica/ColheitaTransporte';
import { Manutencao } from '../pages/logistica/Manutencao';
import { GiroEstoque } from '../pages/logistica/GiroEstoque';

const ProtectedRoute = ({ children, allowedRoles: _allowedRoles }: { children: ReactNode, allowedRoles?: string[] }) => {
  const { usuario } = useAuth();
  
  if (!usuario) return <Navigate to="/" replace />;
  
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
        <Route path="/logistica/manutencao" element={<ProtectedRoute allowedRoles={['logistica']}><Manutencao /></ProtectedRoute>} />
        <Route path="/logistica/manutencao/preventivas" element={<ProtectedRoute allowedRoles={['logistica']}><Manutencao abaInicial="preventivas" /></ProtectedRoute>} />
        <Route path="/logistica/manutencao/ordens" element={<ProtectedRoute allowedRoles={['logistica']}><Manutencao abaInicial="ordens" /></ProtectedRoute>} />
        <Route path="/logistica/manutencao/historico" element={<ProtectedRoute allowedRoles={['logistica']}><Manutencao abaInicial="historico" /></ProtectedRoute>} />
        <Route
          path="/logistica/metas"
          element={<ProtectedRoute allowedRoles={['logistica']}><PainelMetas /></ProtectedRoute>}
        />
        <Route
          path="/logistica/metas-orfas"
          element={<ProtectedRoute allowedRoles={['logistica']}><MetasOrfas /></ProtectedRoute>}
        />
        <Route
          path="/logistica/avaliacao-conducao"
          element={<ProtectedRoute allowedRoles={['logistica']}><AvaliacaoConducao /></ProtectedRoute>}
        />
        <Route
          path="/logistica/monitoramento" 
          element={<ProtectedRoute allowedRoles={['logistica']}><MapaMonitoramento /></ProtectedRoute>} 
        />
        <Route
          path="/logistica/safras"
          element={<ProtectedRoute allowedRoles={['logistica']}><Safras /></ProtectedRoute>}
        />
        <Route
          path="/logistica/colheita-transporte"
          element={<ProtectedRoute allowedRoles={['logistica']}><ColheitaTransporte /></ProtectedRoute>}
        />
        <Route
          path="/logistica/estoque"
          element={<ProtectedRoute allowedRoles={['logistica']}><GiroEstoque /></ProtectedRoute>}
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
