import { useEffect, useState, useCallback } from 'react';
import {
  APIProvider,
  Map as GoogleMap,
  AdvancedMarker,
  InfoWindow,
  useMap
} from '@vis.gl/react-google-maps';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer
} from 'recharts';
import {
  MapPin,
  Truck,
  Navigation2,
  Search,
  AlertCircle,
  AlertTriangle,
  Gauge,
  User,
  Layers,
  Map as MapIcon,
  WifiOff,
  RefreshCw,
  BatteryFull,
  Droplets,
  Thermometer,
  Fuel,
  Clock,
  Tag,
  Wrench,
  History,
  Pause,
  Play
} from 'lucide-react';
import { SlideOverDrawer } from '../../components/common/SlideOverDrawer';

const GOOGLE_MAPS_API_KEY = 'AIzaSyAeQIKfNplzSj3wnUdIVBSnhzDb0OuFPwM';
// Sem VITE_API_URL, usa caminho relativo (mesma origem) — funciona tanto no Vercel
// (api/frota/*.ts como serverless functions) quanto local via `vercel dev`.
const API_URL = import.meta.env.VITE_API_URL ?? '';
const POLL_INTERVAL_MS = 15000;

// Centro aproximado da Fazenda Progresso em Mucugê / Chapada Diamantina - BA
const FAZENDA_CENTER = { lat: -13.0047, lng: -41.3708 };

// vw_UltimaPosicao (SELECT * FROM vw_UltimaPosicao ORDER BY 2, como o cliente indicou), enriquecida
// com o tipo do equipamento (Equipamentos/TiposEquipamento) e a leitura mais recente de sensores
// e de operação (LeiturasSensor/LeiturasOperacao) — ver api/frota/posicoes.ts
interface PosicaoEquipamento {
  EquipamentoId: number;
  CodigoEquipamento: string;
  Nome: string;
  GrupoFrente: string | null;
  Fazenda: string | null;
  Latitude: number | null;
  Longitude: number | null;
  VelocidadeKmh: number | null;
  DirecaoGraus: number | null;
  Estado: string | null;
  OperacaoDescricao: string | null;
  Operador: string | null;
  CodigoTalhao: string | null;
  DataHoraOperacao: string | null;
  ColetadoEm: string | null;
  MinutosSemComunicacao: number | null;
  TipoEquipamento: string | null;
  // Última leitura de LeiturasSensor
  PorcentagemCargaBateria: number | null;
  TensaoBateria: number | null;
  TemperaturaBateria: number | null;
  UmidadeSolo: number | null;
  UmidadeSolo2: number | null;
  UmidadeSolo3: number | null;
  TemperaturaAmbiente: number | null;
  EnergiaGeradaDia: number | null;
  EnergiaConsumidaDia: number | null;
  SensorColetadoEmUtc: string | null;
  // Última leitura de LeiturasOperacao
  ConsumoMedioLitros: number | null;
  VelocidadeMediaOperacao: number | null;
  RpmMedio: number | null;
  TempoMotorLigadoSegundos: number | null;
  TempoMotorOciosoSegundos: number | null;
  AreaOperacional: number | null;
  OperacaoColetadoEmUtc: string | null;
  // Estimados a partir do histórico de GPS das últimas 24h (LeiturasLocalizacao),
  // usados quando LeiturasOperacao ainda não tem o valor oficial calculado pelo cliente
  VelocidadeMediaCalculadaKmh: number | null;
  TempoParadoSegundosCalculado: number | null;
  QtdLeiturasJanela: number | null;
  // Última leitura de LeiturasLocalizacao + Implementos
  HorimetroOdometro: number | null;
  ImplementoAcoplado: string | null;
  // A API usa p.* — a view do cliente pode trazer outras colunas além das listadas acima
  [campo: string]: unknown;
}

// Colunas decimal/numeric do SQL Server chegam como STRING pelo driver mssql (evita perda de
// precisão), não como number — mesmo com o tipo declarado como number|null nas interfaces
// abaixo. Todo lugar que faz conta ou .toFixed() precisa passar por aqui primeiro.
const toNumero = (valor: unknown): number | null => {
  if (valor === null || valor === undefined || valor === '') return null;
  const num = typeof valor === 'number' ? valor : Number(valor);
  return Number.isFinite(num) ? num : null;
};

const formatNumero = (valor: unknown, casas = 1) => {
  const num = toNumero(valor);
  return num === null ? '—' : num.toFixed(casas);
};

const mediaUmidadeSolo = (p: PosicaoEquipamento) => {
  const valores = [toNumero(p.UmidadeSolo), toNumero(p.UmidadeSolo2), toNumero(p.UmidadeSolo3)].filter((v): v is number => v !== null);
  if (valores.length === 0) return null;
  return valores.reduce((soma, v) => soma + v, 0) / valores.length;
};

