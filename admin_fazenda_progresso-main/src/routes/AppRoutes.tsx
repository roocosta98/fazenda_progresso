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
import { PesquisaIA } from '../pages/logistica/PesquisaIA';
import { Estoque } from '../pages/estoque/Estoque';
import { DashboardEstoque } from '../pages/estoque/DashboardEstoque';
import { ProducaoBatata } from '../pages/producao/ProducaoBatata';
import { GestaoUsuarios } from '../pages/administracao/GestaoUsuarios';
import { ConfiguracaoIA } from '../pages/administracao/ConfiguracaoIA';
import { Manutencao } from '../pages/manutencao/Manutencao';
import { Inicio } from '../pages/inicio/Inicio';
import { Compras } from '../pages/compras/Compras';
import { EmConstrucao } from '../pages/em-construcao/EmConstrucao';

const ProtectedRoute = ({ children, allowedRoles }: { children: ReactNode, allowedRoles?: string[] }) => {
  const { usuario } = useAuth();
  
  if (!usuario) return <Navigate to="/" replace />;
  
  if (allowedRoles && !allowedRoles.includes(usuario.perfil)) {
    return <Navigate to={usuario.perfil === 'solicitante' ? '/solicitante/minhas' : '/inicio'} replace />;
  }
  
  return <>{children}</>;
};

export const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      
      <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
        <Route
          path="/inicio"
          element={<ProtectedRoute allowedRoles={['logistica']}><Inicio /></ProtectedRoute>}
        />

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
          path="/logistica/pesquisa-ia"
          element={<ProtectedRoute allowedRoles={['logistica']}><PesquisaIA /></ProtectedRoute>}
        />
        <Route
          path="/logistica/estoque"
          element={<ProtectedRoute allowedRoles={['logistica']}><Estoque /></ProtectedRoute>}
        />
        <Route path="/logistica/estoque/dashboard" element={<ProtectedRoute allowedRoles={['logistica']}><DashboardEstoque /></ProtectedRoute>} />
        <Route path="/producao/batata" element={<ProtectedRoute allowedRoles={['logistica']}><ProducaoBatata /></ProtectedRoute>} />
        <Route path="/producao/batata/safras" element={<ProtectedRoute allowedRoles={['logistica']}><ProducaoBatata tela="safras" /></ProtectedRoute>} />
        <Route path="/producao/batata/lancamentos" element={<ProtectedRoute allowedRoles={['logistica']}><ProducaoBatata tela="lancamentos" /></ProtectedRoute>} />
        <Route path="/producao/batata/comparativo" element={<ProtectedRoute allowedRoles={['logistica']}><ProducaoBatata tela="comparativo" /></ProtectedRoute>} />
        <Route path="/manutencao" element={<ProtectedRoute allowedRoles={['logistica']}><Manutencao /></ProtectedRoute>} />
        <Route path="/manutencao/ativos" element={<ProtectedRoute allowedRoles={['logistica']}><Manutencao /></ProtectedRoute>} />
        <Route path="/manutencao/ordens" element={<ProtectedRoute allowedRoles={['logistica']}><Manutencao /></ProtectedRoute>} />
        <Route path="/manutencao/preventivas" element={<ProtectedRoute allowedRoles={['logistica']}><Manutencao /></ProtectedRoute>} />
        <Route path="/manutencao/historico" element={<ProtectedRoute allowedRoles={['logistica']}><Manutencao /></ProtectedRoute>} />
        <Route path="/compras" element={<ProtectedRoute allowedRoles={['logistica']}><Compras /></ProtectedRoute>} />
        <Route path="/financeiro" element={<ProtectedRoute allowedRoles={['logistica']}><EmConstrucao titulo="Financeiro" /></ProtectedRoute>} />
        <Route path="/comercial" element={<ProtectedRoute allowedRoles={['logistica']}><EmConstrucao titulo="Comercial" /></ProtectedRoute>} />
        <Route path="/custos" element={<ProtectedRoute allowedRoles={['logistica']}><EmConstrucao titulo="Custos" /></ProtectedRoute>} />
        <Route path="/rh" element={<ProtectedRoute allowedRoles={['logistica']}><EmConstrucao titulo="DP / RH" /></ProtectedRoute>} />
        <Route path="/seguranca-trabalho" element={<ProtectedRoute allowedRoles={['logistica']}><EmConstrucao titulo="Segurança do Trabalho" /></ProtectedRoute>} />
        <Route path="/controladoria" element={<ProtectedRoute allowedRoles={['logistica']}><EmConstrucao titulo="Controladoria" /></ProtectedRoute>} />
        <Route path="/fiscal" element={<ProtectedRoute allowedRoles={['logistica']}><EmConstrucao titulo="Fiscal" /></ProtectedRoute>} />
        <Route path="/administracao/usuarios" element={<ProtectedRoute allowedRoles={['logistica']}><GestaoUsuarios /></ProtectedRoute>} />
        <Route path="/administracao/ia" element={<ProtectedRoute allowedRoles={['logistica']}><ConfiguracaoIA /></ProtectedRoute>} />
      </Route>
      
      <Route 
        path="/logistica/monitor-tv" 
        element={<ProtectedRoute allowedRoles={['logistica']}><TelaTVMonitor /></ProtectedRoute>} 
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};
