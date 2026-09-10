import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const typesIndex = `export type PerfilUsuario = 'solicitante' | 'logistica' | 'motorista';

export interface Usuario {
  id: string;
  idSankhya?: string;
  nome: string;
  perfil: PerfilUsuario;
  departamento?: string;
}

export type StatusVeiculo = 'disponivel' | 'em_uso' | 'manutencao';

export interface Veiculo {
  id: string;
  placa: string;
  modelo: string;
  tipo: string;
  status: StatusVeiculo;
}

export type StatusMotorista = 'disponivel' | 'em_rota' | 'folga';

export interface Motorista {
  id: string;
  nome: string;
  telefone: string;
  status: StatusMotorista;
}

export interface Projeto {
  id: string;
  nome: string;
  centroCusto: string;
}

export type StatusSolicitacao = 'pendente' | 'agendada' | 'em_execucao' | 'concluida' | 'cancelada';

export interface SolicitacaoTransporte {
  id: string;
  numeroOS: string;
  solicitante: Usuario;
  tipoServico: string;
  origem: string;
  destino: string;
  dataSolicitacao: string;
  dataProgramada?: string;
  horarioProgramado?: string;
  projeto: Projeto;
  observacoes?: string;
  status: StatusSolicitacao;
  veiculoAlocado?: Veiculo;
  motoristaAlocado?: Motorista;
  dadosExecucao?: {
    kmInicial?: number;
    kmFinal?: number;
    dataHoraSaida?: string;
    dataHoraChegada?: string;
  };
  observacaoLogistica?: string;
  motivoCancelamento?: string;
}

export interface NotificacaoSimulada {
  id: string;
  mensagem: string;
  data: string;
  lida: boolean;
  tipo: 'sankhya' | 'whatsapp' | 'sistema';
}
`;