const formatHoras = (segundos: unknown) => {
  const num = toNumero(segundos);
  if (num === null) return '—';
  return `${(num / 3600).toFixed(1)}h`;
};

// % do tempo com motor ligado que o equipamento passou parado (ocioso)
const percentualTempoParado = (p: PosicaoEquipamento) => {
  const ocioso = toNumero(p.TempoMotorOciosoSegundos);
  const ligado = toNumero(p.TempoMotorLigadoSegundos);
  if (ocioso === null || !ligado) return null;
  return (ocioso / ligado) * 100;
};

// Prefere o valor oficial de LeiturasOperacao; cai pro estimado via GPS (últimas 24h) quando não existir.
// O booleano diz se o valor veio estimado, pra UI poder sinalizar isso.
const velocidadeMedia = (p: PosicaoEquipamento): [number | null, boolean] => {
  const oficial = toNumero(p.VelocidadeMediaOperacao);
  return oficial !== null ? [oficial, false] : [toNumero(p.VelocidadeMediaCalculadaKmh), true];
};

const tempoParadoSegundos = (p: PosicaoEquipamento): [number | null, boolean] => {
  const oficial = toNumero(p.TempoMotorOciosoSegundos);
  return oficial !== null ? [oficial, false] : [toNumero(p.TempoParadoSegundosCalculado), true];
};

// Nomes de campo do banco (ex: "PorcentagemCargaBateria") viram rótulo legível ("Porcentagem Carga Bateria")
const formatRotuloCampo = (chave: string) => chave.replace(/([a-z0-9])([A-Z])/g, '$1 $2');

const formatValorCampo = (valor: unknown): string => {
  if (valor === null || valor === undefined || valor === '') return '—';
  if (typeof valor === 'boolean') return valor ? 'Sim' : 'Não';
  if (typeof valor === 'number') return Number.isInteger(valor) ? String(valor) : valor.toFixed(4).replace(/0+$/, '').replace(/\.$/, '');
  if (typeof valor === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(valor)) {
    const data = new Date(valor);
    return Number.isNaN(data.getTime()) ? valor : data.toLocaleString('pt-BR');
  }
  return String(valor);
};

type StatusComunicacao = 'online' | 'atencao' | 'offline' | 'sem_dados';

const getStatusComunicacao = (minutos: number | null): StatusComunicacao => {
  if (minutos === null || minutos === undefined) return 'sem_dados';
  if (minutos <= 30) return 'online';
  if (minutos <= 1440) return 'atencao';
  return 'offline';
};

const formatDataHora = (iso: string | null) => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('pt-BR');
  } catch {
    return iso;
  }
};

// Componente para controlar a câmera do Google Maps suavemente ao focar num equipamento
const MapController = ({ targetPosition }: { targetPosition: { lat: number; lng: number } | null }) => {
  const map = useMap();

  if (map && targetPosition) {
    map.panTo(targetPosition);
  }

  return null;
};

// Histórico de posições de um equipamento (LeiturasLocalizacao) — ver api/frota/trajeto.ts
interface TrajetoPonto {
  Latitude: number;
  Longitude: number;
  VelocidadeKmh: number | null;
  ColetadoEmUtc: string;
}

// @vis.gl/react-google-maps não tem um componente <Polyline> pronto — desenha o rastro
// imperativamente com a API do Google Maps via useMap()
const RastroPolyline = ({ pontos }: { pontos: TrajetoPonto[] }) => {
  const map = useMap();

  useEffect(() => {
    if (!map || pontos.length < 2) return;

    const polyline = new google.maps.Polyline({
      path: pontos.map((p) => ({ lat: toNumero(p.Latitude) ?? 0, lng: toNumero(p.Longitude) ?? 0 })),
      geodesic: true,
      strokeColor: '#059669',
      strokeOpacity: 0.85,
      strokeWeight: 3,
    });
    polyline.setMap(map);

    return () => {
      polyline.setMap(null);
    };
  }, [map, pontos]);

  return null;
};

