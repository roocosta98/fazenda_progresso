import React, { useRef, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/offlineDB';
import { 
  ArrowLeft, 
  Play, 
  CheckCircle, 
  Truck, 
  GaugeCircle, 
  PenTool, 
  Lock, 
  Map, 
  Camera, 
  Image as ImageIcon, 
  X, 
  Clock, 
  Navigation,
  UserCheck,
  AlertTriangle,
  ListChecks
} from 'lucide-react';
import { useOfflineSync } from '../hooks/useOfflineSync';

const SignaturePad: React.FC<{ onSignature: (data: string | null) => void }> = ({ onSignature }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    setHasDrawn(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;

    if ('touches' in e && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;

    if ('touches' in e && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    updateSignature();
  };

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
    onSignature(null);
  };

  const updateSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (hasDrawn) {
      onSignature(canvas.toDataURL('image/png'));
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#0f172a'; // slate-900
      }
    }
  }, []);

  return (
    <div className="flex flex-col items-center w-full">
      <div className="w-full bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl overflow-hidden relative touch-none">
        {!hasDrawn && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40">
            <span className="text-slate-400 font-medium text-sm flex items-center">
              <PenTool className="w-4 h-4 mr-2" />
              Assine no quadro abaixo
            </span>
          </div>
        )}
        <canvas
          ref={canvasRef}
          width={400}
          height={200}
          className="w-full h-[200px] cursor-crosshair touch-none bg-white"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
      </div>
      {hasDrawn && (
        <button 
          type="button" 
          onClick={clear}
          className="mt-3 text-xs text-rose-600 font-bold hover:underline"
        >
          Limpar e assinar novamente
        </button>
      )}
    </div>
  );
};