const mockData = `import type { Usuario, Projeto, Veiculo, Motorista, SolicitacaoTransporte } from '../types';

export const MOCK_USUARIOS: Usuario[] = [
  { id: '1', idSankhya: 'S-1001', nome: 'João - Técnico de Campo', perfil: 'solicitante', departamento: 'Agrícola' },
  { id: '2', idSankhya: 'S-1002', nome: 'Carlos - Gestor de Frota', perfil: 'logistica', departamento: 'Logística' },
  { id: '3', idSankhya: 'S-1003', nome: 'Antônio - Motorista', perfil: 'motorista', departamento: 'Frota' },
];

export const MOCK_PROJETOS: Projeto[] = [
  { id: 'P-001', nome: 'PRODUÇÃO DE BATATA FCB 2026', centroCusto: 'CC-BATATA-26' },
  { id: 'P-002', nome: 'SAFRA SOJA LESTE 2026', centroCusto: 'CC-SOJA-L-26' },
  { id: 'P-003', nome: 'INFRAESTRUTURA E MANUTENÇÃO', centroCusto: 'CC-INFRA' },
];

export const MOCK_VEICULOS: Veiculo[] = [
  { id: 'V-001', placa: 'ABC-1234', modelo: 'Volvo FH 540', tipo: 'Prancha', status: 'disponivel' },
  { id: 'V-002', placa: 'DEF-5678', modelo: 'Mercedes-Benz Atego', tipo: 'Comboio', status: 'em_uso' },
  { id: 'V-003', placa: 'GHI-9012', modelo: 'Fiat Strada', tipo: 'Carro Passeio', status: 'disponivel' },
  { id: 'V-004', placa: 'JKL-3456', modelo: 'Agrale Marruá', tipo: 'Ônibus', status: 'manutencao' },
  { id: 'V-005', placa: 'MNO-7890', modelo: 'John Deere 8R', tipo: 'Trator', status: 'disponivel' },
  { id: 'V-006', placa: 'PQR-1234', modelo: 'Scania R500', tipo: 'Caçamba', status: 'disponivel' },
];

export const MOCK_MOTORISTAS: Motorista[] = [
  { id: 'M-001', nome: 'Antônio Silva', telefone: '(61) 99999-1111', status: 'disponivel' },
  { id: 'M-002', nome: 'Pedro Santos', telefone: '(61) 99999-2222', status: 'em_rota' },
  { id: 'M-003', nome: 'José Oliveira', telefone: '(61) 99999-3333', status: 'folga' },
  { id: 'M-004', nome: 'Marcos Costa', telefone: '(61) 99999-4444', status: 'disponivel' },
];

export const MOCK_SOLICITACOES: SolicitacaoTransporte[] = [
  {
    id: 'SOL-001',
    numeroOS: 'OS-2026-0001',
    solicitante: MOCK_USUARIOS[0],
    tipoServico: 'Carro Passeio',
    origem: 'Sedes',
    destino: 'Lote 12',
    dataSolicitacao: '2026-07-28T08:00:00Z',
    dataProgramada: '2026-07-30',
    horarioProgramado: '09:00',
    projeto: MOCK_PROJETOS[0],
    observacoes: 'Visita técnica ao lote 12',
    status: 'concluida',
    veiculoAlocado: MOCK_VEICULOS[2],
    motoristaAlocado: MOCK_MOTORISTAS[0],
    dadosExecucao: {
      kmInicial: 12500,
      kmFinal: 12540,
      dataHoraSaida: '2026-07-30T09:05:00Z',
      dataHoraChegada: '2026-07-30T14:30:00Z'
    }
  },
  {
    id: 'SOL-002',
    numeroOS: 'OS-2026-0002',
    solicitante: MOCK_USUARIOS[0],
    tipoServico: 'Prancha',
    origem: 'Galpão de Insumos',
    destino: 'Campo de Batata',
    dataSolicitacao: '2026-07-29T10:15:00Z',
    dataProgramada: '2026-07-31',
    horarioProgramado: '14:00',
    projeto: MOCK_PROJETOS[0],
    observacoes: 'Transporte de colheitadeira',
    status: 'agendada',
    veiculoAlocado: MOCK_VEICULOS[0],
    motoristaAlocado: MOCK_MOTORISTAS[3]
  },
  {
    id: 'SOL-003',
    numeroOS: 'OS-2026-0003',
    solicitante: MOCK_USUARIOS[0],
    tipoServico: 'Comboio',
    origem: 'Sedes',
    destino: 'Safra Leste',
    dataSolicitacao: '2026-07-30T07:30:00Z',
    dataProgramada: '2026-07-30',
    horarioProgramado: '10:00',
    projeto: MOCK_PROJETOS[1],
    observacoes: 'Abastecimento das máquinas no campo',
    status: 'em_execucao',
    veiculoAlocado: MOCK_VEICULOS[1],
    motoristaAlocado: MOCK_MOTORISTAS[1],
    dadosExecucao: {
      kmInicial: 45200,
      dataHoraSaida: '2026-07-30T10:10:00Z'
    }
  },
  {
    id: 'SOL-004',
    numeroOS: 'OS-2026-0004',
    solicitante: MOCK_USUARIOS[0],
    tipoServico: 'Trator',
    origem: 'Oficina Central',
    destino: 'Lote 15',
    dataSolicitacao: '2026-07-30T11:45:00Z',
    dataProgramada: '2026-08-01',
    horarioProgramado: '07:00',
    projeto: MOCK_PROJETOS[2],
    status: 'pendente'
  },
  {
    id: 'SOL-005',
    numeroOS: 'OS-2026-0005',
    solicitante: MOCK_USUARIOS[0],
    tipoServico: 'Ônibus',
    origem: 'Sedes',
    destino: 'Lote 12',
    dataSolicitacao: '2026-07-25T16:20:00Z',
    dataProgramada: '2026-07-26',
    horarioProgramado: '06:00',
    projeto: MOCK_PROJETOS[0],
    status: 'cancelada',
    motivoCancelamento: 'Chuva forte, impossível acessar o lote'
  },
  {
    id: 'SOL-006',
    numeroOS: 'OS-2026-0006',
    solicitante: MOCK_USUARIOS[0],
    tipoServico: 'Caçamba',
    origem: 'Pedreira',
    destino: 'Estrada Sul',
    dataSolicitacao: '2026-07-30T12:00:00Z',
    dataProgramada: '2026-08-02',
    horarioProgramado: '08:00',
    projeto: MOCK_PROJETOS[2],
    status: 'pendente'
  }
];
`;

