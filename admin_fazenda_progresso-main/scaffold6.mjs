import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const writeFile = (file, content) => {
  const fullPath = path.join(__dirname, file);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content, 'utf8');
  console.log('Created ' + file);
};

// 1. LogIntegracoesModal
writeFile('src/components/layout/LogIntegracoesModal.tsx', `import { X, Server, MessageCircle, Map as MapIcon, CheckCircle, AlertTriangle } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';

interface LogIntegracoesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LogIntegracoesModal = ({ isOpen, onClose }: LogIntegracoesModalProps) => {
  const { notificacoes } = useAppContext();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm transition-opacity">
      <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-slide-in-right">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
          <div className="flex items-center space-x-2">
            <Server className="text-gray-500" size={20} />
            <h3 className="text-lg font-bold text-gray-900">Logs de Integração</h3>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
          {/* Static Mock Logs based on PRD */}
          <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm text-sm">
            <div className="flex items-center space-x-2 text-brand-primary font-bold mb-1">
              <Server size={14} /> <span>Sankhya ERP API</span>
            </div>
            <p className="text-gray-600 font-mono text-xs break-words">
              [STATUS 200] OS-2026-0042 integrada com sucesso. ID Sankhya #89412.
            </p>
          </div>
          
          <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm text-sm">
            <div className="flex items-center space-x-2 text-green-600 font-bold mb-1">
              <MessageCircle size={14} /> <span>WhatsApp Meta Official API</span>
            </div>
            <p className="text-gray-600 font-mono text-xs break-words">
              [ENVIADO] Notificação disparada para Motorista Carlos (5511999999999) e Solicitante João.
            </p>
          </div>
          
          <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm text-sm border-l-4 border-l-blue-500">
            <div className="flex items-center space-x-2 text-blue-600 font-bold mb-1">
              <MapIcon size={14} /> <span>GPS Sync Telemetria</span>
            </div>
            <p className="text-gray-600 font-mono text-xs break-words">
              [RECEBIDO] Posição atualizada da OS-2026-0042. Rota: Lote 12.
            </p>
          </div>

          {/* Dynamic Context Notifications */}
          {notificacoes.map(notif => (
            <div key={notif.id} className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm text-sm">
              <div className="flex items-center space-x-2 text-gray-700 font-bold mb-1">
                {notif.tipo === 'whatsapp' ? <MessageCircle size={14} className="text-green-500" /> : <Server size={14} className="text-gray-500" />}
                <span className="capitalize">{notif.tipo}</span>
              </div>
              <p className="text-gray-600 font-mono text-xs break-words">
                {notif.mensagem}
              </p>
              <p className="text-gray-400 text-[10px] mt-2 text-right">{new Date(notif.data).toLocaleTimeString()}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
`);