export const ExecucaoViagem: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isOnline } = useOfflineSync();
  const viagem = useLiveQuery(() => db.viagens.get(id || ''));

  const [km, setKm] = useState<string>('');
  const [divergencia, setDivergencia] = useState<string>('');
  const [nomeRecebedor, setNomeRecebedor] = useState<string>('');
  const [signature, setSignature] = useState<string | null>(null);
  const [foto, setFoto] = useState<string | null>(null);
  const [previewFotoOpen, setPreviewFotoOpen] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (viagem) {
      if (viagem.status === 'agendada') {
        const initialKm = viagem.kmRegistrado ?? viagem.kmInicial ?? 125000;
        setKm(initialKm.toString());
        if (viagem.divergenciaKm) setDivergencia(viagem.divergenciaKm);
      } else if (viagem.status === 'em_execucao') {
        if (viagem.kmFinal) {
          setKm(viagem.kmFinal.toString());
        } else {
          // Pre-populate with initial km as default starting value for editing
          const initialKm = viagem.kmInicial ?? viagem.kmRegistrado ?? 125000;
          setKm(initialKm.toString());
        }
        if (viagem.assinaturaRecebedor) setSignature(viagem.assinaturaRecebedor);
        if (viagem.nomeRecebedor) setNomeRecebedor(viagem.nomeRecebedor);
        if (viagem.fotoComprovante) setFoto(viagem.fotoComprovante);
      }
    }
  }, [viagem]);

  if (!viagem) {
    return (
      <div className="flex flex-col h-screen bg-slate-50 items-center justify-center">
        <div className="animate-spin text-emerald-500 mb-4"><Truck size={40} /></div>
        <p className="text-slate-500 font-medium">Carregando viagem...</p>
      </div>
    );
  }

  const isAgendada = viagem.status === 'agendada';
  const isEmExecucao = viagem.status === 'em_execucao';
  const isConcluida = viagem.status === 'concluida';

  const kmInicialRef = viagem.kmInicial ?? viagem.kmRegistrado ?? 125000;
  const parsedKmFinal = parseInt(km, 10);
  
  // Odometer Validation: Km Final >= Km Inicial
  const isKmFinalValid = isAgendada || (!isNaN(parsedKmFinal) && parsedKmFinal >= kmInicialRef);

  if (isConcluida) {
    return (
      <div className="flex flex-col h-screen bg-slate-50 items-center justify-center p-6 text-center">
        <CheckCircle className="text-emerald-500 w-16 h-16 mb-4" />
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Viagem Concluída</h2>
        <p className="text-slate-500 mb-6">Esta viagem já foi finalizada com comprovante de entrega (POD).</p>
        <button 
          onClick={() => navigate('/viagens')}
          className="bg-emerald-600 text-white px-6 py-3.5 rounded-xl font-bold w-full max-w-xs shadow-lg shadow-emerald-500/20"
        >
          Voltar para Viagens
        </button>
      </div>
    );
  }

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAction = async () => {
    // Exact timestamp captured from mobile device at moment of click
    const autoTimestamp = new Date().toISOString();

    if (isAgendada) {
      const startKm = parseInt(km, 10) || kmInicialRef;
      await db.viagens.update(viagem.idOS, {
        status: 'em_execucao',
        kmInicial: startKm,
        divergenciaKm: divergencia,
        dataHoraSaida: autoTimestamp,
        sincronizadoOffline: false,
      });

      await db.syncQueue.add({
        type: 'START_VIAGEM',
        payload: { 
          idOS: viagem.idOS, 
          kmInicial: startKm, 
          divergenciaKm: divergencia,
          dataHoraSaida: autoTimestamp // Real local click time for offline sync
        },
        timestamp: autoTimestamp
      });

      navigate(`/viagem/${viagem.idOS}/mapa`);
    } else if (isEmExecucao) {
      if (!km || isNaN(parsedKmFinal)) {
        alert('Por favor, informe um valor numérico válido para o hodômetro final.');
        return;
      }

      if (!isKmFinalValid) {
        alert(`O Hodômetro final (${parsedKmFinal} km) não pode ser menor que o Hodômetro inicial (${kmInicialRef} km).`);
        return;
      }

      await db.viagens.update(viagem.idOS, {
        status: 'concluida',
        kmFinal: parsedKmFinal,
        dataHoraChegada: autoTimestamp,
        assinaturaRecebedor: signature || undefined,
        nomeRecebedor: nomeRecebedor || undefined,
        fotoComprovante: foto || undefined,
        sincronizadoOffline: false,
      });

      await db.syncQueue.add({
        type: 'FINISH_VIAGEM',
        payload: { 
          idOS: viagem.idOS, 
          kmFinal: parsedKmFinal, 
          dataHoraChegada: autoTimestamp, // Real local click time for offline sync
          assinatura: signature,
          nomeRecebedor: nomeRecebedor,
          fotoComprovante: foto
        },
        timestamp: autoTimestamp
      });

      navigate('/viagens');
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      
      {/* Header Bar */}
      <div className="bg-emerald-600 text-white px-4 py-4 shadow-md flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center">
          <button onClick={() => navigate(-1)} className="mr-3 p-1.5 rounded-full hover:bg-emerald-700 active:bg-emerald-800 transition-colors">
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-lg font-bold leading-tight">
              {isAgendada ? 'Iniciar Viagem' : 'Encerramento / POD'}
            </h1>
            <p className="text-emerald-100 text-xs font-medium uppercase tracking-wider">{viagem.idOS}</p>
          </div>
        </div>

        {/* Online / Offline status */}
        <div className="flex items-center space-x-2 bg-emerald-700/80 border border-emerald-400/30 rounded-full px-3 py-1.5 shadow-sm">
          <div className="relative flex items-center justify-center">
            <Map className="w-4 h-4 text-emerald-100" />
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              {isOnline && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75"></span>}
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isOnline ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
            </span>
          </div>
          <span className="text-[11px] font-extrabold text-white tracking-wider uppercase">
            {isOnline ? 'Online' : 'Offline'}
          </span>
        </div>
      </div>

      {/* Navigation Shortcut Bar (If in execution) */}
      {isEmExecucao && (
        <div 
          onClick={() => navigate(`/viagem/${viagem.idOS}/mapa`)}
          className="bg-slate-900 text-white px-5 py-3 flex items-center justify-between cursor-pointer hover:bg-slate-800 transition-colors border-b border-slate-700 shadow-inner"
        >
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
              <Navigation className="w-5 h-5 fill-emerald-400 rotate-45" />
            </div>
            <div>
              <p className="text-xs font-black uppercase text-emerald-400 tracking-wider">Mapa de Navegação Ativo</p>
              <p className="text-xs text-slate-300 font-medium">Toque para ver rota em tempo real (Uber/99)</p>
            </div>
          </div>
          <span className="text-xs font-extrabold bg-emerald-600 text-white px-3 py-1.5 rounded-lg shadow">
            ABRIR MAPA
          </span>
        </div>
      )}

      {/* Main Form Content */}
      <div className="flex-1 p-5 space-y-5 pb-28 max-w-lg mx-auto w-full">
        
        {/* Automatic Time Capture Banner */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="bg-emerald-100 p-2.5 rounded-xl text-emerald-700">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-black uppercase text-emerald-900 tracking-wide">Captura de Horário Automática</p>
              <p className="text-xs text-emerald-700 mt-0.5">
                {isAgendada 
                  ? 'Horário de saída gravado automaticamente ao iniciar.' 
                  : `Saída às ${viagem.dataHoraSaida ? new Date(viagem.dataHoraSaida).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--:--'}. Término será gravado ao clicar.`
                }
              </p>
            </div>
          </div>
        </div>

        {/* Info & Odometer Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-4">
          <div className="flex justify-between items-center pb-3 border-b border-slate-100">
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Veículo / Placa</p>
              <p className="font-extrabold text-slate-800 text-base">{viagem.veiculoNome} ({viagem.veiculoPlaca})</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Destino</p>
              <p className="font-extrabold text-slate-800 text-base">{viagem.destino}</p>
            </div>
          </div>

          {/* Odometer Section */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
            
            {/* Start Odometer Info */}
            <div className="flex justify-between items-center mb-3">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center">
                <GaugeCircle className="w-4 h-4 mr-1.5 text-emerald-600" />
                Hodômetro Inicial (Sankhya)
              </label>
              <span className="text-xs font-black text-slate-800 bg-slate-200 px-2.5 py-1 rounded-lg">
                {kmInicialRef.toLocaleString('pt-BR')} km
              </span>
            </div>

            {/* Start Trip Mode (Read-only pre-populated) */}
            {isAgendada && (
              <div className="relative mt-2">
                <input
                  type="number"
                  value={km}
                  readOnly
                  className="w-full text-2xl font-black text-slate-700 bg-slate-100 border border-slate-300 rounded-xl py-3 pl-4 pr-16 cursor-not-allowed"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm flex items-center">
                  <Lock className="w-4 h-4 mr-1 text-slate-400" /> km
                </span>
              </div>
            )}

            {/* Finish Trip Mode (Input final odometer with validation) */}
            {isEmExecucao && (
              <div className="space-y-2 mt-2">
                <label className="block text-xs font-black text-slate-900 uppercase tracking-wide">
                  Hodômetro Final do Painel *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={km}
                    onChange={(e) => setKm(e.target.value)}
                    placeholder={`Mínimo: ${kmInicialRef}`}
                    className={`w-full text-2xl font-black rounded-xl py-3 pl-4 pr-14 transition-all outline-none border-2 shadow-sm ${
                      !isKmFinalValid
                        ? 'bg-rose-50 border-rose-500 text-rose-900 focus:ring-4 focus:ring-rose-500/20'
                        : 'bg-white border-emerald-300 text-slate-900 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20'
                    }`}
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-sm">
                    km
                  </span>
                </div>

                {/* Validation Error Banner */}
                {!isKmFinalValid && (
                  <div className="mt-2 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start space-x-2.5 text-rose-800">
                    <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-black uppercase">Bloqueio de Validação</p>
                      <p className="text-xs mt-0.5 leading-relaxed font-medium">
                        O Km final (<strong>{parsedKmFinal || 0} km</strong>) não pode ser menor que o Km inicial do Sankhya (<strong>{kmInicialRef} km</strong>).
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>

          {/* Divergence field */}
          <div className="pt-2">
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
              Observação de Divergência de Hodômetro (Opcional)
            </label>
            <textarea
              value={divergencia}
              onChange={(e) => setDivergencia(e.target.value)}
              placeholder="Se o painel do veículo diferir do valor exibido no sistema, relate a divergência aqui."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-700 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 resize-none h-20"
            />
          </div>

        </div>

        {/* Proof of Delivery (POD) Section - Available when finishing trip */}
        {isEmExecucao && (
          <div className="space-y-5">
            
            {/* Signature Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-4">
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide flex items-center">
                    <PenTool className="w-4 h-4 mr-2 text-emerald-600" />
                    Assinatura do Recebedor (POD) *
                  </h3>
                  {signature && (
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full flex items-center">
                      <CheckCircle className="w-3 h-3 mr-1" /> Assinado
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-1">Coletar assinatura digital do responsável no destino.</p>
              </div>

              {/* Receiver Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Nome do Recebedor (Opcional)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={nomeRecebedor}
                    onChange={(e) => setNomeRecebedor(e.target.value)}
                    placeholder="Ex: João Ferreira da Silva"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-9 pr-3 text-xs text-slate-800 font-bold outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                  />
                  <UserCheck className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <SignaturePad onSignature={setSignature} />
            </div>

            {/* Photo Attachment Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-4">
              <div>
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide flex items-center">
                  <Camera className="w-4 h-4 mr-2 text-emerald-600" />
                  Foto do Comprovante / Carga
                </h3>
                <p className="text-xs text-slate-500 mt-1">Anexar foto da nota fiscal, comprovante ou descarregamento.</p>
              </div>

              {/* Hidden File Input */}
              <input
                type="file"
                accept="image/*"
                capture="environment"
                ref={fileInputRef}
                onChange={handlePhotoCapture}
                className="hidden"
              />

              {!foto ? (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-6 border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-2xl bg-slate-50 hover:bg-emerald-50/50 flex flex-col items-center justify-center space-y-2 transition-all group"
                >
                  <div className="p-3 bg-white rounded-full shadow-sm border border-slate-200 group-hover:scale-110 transition-transform">
                    <Camera className="w-6 h-6 text-emerald-600" />
                  </div>
                  <span className="text-xs font-extrabold text-slate-700 group-hover:text-emerald-800">
                    Tirar Foto ou Escolher da Galeria
                  </span>
                </button>
              ) : (
                <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 group">
                  <img 
                    src={foto} 
                    alt="Comprovante" 
                    className="w-full h-44 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => setPreviewFotoOpen(true)}
                  />
                  <div className="absolute top-2 right-2 flex space-x-2">
                    <button
                      type="button"
                      onClick={() => setPreviewFotoOpen(true)}
                      className="bg-slate-900/80 text-white p-2 rounded-xl backdrop-blur-md hover:bg-slate-900 transition-colors"
                      title="Visualizar Foto"
                    >
                      <ImageIcon className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setFoto(null)}
                      className="bg-rose-600 text-white p-2 rounded-xl hover:bg-rose-700 transition-colors shadow"
                      title="Remover Foto"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        )}

      </div>

      {/* Photo Fullscreen Modal */}
      {previewFotoOpen && foto && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-50 flex flex-col p-4">
          <div className="flex justify-between items-center text-white mb-4">
            <h4 className="font-bold text-sm">Visualização do Comprovante</h4>
            <button 
              onClick={() => setPreviewFotoOpen(false)}
              className="p-2 bg-slate-800 text-white rounded-full"
            >
              <X size={20} />
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center">
            <img src={foto} alt="Comprovante grande" className="max-h-full max-w-full object-contain rounded-xl" />
          </div>
        </div>
      )}

      {/* Checklist de Atividade (ICO, PRD 4.5) — oferecido antes de iniciar, não bloqueia o início */}
      {isAgendada && (
        <div className="px-4 pb-2">
          <button
            type="button"
            onClick={() => navigate(`/viagem/${viagem.idOS}/checklist`)}
            className="w-full flex items-center justify-between bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl px-4 py-3 font-bold text-sm hover:bg-emerald-100 transition-colors"
          >
            <span className="flex items-center gap-2"><ListChecks size={18} /> Preencher checklist do veículo</span>
            <span className="text-xs text-emerald-600">Antes de sair →</span>
          </button>
        </div>
      )}

      {/* Sticky Bottom Action Bar */}
      <div className="sticky bottom-0 w-full p-4 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-[0_-10px_30px_rgba(0,0,0,0.08)] z-30 mt-auto">
        <button
          onClick={handleAction}
          disabled={isEmExecucao && (!km || !isKmFinalValid || !signature)}
          className={`w-full max-w-lg mx-auto flex items-center justify-center space-x-2 py-4 rounded-2xl font-black text-base tracking-wide transition-all shadow-lg active:scale-[0.98] ${
            isAgendada
              ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-emerald-500/30'
              : !isKmFinalValid || !signature || !km
                ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
                : 'bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white shadow-emerald-600/30'
          }`}
        >
          {isAgendada ? <Play size={22} className="fill-white" /> : <CheckCircle size={22} />}
          <span>
            {isAgendada 
              ? 'CONFIRMAR INÍCIO DA VIAGEM' 
              : !isKmFinalValid 
                ? 'KM FINAL INVÁLIDO' 
                : !signature 
                  ? 'ASSINATURA OBRIGATÓRIA' 
                  : 'FINALIZAR VIAGEM COM POD'
            }
          </span>
        </button>
      </div>

    </div>
  );
};