const appContext = `import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import type { 
  SolicitacaoTransporte, 
  StatusSolicitacao, 
  NotificacaoSimulada 
} from '../types';
import { MOCK_SOLICITACOES, MOCK_VEICULOS, MOCK_MOTORISTAS } from '../mock/data';

interface AppContextType {
  solicitacoes: SolicitacaoTransporte[];
  notificacoes: NotificacaoSimulada[];
  criarSolicitacao: (dados: Omit<SolicitacaoTransporte, 'id' | 'numeroOS' | 'status' | 'dataSolicitacao'>) => void;
  aprovarEAgendarSolicitacao: (idOS: string, veiculoId: string, motoristaId: string, horarioConfirmado?: string) => void;
  reagendarSolicitacao: (idOS: string, novaData: string, novoHorario: string, observacaoLogistica: string) => void;
  cancelarSolicitacao: (idOS: string, motivo: string) => void;
  filtrarSolicitacoes: (filtros: { status?: StatusSolicitacao, projetoId?: string, busca?: string }) => SolicitacaoTransporte[];
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [solicitacoes, setSolicitacoes] = useState<SolicitacaoTransporte[]>(MOCK_SOLICITACOES);
  const [notificacoes, setNotificacoes] = useState<NotificacaoSimulada[]>([]);

  const gerarNumeroOS = useCallback(() => {
    const ano = new Date().getFullYear();
    const count = solicitacoes.length + 1;
    return \`OS-\${ano}-\${count.toString().padStart(4, '0')}\`;
  }, [solicitacoes]);

  const criarSolicitacao = (dados: Omit<SolicitacaoTransporte, 'id' | 'numeroOS' | 'status' | 'dataSolicitacao'>) => {
    const novaSolicitacao: SolicitacaoTransporte = {
      ...dados,
      id: \`SOL-\${Date.now()}\`,
      numeroOS: gerarNumeroOS(),
      status: 'pendente',
      dataSolicitacao: new Date().toISOString()
    };
    setSolicitacoes(prev => [novaSolicitacao, ...prev]);
  };

  const aprovarEAgendarSolicitacao = (idOS: string, veiculoId: string, motoristaId: string, horarioConfirmado?: string) => {
    const veiculo = MOCK_VEICULOS.find(v => v.id === veiculoId);
    const motorista = MOCK_MOTORISTAS.find(m => m.id === motoristaId);
    
    if (!veiculo || !motorista) return;

    setSolicitacoes(prev => prev.map(sol => {
      if (sol.numeroOS === idOS) {
        return {
          ...sol,
          status: 'agendada',
          veiculoAlocado: veiculo,
          motoristaAlocado: motorista,
          ...(horarioConfirmado && { horarioProgramado: horarioConfirmado })
        };
      }
      return sol;
    }));

    // Simular notificação
    const novaNotif: NotificacaoSimulada = {
      id: \`NOT-\${Date.now()}\`,
      mensagem: \`A OS \${idOS} foi agendada. Motorista \${motorista.nome} e veículo \${veiculo.placa} alocados.\`,
      data: new Date().toISOString(),
      lida: false,
      tipo: 'whatsapp'
    };
    setNotificacoes(prev => [novaNotif, ...prev]);
  };

  const reagendarSolicitacao = (idOS: string, novaData: string, novoHorario: string, observacaoLogistica: string) => {
    setSolicitacoes(prev => prev.map(sol => {
      if (sol.numeroOS === idOS) {
        return {
          ...sol,
          dataProgramada: novaData,
          horarioProgramado: novoHorario,
          observacaoLogistica: sol.observacaoLogistica 
            ? \`\${sol.observacaoLogistica}\\n\${observacaoLogistica}\`
            : observacaoLogistica
        };
      }
      return sol;
    }));
  };

  const cancelarSolicitacao = (idOS: string, motivo: string) => {
    setSolicitacoes(prev => prev.map(sol => {
      if (sol.numeroOS === idOS) {
        return {
          ...sol,
          status: 'cancelada',
          motivoCancelamento: motivo
        };
      }
      return sol;
    }));
  };

  const filtrarSolicitacoes = (filtros: { status?: StatusSolicitacao, projetoId?: string, busca?: string }) => {
    return solicitacoes.filter(sol => {
      let matches = true;
      if (filtros.status && sol.status !== filtros.status) matches = false;
      if (filtros.projetoId && sol.projeto.id !== filtros.projetoId) matches = false;
      if (filtros.busca) {
        const query = filtros.busca.toLowerCase();
        if (!sol.numeroOS.toLowerCase().includes(query) && 
            !sol.tipoServico.toLowerCase().includes(query) &&
            !sol.destino.toLowerCase().includes(query)) {
          matches = false;
        }
      }
      return matches;
    });
  };

  return (
    <AppContext.Provider value={{
      solicitacoes,
      notificacoes,
      criarSolicitacao,
      aprovarEAgendarSolicitacao,
      reagendarSolicitacao,
      cancelarSolicitacao,
      filtrarSolicitacoes
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext must be used within AppProvider');
  return context;
};
`;

const writeFile = (file, content) => {
  fs.writeFileSync(path.join(__dirname, file), content, 'utf8');
  console.log('Created ' + file);
};

writeFile('src/types/index.ts', typesIndex);
writeFile('src/mock/data.ts', mockData);
writeFile('src/context/AppContext.tsx', appContext);