// 2. MapaMonitoramento
writeFile('src/pages/logistica/MapaMonitoramento.tsx', `import { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { MapPin, AlertTriangle, Truck, Navigation, Navigation2, Search, Crosshair, AlertCircle } from 'lucide-react';
import type { SolicitacaoTransporte } from '../../types';

export const MapaMonitoramento = () => {
  const { solicitacoes } = useAppContext();
  
  // Pegar OSs em execução
  const emExecucao = solicitacoes.filter(s => s.status === 'em_execucao');
  
  const [selectedOS, setSelectedOS] = useState<SolicitacaoTransporte | null>(null);

  // Mocks de coordenadas relativas para o painel CSS
  const getFakedCoordinates = (osId: string) => {
    // Generate deterministic fake coordinates based on ID length or chars
    const hash = osId.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
    const top = 20 + (hash % 60); // 20% to 80%
    const left = 20 + ((hash * 3) % 60);
    return { top: \`\${top}%\`, left: \`\${left}%\` };
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 h-[calc(100vh-140px)] flex flex-col">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Monitoramento em Tempo Real</h2>
        <p className="text-gray-500 mt-1">Acompanhe a telemetria e posição atualizada dos veículos em operação na fazenda.</p>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-6 overflow-hidden">
        
        {/* Mapa Interativo (Mock Visual) */}
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden relative flex flex-col">
          <div className="absolute top-4 left-4 z-10 bg-white p-2 rounded-lg shadow-md border border-gray-200 flex space-x-2">
            <button className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors" title="Centralizar Mapa">
              <Crosshair size={20} />
            </button>
            <div className="flex items-center px-3 bg-brand-primary/10 text-brand-primary rounded font-medium text-sm border border-brand-primary/20">
              <Navigation2 size={16} className="mr-2" /> GPS Ativo (Sync)
            </div>
          </div>

          <div className="flex-1 relative bg-[url('https://www.transparenttextures.com/patterns/grid-me.png')] bg-[#e5e7eb] overflow-hidden group">
            {/* Elementos topográficos fakes do mapa SVG */}
            <div className="absolute inset-0 opacity-20 pointer-events-none">
              <svg width="100%" height="100%">
                <path d="M0,100 Q150,50 300,200 T600,100 T1000,300" stroke="#1b4332" strokeWidth="8" fill="none" opacity="0.3" strokeDasharray="10 5" />
                <circle cx="20%" cy="30%" r="150" fill="#22c55e" opacity="0.1" />
                <circle cx="70%" cy="60%" r="200" fill="#22c55e" opacity="0.1" />
                <circle cx="80%" cy="20%" r="100" fill="#3b82f6" opacity="0.1" />
              </svg>
            </div>
            
            <div className="absolute bottom-4 right-4 bg-white/80 backdrop-blur px-3 py-1 rounded text-xs text-gray-500 font-medium">
              Satelite / Planta Baixa Fazenda Progresso
            </div>

            {/* Pinos dos Veículos */}
            {emExecucao.map(sol => {
              const coords = getFakedCoordinates(sol.id);
              const isSelected = selectedOS?.id === sol.id;
              
              return (
                <div 
                  key={sol.id}
                  className={\`absolute w-8 h-8 -ml-4 -mt-4 rounded-full flex items-center justify-center cursor-pointer shadow-lg transform transition-all \${isSelected ? 'scale-125 z-20 bg-brand-primary text-white ring-4 ring-brand-primary/30' : 'bg-white text-brand-primary border-2 border-brand-primary hover:scale-110 z-10'}\`}
                  style={{ top: coords.top, left: coords.left }}
                  onClick={() => setSelectedOS(sol)}
                >
                  <Truck size={16} />
                  
                  {isSelected && (
                    <div className="absolute top-10 left-1/2 -translate-x-1/2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 p-3 text-left animate-fade-in-up">
                      <div className="absolute -top-2 left-1/2 -translate-x-1/2 border-8 border-transparent border-b-white"></div>
                      
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-bold text-gray-900 text-sm">{sol.numeroOS}</span>
                        <span className="text-[10px] font-mono bg-brand-primary/10 text-brand-primary px-1.5 rounded">{sol.veiculoAlocado?.placa}</span>
                      </div>
                      
                      <div className="space-y-1.5">
                        <p className="text-xs text-gray-600 flex items-center"><Navigation size={12} className="mr-1 text-gray-400" /> {sol.origem} &rarr; {sol.destino}</p>
                        <p className="text-xs text-gray-600 flex items-center"><Truck size={12} className="mr-1 text-gray-400" /> {sol.veiculoAlocado?.modelo}</p>
                        
                        <div className="mt-2 pt-2 border-t border-gray-100">
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-gray-500">Progresso da Rota</span>
                            <span className="font-bold text-brand-primary">45%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-1.5">
                            <div className="bg-brand-primary h-1.5 rounded-full" style={{ width: '45%' }}></div>
                          </div>
                        </div>
                        <div className="flex justify-between items-center pt-1">
                          <span className="text-[10px] text-gray-400">Velocidade: 42 km/h</span>
                          <span className="text-[10px] text-green-500 font-medium">Sinal: Online</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Painel Lateral */}
        <div className="lg:w-96 flex flex-col gap-6 overflow-y-auto">
          {/* Seção de Alertas */}
          <div className="bg-white rounded-xl shadow-sm border border-red-200 overflow-hidden">
            <div className="bg-red-50 p-3 border-b border-red-200 flex items-center space-x-2">
              <AlertTriangle size={18} className="text-red-600" />
              <h3 className="font-bold text-red-800 text-sm uppercase tracking-wide">Alertas da Operação</h3>
            </div>
            <div className="p-3 space-y-3">
              <div className="bg-white border border-red-100 p-3 rounded-lg flex items-start space-x-3 shadow-sm relative overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-yellow-500"></div>
                <AlertCircle size={16} className="text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-gray-900">Prancha Volvo (ABC-1234)</p>
                  <p className="text-xs text-gray-600 mt-0.5">Parada prolongada identificada no Lote 14 (35 min). <span className="text-brand-secondary font-medium cursor-pointer hover:underline">Centralizar no mapa</span></p>
                </div>
              </div>

              <div className="bg-white border border-red-100 p-3 rounded-lg flex items-start space-x-3 shadow-sm relative overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500"></div>
                <AlertCircle size={16} className="text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-gray-900">Fiat Strada (GHI-9012)</p>
                  <p className="text-xs text-gray-600 mt-0.5">Desvio de rota detectado (+8 km da rota programada para a Sedes).</p>
                </div>
              </div>
            </div>
          </div>

          {/* Lista de Veículos Ativos */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex-1 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
              <h3 className="font-bold text-gray-900">Veículos em Rota ({emExecucao.length})</h3>
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" placeholder="Filtrar..." className="pl-8 pr-3 py-1 border border-gray-200 rounded-md text-xs w-32 focus:w-48 transition-all focus:ring-brand-primary" />
              </div>
            </div>
            
            <div className="overflow-y-auto flex-1 p-2 space-y-2">
              {emExecucao.length === 0 ? (
                <div className="text-center p-6 text-gray-500 text-sm">
                  Nenhum veículo em rota no momento.
                </div>
              ) : (
                emExecucao.map(sol => (
                  <div 
                    key={sol.id} 
                    onClick={() => setSelectedOS(sol)}
                    className={\`p-3 rounded-lg border cursor-pointer transition-colors \${selectedOS?.id === sol.id ? 'border-brand-primary bg-brand-primary/5' : 'border-gray-100 hover:border-brand-primary/30 hover:bg-gray-50'}\`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-gray-900 text-sm">{sol.numeroOS}</span>
                      <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-medium flex items-center">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1 animate-pulse"></span> Online
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 mb-2 truncate font-medium">{sol.veiculoAlocado?.modelo} • {sol.motoristaAlocado?.nome}</p>
                    
                    <div className="flex items-center justify-between text-[10px] text-gray-500">
                      <span className="flex items-center"><MapPin size={10} className="mr-1" /> {sol.destino}</span>
                      <span className="font-mono">{sol.veiculoAlocado?.placa}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
`);

