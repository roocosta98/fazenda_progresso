import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/offlineDB';
import { 
  ArrowLeft, 
  MapPin, 
  Calendar, 
  Phone, 
  MessageCircle, 
  Truck, 
  User, 
  Info, 
  Clock,
  Navigation,
  CheckCircle,
  PenTool,
  Camera,
  Gauge,
  X
} from 'lucide-react';

export const DetalheViagem: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [photoModalOpen, setPhotoModalOpen] = useState(false);

  const viagem = useLiveQuery(() => db.viagens.get(id || ''));

  if (!viagem) {
    return (
      <div className="flex flex-col h-screen bg-gray-50 items-center justify-center">
        <div className="animate-spin text-green-500 mb-4"><Clock size={40} /></div>
        <p className="text-gray-500 font-medium">Carregando detalhes...</p>
      </div>
    );
  }

  const formatData = (isoString?: string) => {
    if (!isoString) return 'Não registrada';
    const date = new Date(isoString);
    return date.toLocaleString('pt-BR', { 
      day: '2-digit', month: '2-digit', year: 'numeric', 
      hour: '2-digit', minute: '2-digit' 
    });
  };

  const isConcluida = viagem.status === 'concluida';
  const isEmExecucao = viagem.status === 'em_execucao';

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 pb-28">
      
      {/* App Bar */}
      <div className="bg-green-600 text-white px-4 py-5 shadow-md flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center">
          <button onClick={() => navigate(-1)} className="mr-3 p-1 rounded-full hover:bg-green-700 active:bg-green-800 transition-colors">
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-lg font-bold leading-tight">Detalhes da Viagem</h1>
            <p className="text-green-100 text-xs font-medium uppercase tracking-wider">{viagem.idOS}</p>
          </div>
        </div>

        {/* Map Button in Header */}
        <button
          onClick={() => navigate(`/viagem/${viagem.idOS}/mapa`)}
          className="flex items-center space-x-1 bg-green-700 hover:bg-green-800 border border-green-500/40 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-sm transition-all"
        >
          <Navigation className="w-3.5 h-3.5 fill-white rotate-45" />
          <span>Ver Mapa</span>
        </button>
      </div>

      <div className="p-4 space-y-4 max-w-lg mx-auto w-full">
        
        {/* Identificação Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Status</p>
              <div className={`mt-1 inline-flex items-center px-2.5 py-1 rounded-md text-xs font-black uppercase ${
                isConcluida ? 'bg-green-100 text-green-800' : isEmExecucao ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-800'
              }`}>
                {viagem.status.replace('_', ' ')}
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Sequência</p>
              <p className="text-xl font-black text-slate-900">{viagem.sequencia}ª</p>
            </div>
          </div>
          
          <div className="space-y-3 pt-3 border-t border-slate-100">
            <div className="flex items-center space-x-3 text-slate-700">
              <Calendar className="w-4 h-4 text-green-600" />
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase">Programada para</p>
                <p className="font-bold text-sm text-slate-800">{formatData(viagem.dataHoraProgramada)}</p>
              </div>
            </div>

            {viagem.dataHoraSaida && (
              <div className="flex items-center space-x-3 text-slate-700">
                <Clock className="w-4 h-4 text-blue-600" />
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Horário de Início (Real)</p>
                  <p className="font-bold text-sm text-slate-800">{formatData(viagem.dataHoraSaida)}</p>
                </div>
              </div>
            )}

            {viagem.dataHoraChegada && (
              <div className="flex items-center space-x-3 text-slate-700">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Horário de Término (Real)</p>
                  <p className="font-bold text-sm text-slate-800">{formatData(viagem.dataHoraChegada)}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Hodômetro Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-3">
          <h3 className="text-xs font-black text-slate-800 uppercase tracking-wide flex items-center">
            <Gauge className="w-4 h-4 mr-2 text-green-600" />
            Hodômetro & Divergência
          </h3>
          <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase">Km Inicial</p>
              <p className="text-base font-black text-slate-900">
                {viagem.kmInicial ? `${viagem.kmInicial.toLocaleString('pt-BR')} km` : 'Não registrado'}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase">Km Final</p>
              <p className="text-base font-black text-slate-900">
                {viagem.kmFinal ? `${viagem.kmFinal.toLocaleString('pt-BR')} km` : 'Em andamento'}
              </p>
            </div>
          </div>
          {viagem.divergenciaKm && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900">
              <p className="font-bold uppercase tracking-wide text-amber-800">Divergência Relatada:</p>
              <p className="mt-0.5">{viagem.divergenciaKm}</p>
            </div>
          )}
        </div>

        {/* Comprovante de Entrega POD (Se concluída) */}
        {isConcluida && (viagem.assinaturaRecebedor || viagem.fotoComprovante || viagem.nomeRecebedor) && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-4">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wide flex items-center">
              <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
              Comprovação de Entrega (POD)
            </h3>

            {viagem.nomeRecebedor && (
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase">Recebedor Responsável</p>
                <p className="text-sm font-black text-slate-800">{viagem.nomeRecebedor}</p>
              </div>
            )}

            {viagem.assinaturaRecebedor && (
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase mb-1 flex items-center">
                  <PenTool className="w-3 h-3 mr-1 text-green-600" /> Assinatura Digital
                </p>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-2 flex justify-center">
                  <img src={viagem.assinaturaRecebedor} alt="Assinatura" className="max-h-28 object-contain" />
                </div>
              </div>
            )}

            {viagem.fotoComprovante && (
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase mb-1 flex items-center">
                  <Camera className="w-3 h-3 mr-1 text-green-600" /> Foto do Comprovante
                </p>
                <div 
                  onClick={() => setPhotoModalOpen(true)}
                  className="rounded-xl overflow-hidden border border-slate-200 cursor-pointer hover:opacity-90 transition-opacity bg-slate-900 max-h-40"
                >
                  <img src={viagem.fotoComprovante} alt="Foto comprovante" className="w-full h-40 object-cover" />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Rota Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-slate-50 px-5 py-3 border-b border-slate-100 font-bold text-slate-800 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <MapPin className="w-5 h-5 text-green-600" />
              <span className="text-xs uppercase tracking-wide font-black">Trajeto da Viagem</span>
            </div>
            <button 
              onClick={() => navigate(`/viagem/${viagem.idOS}/mapa`)}
              className="text-xs font-extrabold text-green-700 hover:underline"
            >
              Abrir Mapa Rota →
            </button>
          </div>
          <div className="p-5">
            <div className="relative pl-6 pb-6 border-l-2 border-slate-200 ml-2">
              <div className="absolute w-4 h-4 bg-green-500 rounded-full -left-[9px] top-0 ring-4 ring-white"></div>
              <p className="text-[10px] text-slate-400 font-bold uppercase">Origem</p>
              <p className="text-base font-bold text-slate-900 mt-0.5">{viagem.origem}</p>
            </div>
            <div className="relative pl-6 ml-2">
              <div className="absolute w-4 h-4 bg-rose-500 rounded-full -left-[9px] top-0 ring-4 ring-white"></div>
              <p className="text-[10px] text-slate-400 font-bold uppercase">Destino</p>
              <p className="text-base font-bold text-slate-900 mt-0.5">{viagem.destino}</p>
            </div>

            {viagem.observacoes && (
              <div className="mt-5 bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start space-x-3">
                <Info className="text-amber-600 w-5 h-5 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] text-amber-800 font-bold uppercase tracking-wide">Observações do Local</p>
                  <p className="text-xs text-amber-900 mt-1">{viagem.observacoes}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Veículo & Carga */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-slate-50 px-5 py-3 border-b border-slate-100 font-bold text-slate-800 flex items-center space-x-2">
            <Truck className="w-5 h-5 text-slate-500" />
            <span className="text-xs uppercase tracking-wide font-black">Veículo e Carga</span>
          </div>
          <div className="p-5 space-y-4">
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase">Veículo Alocado</p>
              <p className="text-base font-bold text-slate-900 mt-0.5">{viagem.veiculoNome} <span className="text-slate-500 font-normal">({viagem.veiculoPlaca})</span></p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase">Carga / Operação</p>
              <p className="text-base font-bold text-slate-900 mt-0.5">{viagem.tipoCarga}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase">Projeto Vinculado</p>
              <p className="text-xs font-bold text-green-700 bg-green-50 inline-block px-2.5 py-1 rounded-lg mt-1">{viagem.projeto}</p>
            </div>
          </div>
        </div>

        {/* Solicitante */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-slate-50 px-5 py-3 border-b border-slate-100 font-bold text-slate-800 flex items-center space-x-2">
            <User className="w-5 h-5 text-slate-500" />
            <span className="text-xs uppercase tracking-wide font-black">Solicitante</span>
          </div>
          <div className="p-5 flex flex-col justify-between">
            <div className="mb-4">
              <p className="text-base font-bold text-slate-900">{viagem.solicitanteNome}</p>
              <p className="text-xs text-slate-500">{viagem.solicitanteDepartamento || 'Departamento não informado'}</p>
            </div>
            <div className="flex space-x-3">
              <button 
                className="flex-1 flex items-center justify-center space-x-2 bg-slate-100 hover:bg-slate-200 text-slate-800 py-2.5 rounded-xl font-bold text-xs transition-colors"
                onClick={() => alert('Simulando chamada...')}
              >
                <Phone className="w-4 h-4" />
                <span>Ligar</span>
              </button>
              <button 
                className="flex-1 flex items-center justify-center space-x-2 bg-green-100 hover:bg-green-200 text-green-800 py-2.5 rounded-xl font-bold text-xs transition-colors"
                onClick={() => alert('Abrindo WhatsApp...')}
              >
                <MessageCircle className="w-4 h-4" />
                <span>WhatsApp</span>
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* Full Photo Modal */}
      {photoModalOpen && viagem.fotoComprovante && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-50 flex flex-col p-4">
          <div className="flex justify-between items-center text-white mb-4">
            <h4 className="font-bold text-sm">Comprovante de Entrega</h4>
            <button 
              onClick={() => setPhotoModalOpen(false)}
              className="p-2 bg-slate-800 text-white rounded-full"
            >
              <X size={20} />
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center">
            <img src={viagem.fotoComprovante} alt="Foto grande" className="max-h-full max-w-full object-contain rounded-xl" />
          </div>
        </div>
      )}

      {/* Sticky Bottom Bar */}
      {viagem.status !== 'concluida' && (
        <div className="sticky bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-20 mt-auto">
          <Link
            to={`/viagem/${viagem.idOS}/execucao`}
            className="w-full flex items-center justify-center bg-green-600 hover:bg-green-700 text-white py-4 rounded-2xl font-black text-base transition-all shadow-lg shadow-green-600/30"
          >
            {isEmExecucao ? 'FINALIZAR VIAGEM / REGISTRAR POD' : 'INICIAR VIAGEM'}
          </Link>
        </div>
      )}

    </div>
  );
};
