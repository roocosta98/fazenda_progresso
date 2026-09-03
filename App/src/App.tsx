import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { MobileLayout } from './components/layout/MobileLayout';
import { Splash } from './pages/Splash';
import { Login } from './pages/Login';
import { MinhasViagens } from './pages/MinhasViagens';
import { DetalheViagem } from './pages/DetalheViagem';
import { Configuracoes } from './pages/Configuracoes';
import { ExecucaoViagem } from './pages/ExecucaoViagem';
import { MapaViagemMotorista } from './pages/MapaViagemMotorista';
import { NovaSolicitacao } from './pages/NovaSolicitacao';
import { MinhaMeta } from './pages/MinhaMeta';
import { ChecklistAtividade } from './pages/ChecklistAtividade';
import { ListaAuditorias } from './pages/auditoria/ListaAuditorias';
import { NovaAuditoria } from './pages/auditoria/NovaAuditoria';
import { gpsService } from './services/gpsService';
import { AuthProvider } from './context/AuthContext';

function App() {
  useEffect(() => {
    gpsService.initGlobalTracker();
  }, []);

  return (
    <AuthProvider>
      <Router>
        <MobileLayout>
          <Routes>
            <Route path="/" element={<Splash />} />
            <Route path="/login" element={<Login />} />
            <Route path="/viagens" element={<MinhasViagens />} />
            <Route path="/nova-solicitacao" element={<NovaSolicitacao />} />
            <Route path="/viagem/:id" element={<DetalheViagem />} />
            <Route path="/configuracoes" element={<Configuracoes />} />
            <Route path="/viagem/:id/execucao" element={<ExecucaoViagem />} />
            <Route path="/viagem/:id/checklist" element={<ChecklistAtividade />} />
            <Route path="/viagem/:id/mapa" element={<MapaViagemMotorista />} />
            <Route path="/minha-meta" element={<MinhaMeta />} />
            <Route path="/auditorias" element={<ListaAuditorias />} />
            <Route path="/auditoria/nova" element={<NovaAuditoria />} />
          </Routes>
        </MobileLayout>
      </Router>
    </AuthProvider>
  );
}

export default App;