// Update AuthContext.tsx
let authContext = fs.readFileSync(path.join(__dirname, 'src/context/AuthContext.tsx'), 'utf8');
authContext = authContext.replace(/import type \{ User \} from '\.\.\/types';/g, "import type { Usuario } from '../types';");
authContext = authContext.replace(/import \{ MOCK_USERS \} from '\.\.\/mock\/data';/g, "import { MOCK_USUARIOS } from '../mock/data';");
authContext = authContext.replace(/user: User \| null;/g, "usuario: Usuario | null;");
authContext = authContext.replace(/const \[user, setUser\] = useState<User \| null>\(MOCK_USERS\[0\]\);/g, "const [usuario, setUsuario] = useState<Usuario | null>(MOCK_USUARIOS[0]);");
authContext = authContext.replace(/const found = MOCK_USERS\.find\(u => u\.id === userId\);/g, "const found = MOCK_USUARIOS.find(u => u.id === userId);");
authContext = authContext.replace(/if \(found\) setUser\(found\);/g, "if (found) setUsuario(found);");
authContext = authContext.replace(/const logout = \(\) => setUser\(null\);/g, "const logout = () => setUsuario(null);");
authContext = authContext.replace(/value=\{\{ user, login, logout \}\}/g, "value={{ usuario, login, logout }}");
writeFile('src/context/AuthContext.tsx', authContext);

// Update Header.tsx
let header = fs.readFileSync(path.join(__dirname, 'src/components/layout/Header.tsx'), 'utf8');
header = header.replace(/const \{ user, login, logout \} = useAuth\(\);/g, "const { usuario, login, logout } = useAuth();");
header = header.replace(/MOCK_USERS/g, "MOCK_USUARIOS");
header = header.replace(/\{user && \(/g, "{usuario && (");
header = header.replace(/value=\{user\.id\}/g, "value={usuario.id}");
header = header.replace(/\{u\.name\}/g, "{u.nome}");
writeFile('src/components/layout/Header.tsx', header);

// Update Sidebar.tsx
let sidebar = fs.readFileSync(path.join(__dirname, 'src/components/layout/Sidebar.tsx'), 'utf8');
sidebar = sidebar.replace(/const \{ user \} = useAuth\(\);/g, "const { usuario } = useAuth();");
sidebar = sidebar.replace(/if \(!user\) return null;/g, "if (!usuario) return null;");
sidebar = sidebar.replace(/user\.role === 'SOLICITANTE'/g, "usuario.perfil === 'solicitante'");
writeFile('src/components/layout/Sidebar.tsx', sidebar);

// Update Login.tsx
let login = fs.readFileSync(path.join(__dirname, 'src/pages/auth/Login.tsx'), 'utf8');
login = login.replace(/const \{ user, login \} = useAuth\(\);/g, "const { usuario, login } = useAuth();");
login = login.replace(/if \(user\) \{/g, "if (usuario) {");
login = login.replace(/user\.role === 'SOLICITANTE'/g, "usuario.perfil === 'solicitante'");
writeFile('src/pages/auth/Login.tsx', login);

// Update AppRoutes.tsx
let routes = fs.readFileSync(path.join(__dirname, 'src/routes/AppRoutes.tsx'), 'utf8');
routes = routes.replace(/const \{ user \} = useAuth\(\);/g, "const { usuario } = useAuth();");
routes = routes.replace(/if \(!user\) return/g, "if (!usuario) return");
routes = routes.replace(/!allowedRoles\.includes\(user\.role\)/g, "!allowedRoles.includes(usuario.perfil)");
routes = routes.replace(/user\.role === 'SOLICITANTE'/g, "usuario.perfil === 'solicitante'");
routes = routes.replace(/allowedRoles=\{\['SOLICITANTE'\]\}/g, "allowedRoles={['solicitante']}");
routes = routes.replace(/allowedRoles=\{\['LOGISTICA'\]\}/g, "allowedRoles={['logistica']}");
writeFile('src/routes/AppRoutes.tsx', routes);

// Update App.tsx
let app = fs.readFileSync(path.join(__dirname, 'src/App.tsx'), 'utf8');
if (!app.includes('AppProvider')) {
  app = app.replace(/import \{ AuthProvider \}/, "import { AuthProvider } from './context/AuthContext';\nimport { AppProvider }");
  app = app.replace(/<AuthProvider>/, "<AuthProvider>\n        <AppProvider>");
  app = app.replace(/<\/AuthProvider>/, "        </AppProvider>\n      </AuthProvider>");
  app = app.replace(/import \{ AppProvider \}/, "import { AppProvider } from './context/AppContext';\nimport { AuthProvider }");
  app = app.replace(/import \{ AuthProvider \} from '\.\/context\/AuthContext';\nimport \{ AppProvider \} from '\.\/context\/AppContext';\nimport \{ AuthProvider \}/, "import { AuthProvider } from './context/AuthContext';\nimport { AppProvider } from './context/AppContext';");
}
writeFile('src/App.tsx', app);

console.log("Done scaffolding step 2");