export const MapaMonitoramento = () => {
  const [posicoes, setPosicoes] = useState<PosicaoEquipamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState<Date | null>(null);
  const [selectedEquipamento, setSelectedEquipamento] = useState<PosicaoEquipamento | null>(null);
  const [busca, setBusca] = useState('');
  const [statusFiltro, setStatusFiltro] = useState<'todos' | StatusComunicacao>('todos');
  const [mapTypeId, setMapTypeId] = useState<'hybrid' | 'roadmap' | 'terrain'>('hybrid');
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [trajeto, setTrajeto] = useState<TrajetoPonto[]>([]);
  const [trajetoLoading, setTrajetoLoading] = useState(false);
  const [historicoAberto, setHistoricoAberto] = useState(false);
  const [autoAtualizar, setAutoAtualizar] = useState(true);

  const carregarPosicoes = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/frota/posicoes`);
      if (!response.ok) {
        throw new Error(`API respondeu ${response.status}`);
      }
      const data: PosicaoEquipamento[] = await response.json();
      setPosicoes(data);
      setErro(null);
      setUltimaAtualizacao(new Date());
      // Usa a forma funcional (lê o estado mais recente, não uma cópia presa no fechamento
      // desta função) pra: 1) selecionar o primeiro item só na carga inicial, e 2) atualizar
      // os dados do equipamento já selecionado sem trocar QUAL equipamento está selecionado —
      // sem isso, a cada poll de 15s a seleção "esquecia" o que o usuário tinha clicado e
      // voltava pro primeiro da lista, parecendo pular de veículo em veículo sozinho.
      setSelectedEquipamento((atual) => {
        if (!atual) return data[0] ?? null;
        const atualizado = data.find((p) => p.EquipamentoId === atual.EquipamentoId);
        return atualizado ?? atual;
      });
    } catch (error) {
      console.error('Erro ao buscar vw_UltimaPosicao:', error);
      setErro('Não foi possível conectar ao banco de dados da fazenda (SQL Server). Verifique as variáveis MSSQL_* no Vercel (ou, em desenvolvimento local, rode com `vercel dev`) e confira os logs da function em /api/frota/posicoes.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!autoAtualizar) return;
    carregarPosicoes();
    const interval = setInterval(carregarPosicoes, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [carregarPosicoes, autoAtualizar]);

  useEffect(() => {
    const equipamentoId = selectedEquipamento?.EquipamentoId;
    if (equipamentoId === undefined) {
      setTrajeto([]);
      return;
    }
    let cancelado = false;
    setTrajetoLoading(true);
    fetch(`${API_URL}/api/frota/trajeto?equipamentoId=${equipamentoId}&horas=24`)
      .then((response) => {
        if (!response.ok) throw new Error(`API respondeu ${response.status}`);
        return response.json();
      })
      .then((data: TrajetoPonto[]) => {
        if (!cancelado) setTrajeto(data);
      })
      .catch((error) => {
        console.error('Erro ao buscar trajeto:', error);
        if (!cancelado) setTrajeto([]);
      })
      .finally(() => {
        if (!cancelado) setTrajetoLoading(false);
      });
    return () => {
      cancelado = true;
    };
  }, [selectedEquipamento?.EquipamentoId]);

  const handleSelectEquipamento = (equipamento: PosicaoEquipamento) => {
    setSelectedEquipamento(equipamento);
    const lat = toNumero(equipamento.Latitude);
    const lng = toNumero(equipamento.Longitude);
    if (lat !== null && lng !== null) {
      setMapCenter({ lat, lng });
    }
  };

  const posicoesComCoordenadas = posicoes.filter(
    (p) => p.Latitude !== null && p.Longitude !== null
  );

  const posicoesFiltradas = posicoesComCoordenadas.filter((p) => {
    const status = getStatusComunicacao(p.MinutosSemComunicacao);
    const matchesStatus = statusFiltro === 'todos' || status === statusFiltro;

    const termo = busca.toLowerCase();
    const matchesBusca =
      p.Nome.toLowerCase().includes(termo) ||
      p.CodigoEquipamento.toLowerCase().includes(termo) ||
      (p.Operador ?? '').toLowerCase().includes(termo) ||
      (p.GrupoFrente ?? '').toLowerCase().includes(termo);

    return matchesStatus && matchesBusca;
  });

  const pinClasses = (status: StatusComunicacao) => {
    switch (status) {
      case 'online':
        return 'bg-white border-emerald-600 text-emerald-700 shadow-lg';
      case 'atencao':
        return 'bg-white border-amber-500 text-amber-700 shadow-lg';
      case 'offline':
        return 'bg-white border-rose-600 text-rose-700 shadow-lg opacity-80';
      default:
        return 'bg-white border-slate-400 text-slate-600 shadow-lg opacity-60';
    }
  };

  const statusBadge = (status: StatusComunicacao) => {
    switch (status) {
      case 'online':
        return <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold border border-emerald-200 flex items-center"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse"></span> Online</span>;
      case 'atencao':
        return <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold border border-amber-200 flex items-center"><AlertCircle size={10} className="mr-1" /> Sem sinal recente</span>;
      case 'offline':
        return <span className="text-[10px] bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full font-bold border border-rose-200 flex items-center"><WifiOff size={10} className="mr-1" /> Offline</span>;
      default:
        return <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold border border-slate-200">Sem dados</span>;
    }
  };

  return (
    <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
      <div className="absolute inset-0 z-0 bg-slate-100 overflow-hidden flex select-none text-slate-800">

        {/* GOOGLE MAPS COMPONENT */}
        <div className="w-full h-full relative">
          <GoogleMap
            defaultCenter={FAZENDA_CENTER}
            defaultZoom={13}
            mapTypeId={mapTypeId}
            mapId="FAZENDA_PROGRESSO_TELEMETRIA_MAP"
            gestureHandling="greedy"
            disableDefaultUI={true}
            className="w-full h-full"
          >
            <MapController targetPosition={mapCenter} />
            <RastroPolyline pontos={trajeto} />

            {posicoesFiltradas.map((p) => {
              const status = getStatusComunicacao(p.MinutosSemComunicacao);
              const isSelected = selectedEquipamento?.EquipamentoId === p.EquipamentoId;
              const position = { lat: toNumero(p.Latitude) ?? 0, lng: toNumero(p.Longitude) ?? 0 };

              return (
                <AdvancedMarker
                  key={p.EquipamentoId}
                  position={position}
                  onClick={() => handleSelectEquipamento(p)}
                  zIndex={isSelected ? 100 : 10}
                >
                  <div className={`relative cursor-pointer transition-all duration-300 group ${isSelected ? 'scale-125' : 'hover:scale-110'}`}>
                    <div className={`absolute inset-0 rounded-full animate-ping opacity-40 ${status === 'offline' ? 'bg-rose-500' : 'bg-emerald-500'}`}></div>

                    <div className={`relative w-11 h-11 rounded-2xl flex items-center justify-center border-2 shadow-xl transition-all ${pinClasses(status)} ${isSelected ? 'ring-8 ring-emerald-500/30 border-emerald-600 bg-emerald-50 scale-110' : 'hover:border-emerald-600'}`}>
                      <Truck size={16} />
                      {toNumero(p.VelocidadeKmh) !== null && (
                        <span className="absolute -top-2 -right-2 text-[9px] font-black px-1.5 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-white shadow-md">
                          {Math.round(toNumero(p.VelocidadeKmh)!)}km/h
                        </span>
                      )}
                    </div>

                    <div className="absolute top-14 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[11px] font-bold px-3 py-1.5 rounded-xl shadow-xl whitespace-nowrap border border-slate-700 pointer-events-none z-50">
                      <p className="font-mono text-emerald-400">{p.CodigoEquipamento}</p>
                      <p className="text-slate-300 text-[10px]">{p.Nome}</p>
                    </div>
                  </div>
                </AdvancedMarker>
              );
            })}

            {selectedEquipamento && selectedEquipamento.Latitude !== null && selectedEquipamento.Longitude !== null && (
              <InfoWindow
                position={{ lat: toNumero(selectedEquipamento.Latitude) ?? 0, lng: toNumero(selectedEquipamento.Longitude) ?? 0 }}
                onCloseClick={() => setSelectedEquipamento(null)}
                headerContent={
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-bold text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                      {selectedEquipamento.CodigoEquipamento}
                    </span>
                  </div>
                }
              >
                <div className="w-72 p-1 text-slate-800 text-xs max-h-96 overflow-y-auto">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-sm font-black text-slate-900 leading-tight">{selectedEquipamento.Nome}</h4>
                    <button
                      onClick={() => setHistoricoAberto(true)}
                      className="shrink-0 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-lg hover:bg-emerald-100 transition-colors flex items-center"
                    >
                      <History size={11} className="mr-1" /> Histórico
                    </button>
                  </div>
                  {selectedEquipamento.TipoEquipamento && (
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide mb-2 flex items-center">
                      <Tag size={10} className="mr-1" /> {selectedEquipamento.TipoEquipamento}
                    </p>
                  )}
                  {!selectedEquipamento.TipoEquipamento && <div className="mb-2" />}

                  <div className="space-y-2 text-xs">
                    {selectedEquipamento.Operador && (
                      <div className="flex justify-between items-center bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                        <span className="text-slate-500 flex items-center"><User size={12} className="mr-1 text-slate-400" /> Operador:</span>
                        <span className="font-bold text-slate-900">{selectedEquipamento.Operador}</span>
                      </div>
                    )}

                    {(selectedEquipamento.OperacaoDescricao || selectedEquipamento.CodigoTalhao) && (
                      <div className="flex justify-between items-center bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                        <span className="text-slate-500 flex items-center"><MapPin size={12} className="mr-1 text-emerald-600" /> Operação:</span>
                        <span className="font-bold text-slate-800 truncate max-w-[140px]">
                          {selectedEquipamento.OperacaoDescricao ?? '—'}{selectedEquipamento.CodigoTalhao ? ` · Talhão ${selectedEquipamento.CodigoTalhao}` : ''}
                        </span>
                      </div>
                    )}

                    {selectedEquipamento.ImplementoAcoplado && (
                      <div className="flex justify-between items-center bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                        <span className="text-slate-500 flex items-center"><Wrench size={12} className="mr-1 text-slate-400" /> Implemento:</span>
                        <span className="font-bold text-slate-800 truncate max-w-[140px]">{selectedEquipamento.ImplementoAcoplado}</span>
                      </div>
                    )}

                    {selectedEquipamento.HorimetroOdometro !== null && (
                      <div className="flex justify-between items-center bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                        <span className="text-slate-500 flex items-center"><Gauge size={12} className="mr-1 text-slate-400" /> Horímetro/Odômetro:</span>
                        <span className="font-mono font-bold text-slate-800">{formatNumero(selectedEquipamento.HorimetroOdometro, 1)}</span>
                      </div>
                    )}

                    {(() => {
                      const statusComm = getStatusComunicacao(selectedEquipamento.MinutosSemComunicacao);
                      const desatualizado = statusComm !== 'online';
                      return (
                        <>
                          {desatualizado && (
                            <div className="flex items-start gap-1.5 bg-amber-50 border border-amber-200 rounded-lg p-1.5 text-[10px] text-amber-800">
                              <AlertTriangle size={12} className="shrink-0 mt-0.5" />
                              <span>
                                Sem comunicação há {selectedEquipamento.MinutosSemComunicacao !== null ? `${formatNumero(selectedEquipamento.MinutosSemComunicacao / 60, 1)}h` : 'muito tempo'} — velocidade e estado abaixo são a <strong>última leitura conhecida</strong>, não a situação atual.
                              </span>
                            </div>
                          )}
                          <div className="grid grid-cols-2 gap-1.5 pt-1">
                            <div className={`p-1.5 rounded-lg flex items-center justify-between border ${desatualizado ? 'bg-amber-50/50 border-amber-200' : 'bg-slate-50 border-slate-200'}`}>
                              <span className="text-slate-500 flex items-center text-[10px]"><Gauge size={12} className="mr-1 text-blue-600" /> Vel:</span>
                              <span className={`font-mono font-bold text-xs ${desatualizado ? 'text-amber-700' : 'text-slate-900'}`}>{formatNumero(selectedEquipamento.VelocidadeKmh, 1)} km/h</span>
                            </div>
                            <div className={`p-1.5 rounded-lg flex items-center justify-between border ${desatualizado ? 'bg-amber-50/50 border-amber-200' : 'bg-slate-50 border-slate-200'}`}>
                              <span className="text-slate-500 flex items-center text-[10px]">Estado:</span>
                              <span className={`font-bold text-xs truncate max-w-[70px] ${desatualizado ? 'text-amber-700' : 'text-slate-900'}`}>{selectedEquipamento.Estado ?? '—'}</span>
                            </div>
                          </div>
                        </>
                      );
                    })()}

                    {(selectedEquipamento.PorcentagemCargaBateria !== null || mediaUmidadeSolo(selectedEquipamento) !== null || selectedEquipamento.TemperaturaAmbiente !== null) && (
                      <div className="pt-1 border-t border-slate-100">
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Sensores</p>
                        <div className="grid grid-cols-2 gap-1.5">
                          {selectedEquipamento.PorcentagemCargaBateria !== null && (
                            <div className="bg-slate-50 p-1.5 rounded-lg flex items-center justify-between border border-slate-200">
                              <span className="text-slate-500 flex items-center text-[10px]"><BatteryFull size={12} className="mr-1 text-emerald-600" /> Bateria:</span>
                              <span className="font-mono font-bold text-slate-900 text-xs">{formatNumero(selectedEquipamento.PorcentagemCargaBateria, 0)}%</span>
                            </div>
                          )}
                          {mediaUmidadeSolo(selectedEquipamento) !== null && (
                            <div className="bg-slate-50 p-1.5 rounded-lg flex items-center justify-between border border-slate-200">
                              <span className="text-slate-500 flex items-center text-[10px]"><Droplets size={12} className="mr-1 text-blue-600" /> Solo:</span>
                              <span className="font-mono font-bold text-slate-900 text-xs">{formatNumero(mediaUmidadeSolo(selectedEquipamento), 0)}%</span>
                            </div>
                          )}
                          {selectedEquipamento.TemperaturaAmbiente !== null && (
                            <div className="bg-slate-50 p-1.5 rounded-lg flex items-center justify-between border border-slate-200">
                              <span className="text-slate-500 flex items-center text-[10px]"><Thermometer size={12} className="mr-1 text-amber-600" /> Temp:</span>
                              <span className="font-mono font-bold text-slate-900 text-xs">{formatNumero(selectedEquipamento.TemperaturaAmbiente, 0)}°C</span>
                            </div>
                          )}
                          {selectedEquipamento.TensaoBateria !== null && (
                            <div className="bg-slate-50 p-1.5 rounded-lg flex items-center justify-between border border-slate-200">
                              <span className="text-slate-500 flex items-center text-[10px]">Tensão:</span>
                              <span className="font-mono font-bold text-slate-900 text-xs">{formatNumero(selectedEquipamento.TensaoBateria, 1)}V</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {(() => {
                      const [velMedia, velEstimada] = velocidadeMedia(selectedEquipamento);
                      const [parado, paradoEstimado] = tempoParadoSegundos(selectedEquipamento);
                      const temAlgumDado = selectedEquipamento.ConsumoMedioLitros !== null || selectedEquipamento.RpmMedio !== null ||
                        selectedEquipamento.AreaOperacional !== null || velMedia !== null || parado !== null;
                      if (!temAlgumDado) return null;
                      return (
                      <div className="pt-1 border-t border-slate-100">
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Operação</p>
                        <div className="grid grid-cols-2 gap-1.5">
                          {velMedia !== null && (
                            <div className="bg-slate-50 p-1.5 rounded-lg flex items-center justify-between border border-slate-200">
                              <span className="text-slate-500 flex items-center text-[10px]"><Gauge size={12} className="mr-1 text-blue-600" /> Vel. média{velEstimada ? '*' : ''}:</span>
                              <span className="font-mono font-bold text-slate-900 text-xs">{formatNumero(velMedia, 1)} km/h</span>
                            </div>
                          )}
                          {selectedEquipamento.RpmMedio !== null && (
                            <div className="bg-slate-50 p-1.5 rounded-lg flex items-center justify-between border border-slate-200">
                              <span className="text-slate-500 flex items-center text-[10px]">RPM médio:</span>
                              <span className="font-mono font-bold text-slate-900 text-xs">{formatNumero(selectedEquipamento.RpmMedio, 0)}</span>
                            </div>
                          )}
                          {parado !== null && (
                            <div className="bg-slate-50 p-1.5 rounded-lg flex items-center justify-between border border-slate-200">
                              <span className="text-slate-500 flex items-center text-[10px]"><Clock size={12} className="mr-1 text-amber-600" /> Parado{paradoEstimado ? '*' : ''}:</span>
                              <span className="font-mono font-bold text-slate-900 text-xs">
                                {formatHoras(parado)}
                                {!paradoEstimado && percentualTempoParado(selectedEquipamento) !== null && ` (${formatNumero(percentualTempoParado(selectedEquipamento), 0)}%)`}
                              </span>
                            </div>
                          )}
                          {selectedEquipamento.ConsumoMedioLitros !== null && (
                            <div className="bg-slate-50 p-1.5 rounded-lg flex items-center justify-between border border-slate-200">
                              <span className="text-slate-500 flex items-center text-[10px]"><Fuel size={12} className="mr-1 text-rose-600" /> Combust.:</span>
                              <span className="font-mono font-bold text-slate-900 text-xs">{formatNumero(selectedEquipamento.ConsumoMedioLitros, 1)}L</span>
                            </div>
                          )}
                          {selectedEquipamento.TempoMotorLigadoSegundos !== null && (
                            <div className="bg-slate-50 p-1.5 rounded-lg flex items-center justify-between border border-slate-200">
                              <span className="text-slate-500 flex items-center text-[10px]">Motor ligado:</span>
                              <span className="font-mono font-bold text-slate-900 text-xs">{formatHoras(selectedEquipamento.TempoMotorLigadoSegundos)}</span>
                            </div>
                          )}
                          {selectedEquipamento.AreaOperacional !== null && (
                            <div className="bg-slate-50 p-1.5 rounded-lg flex items-center justify-between border border-slate-200">
                              <span className="text-slate-500 flex items-center text-[10px]">Área:</span>
                              <span className="font-mono font-bold text-slate-900 text-xs">{formatNumero(selectedEquipamento.AreaOperacional, 1)}ha</span>
                            </div>
                          )}
                        </div>
                        {(velEstimada || paradoEstimado) && (
                          <p className="text-[9px] text-slate-400 mt-1.5">* estimado a partir do histórico de GPS (últimas 24h) — LeiturasOperacao ainda não tem esse valor oficial</p>
                        )}
                      </div>
                      );
                    })()}

                    <div className="pt-1 flex items-center justify-between">
                      {statusBadge(getStatusComunicacao(selectedEquipamento.MinutosSemComunicacao))}
                      <span className="text-slate-400 text-[10px]">{formatDataHora(selectedEquipamento.DataHoraOperacao)}</span>
                    </div>

                    <div className="pt-2 border-t border-slate-100">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Todos os dados do equipamento</p>
                      <div className="space-y-1">
                        {Object.entries(selectedEquipamento).map(([chave, valor]) => (
                          <div key={chave} className="flex justify-between items-start gap-2 text-[10.5px] py-0.5 border-b border-slate-50">
                            <span className="text-slate-400 shrink-0">{formatRotuloCampo(chave)}</span>
                            <span className="font-mono font-medium text-slate-700 text-right break-all">{formatValorCampo(valor)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </InfoWindow>
            )}
          </GoogleMap>
        </div>

        {/* PAINEL CLARO FLUTUANTE DE CONTROLES DO GOOGLE MAPS (SUPERIOR ESQUERDO) */}
        <div className="absolute top-8 left-6 z-30 flex flex-col space-y-3 pointer-events-auto max-w-[calc(100vw-27rem)]">
          <div className="bg-white/90 backdrop-blur-md p-2 rounded-2xl shadow-xl border border-slate-200/80 flex flex-wrap items-center gap-2">
            <div className="flex items-center space-x-1 px-2 py-1 bg-emerald-50 text-emerald-800 rounded-xl font-bold text-xs border border-emerald-200">
              <MapIcon size={14} className="mr-1 text-emerald-600" />
              <span>Google Maps Ativo</span>
            </div>

            <div className="h-6 w-px bg-slate-200 mx-1 hidden sm:block"></div>

            <div className="flex flex-wrap items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                onClick={() => setMapTypeId('hybrid')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all flex items-center ${mapTypeId === 'hybrid' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
              >
                <Layers size={13} className="mr-1.5" /> Satélite / Híbrido
              </button>
              <button
                onClick={() => setMapTypeId('terrain')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${mapTypeId === 'terrain' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
              >
                Relevo / Topografia
              </button>
              <button
                onClick={() => setMapTypeId('roadmap')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${mapTypeId === 'roadmap' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
              >
                Vetor / Vias
              </button>
            </div>
          </div>

          <div className={`flex items-center px-4 py-2 backdrop-blur-md rounded-xl font-bold text-xs border shadow-lg w-fit ${erro ? 'bg-rose-50/95 text-rose-700 border-rose-200' : 'bg-white/90 text-emerald-700 border-slate-200/80'}`}>
            {erro ? <WifiOff size={14} className="mr-2 text-rose-600" /> : <Navigation2 size={14} className="mr-2 animate-pulse text-emerald-600" />}
            {erro
              ? 'Sem conexão com o banco de dados'
              : `Fazenda Progresso — ${posicoesComCoordenadas.length} equipamento(s) com posição`}
            {ultimaAtualizacao && !erro && (
              <span className="ml-2 text-slate-400 font-medium">
                atualizado {ultimaAtualizacao.toLocaleTimeString('pt-BR')}
              </span>
            )}
            <button onClick={carregarPosicoes} className="ml-2 text-slate-400 hover:text-emerald-600" title="Atualizar agora">
              <RefreshCw size={13} />
            </button>
            <button
              onClick={() => setAutoAtualizar((atual) => !atual)}
              className={`ml-2 flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[11px] font-bold transition-colors ${
                autoAtualizar
                  ? 'text-emerald-700 border-emerald-200 bg-emerald-50 hover:bg-emerald-100'
                  : 'text-amber-700 border-amber-200 bg-amber-50 hover:bg-amber-100'
              }`}
              title={autoAtualizar ? 'Pausar atualizações automáticas' : 'Iniciar atualizações automáticas'}
            >
              {autoAtualizar ? <Pause size={12} /> : <Play size={12} />}
              {autoAtualizar ? 'Pausar' : 'Iniciar'}
            </button>
          </div>

          {erro && (
            <div className="max-w-sm bg-rose-50/95 backdrop-blur-md text-rose-700 rounded-xl border border-rose-200 shadow-lg p-3 text-[11px] leading-relaxed">
              {erro}
            </div>
          )}
        </div>

        {/* PAINEL LATERAL DIREITO (FROTA EM MONITORAMENTO) */}
        <div className="absolute right-6 top-8 bottom-6 w-96 bg-white/95 backdrop-blur-2xl rounded-3xl shadow-2xl border border-slate-200/80 flex flex-col z-30 overflow-hidden pointer-events-auto">

          <div className="p-5 pt-6 border-b border-slate-100 bg-white/90">
            <h3 className="text-lg font-black text-slate-800 tracking-tight flex items-center">
              <Truck className="mr-2.5 text-emerald-600" size={20} /> Frota em Monitoramento
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-1">Última posição de cada equipamento (vw_UltimaPosicao)</p>
          </div>

          <div className="p-4 border-b border-slate-100 space-y-3">
            <div className="relative">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar equipamento, código ou operador..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium"
              />
            </div>

            <div className="flex overflow-x-auto space-x-1.5 pb-1 scrollbar-none">
              {(['todos', 'online', 'atencao', 'offline'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFiltro(status)}
                  className={`px-3 py-1 text-[11px] font-bold rounded-lg capitalize whitespace-nowrap transition-colors ${
                    statusFiltro === status
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800 bg-slate-100'
                  }`}
                >
                  {status === 'atencao' ? 'sem sinal recente' : status}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {loading && (
              <p className="text-xs text-slate-400 text-center py-8">Carregando posições...</p>
            )}

            {!loading && posicoesFiltradas.length === 0 && !erro && (
              <p className="text-xs text-slate-400 text-center py-8">Nenhum equipamento encontrado.</p>
            )}

            <div className="space-y-2">
              {posicoesFiltradas.length > 0 && (
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">
                  Equipamentos ({posicoesFiltradas.length})
                </h4>
              )}

              <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-1.5 scrollbar-thin scrollbar-thumb-slate-300">
                {posicoesFiltradas.map((p) => {
                  const status = getStatusComunicacao(p.MinutosSemComunicacao);
                  const isSelected = selectedEquipamento?.EquipamentoId === p.EquipamentoId;

                  return (
                    <div
                      key={p.EquipamentoId}
                      onClick={() => handleSelectEquipamento(p)}
                      className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-50/70 shadow-md ring-1 ring-emerald-500/20'
                          : 'border-slate-200/80 bg-white hover:bg-slate-50 hover:border-slate-300 shadow-sm'
                      }`}
                    >
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="font-mono font-bold text-emerald-700 text-xs">{p.CodigoEquipamento}</span>
                        {statusBadge(status)}
                      </div>

                      <p className="text-xs font-bold text-slate-800 truncate">{p.Nome}</p>
                      {p.TipoEquipamento && (
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">{p.TipoEquipamento}</p>
                      )}
                      <p className="text-[11px] text-slate-500 font-medium mt-0.5 truncate">
                        {p.Operador ?? 'Sem operador'} {p.GrupoFrente ? `• ${p.GrupoFrente}` : ''}
                      </p>
                      {p.PorcentagemCargaBateria !== null && (
                        <p className="text-[10px] text-slate-500 font-medium mt-0.5 flex items-center">
                          <BatteryFull size={11} className="mr-1 text-emerald-600" /> {formatNumero(p.PorcentagemCargaBateria, 0)}% bateria
                        </p>
                      )}

                      <div className="flex justify-between items-center text-[11px] font-medium border-t border-slate-100 pt-2.5 mt-2.5">
                        <span className="text-slate-500 flex items-center">
                          <MapPin size={11} className="mr-1 text-emerald-600" />
                          {p.CodigoTalhao ? `Talhão ${p.CodigoTalhao}` : p.OperacaoDescricao ?? '—'}
                        </span>
                        <span className={`font-mono font-bold ${status === 'online' ? 'text-emerald-700' : 'text-amber-600'}`} title={status === 'online' ? undefined : 'Última leitura conhecida — pode estar desatualizada'}>
                          {formatNumero(p.VelocidadeKmh, 1)} km/h{status === 'online' ? '' : '*'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      <SlideOverDrawer
        isOpen={historicoAberto}
        onClose={() => setHistoricoAberto(false)}
        title={selectedEquipamento ? `Histórico — ${selectedEquipamento.Nome}` : 'Histórico do Equipamento'}
        width="max-w-2xl"
      >
        {trajetoLoading && <p className="text-sm text-slate-400 text-center py-12">Carregando histórico...</p>}

        {!trajetoLoading && trajeto.length === 0 && (
          <p className="text-sm text-slate-400 text-center py-12">Sem leituras de GPS nas últimas 24h pra esse equipamento.</p>
        )}

        {!trajetoLoading && trajeto.length > 0 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-bold text-slate-700 mb-3">Velocidade ao longo do tempo (últimas 24h)</h3>
              <div style={{ width: '100%', height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={trajeto.map((p) => ({
                      hora: new Date(p.ColetadoEmUtc).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
                      velocidade: toNumero(p.VelocidadeKmh) ?? 0,
                    }))}
                    margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="hora" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} unit=" km/h" />
                    <RechartsTooltip formatter={(value) => [`${value} km/h`, 'Velocidade']} labelFormatter={(label) => `Horário: ${label}`} />
                    <Line type="monotone" dataKey="velocidade" stroke="#059669" strokeWidth={2} dot={false} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-center">
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wide">Leituras</p>
                <p className="text-lg font-black text-slate-800">{trajeto.length}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-center">
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wide">Vel. máxima</p>
                <p className="text-lg font-black text-slate-800">{formatNumero(Math.max(...trajeto.map((p) => toNumero(p.VelocidadeKmh) ?? 0)), 0)} km/h</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-center">
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wide">Vel. média</p>
                <p className="text-lg font-black text-slate-800">{formatNumero(trajeto.reduce((soma, p) => soma + (toNumero(p.VelocidadeKmh) ?? 0), 0) / trajeto.length, 1)} km/h</p>
              </div>
            </div>

            <p className="text-[10px] text-slate-400">
              Baseado em {trajeto.length} leitura(s) de GPS (LeiturasLocalizacao) nas últimas 24h. O mesmo período é desenhado como rastro no mapa.
            </p>
          </div>
        )}
      </SlideOverDrawer>
    </APIProvider>
  );
};