// 3. Update Header.tsx to include LogIntegracoesModal
let header = fs.readFileSync(path.join(__dirname, 'src/components/layout/Header.tsx'), 'utf8');
if (!header.includes('LogIntegracoesModal')) {
  header = header.replace(/import \{ LogOut, Tractor \} from 'lucide-react';/, "import { LogOut, Tractor, Activity } from 'lucide-react';\nimport { useState } from 'react';\nimport { LogIntegracoesModal } from './LogIntegracoesModal';");
  header = header.replace(/export const Header = \(\) => \{/, "export const Header = () => {\n  const [logModalOpen, setLogModalOpen] = useState(false);");
  header = header.replace(/<div className="flex items-center space-x-6">/, `<div className="flex items-center space-x-6">
          <button 
            onClick={() => setLogModalOpen(true)}
            className="relative p-2 text-white/80 hover:text-white hover:bg-brand-secondary rounded-full transition-colors"
            title="Logs de Integração"
          >
            <Activity size={20} />
            <span className="absolute top-1 right-1 w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></span>
          </button>
          
          <div className="h-6 w-px bg-white/20"></div>`);
  header = header.replace(/<\/header>/, "</header>\n      <LogIntegracoesModal isOpen={logModalOpen} onClose={() => setLogModalOpen(false)} />");
  writeFile('src/components/layout/Header.tsx', header);
}

// 4. Update AppRoutes.tsx and Sidebar.tsx to match final PRD routes
let sidebar = fs.readFileSync(path.join(__dirname, 'src/components/layout/Sidebar.tsx'), 'utf8');
sidebar = sidebar.replace(/\/nova-solicitacao/g, '/solicitante/nova');
sidebar = sidebar.replace(/\/minhas-solicitacoes/g, '/solicitante/minhas');
sidebar = sidebar.replace(/\/dashboard/g, '/logistica/dashboard');
sidebar = sidebar.replace(/\/fila-pendentes/g, '/logistica/pendentes');
sidebar = sidebar.replace(/\/gestao-frota/g, '/logistica/frota');
sidebar = sidebar.replace(/\/monitoramento/g, '/logistica/monitoramento');
writeFile('src/components/layout/Sidebar.tsx', sidebar);

let login = fs.readFileSync(path.join(__dirname, 'src/pages/auth/Login.tsx'), 'utf8');
login = login.replace(/\/nova-solicitacao/g, '/solicitante/nova');
login = login.replace(/\/dashboard/g, '/logistica/dashboard');
writeFile('src/pages/auth/Login.tsx', login);

let novaSol = fs.readFileSync(path.join(__dirname, 'src/pages/solicitante/NovaSolicitacao.tsx'), 'utf8');
novaSol = novaSol.replace(/\/minhas-solicitacoes/g, '/solicitante/minhas');
writeFile('src/pages/solicitante/NovaSolicitacao.tsx', novaSol);

let routes = fs.readFileSync(path.join(__dirname, 'src/routes/AppRoutes.tsx'), 'utf8');
routes = routes.replace(/\/nova-solicitacao/g, '/solicitante/nova');
routes = routes.replace(/\/minhas-solicitacoes/g, '/solicitante/minhas');
routes = routes.replace(/\/dashboard/g, '/logistica/dashboard');
routes = routes.replace(/\/fila-pendentes/g, '/logistica/pendentes');
routes = routes.replace(/\/gestao-frota/g, '/logistica/frota');
routes = routes.replace(/\/monitoramento/g, '/logistica/monitoramento');
writeFile('src/routes/AppRoutes.tsx', routes);

// Add custom slide-in animation
let indexCss = fs.readFileSync(path.join(__dirname, 'src/index.css'), 'utf8');
if (!indexCss.includes('@keyframes slide-in-right')) {
  indexCss += `\n@keyframes slide-in-right {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}
.animate-slide-in-right {
  animation: slide-in-right 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
`;
  writeFile('src/index.css', indexCss);
}

console.log("Scaffold step 6 complete");
