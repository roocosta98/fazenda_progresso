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
import { gpsService } from './services/gpsService';

function App() {
  useEffect(() => {
    gpsService.initGlobalTracker();
  }, []);

  return (
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
          <Route path="/viagem/:id/mapa" element={<MapaViagemMotorista />} />
        </Routes>
      </MobileLayout>
    </Router>
  );
}

export default App;
