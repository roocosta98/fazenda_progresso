import React from 'react';
import { MapPin, Navigation, Truck, Package, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { ViagemMotorista } from '../../types';

interface ViagemCardProps {
  viagem: ViagemMotorista;
}

export const ViagemCard: React.FC<ViagemCardProps> = ({ viagem }) => {
  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden mb-4">
      {/* Header */}
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-100 flex justify-between items-center">
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 uppercase tracking-wide">
          {viagem.sequencia}ª Viagem do Dia
        </span>
        <span className="text-sm font-medium text-gray-500">{viagem.idOS}</span>
      </div>

      {/* Body */}
      <div className="p-4 space-y-4">
        {/* Route */}
        <div className="flex items-start space-x-3">
          <div className="flex flex-col items-center mt-1">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
            <div className="w-0.5 h-8 bg-gray-200 my-1"></div>
            <MapPin className="w-4 h-4 text-rose-500" />
          </div>
          <div className="flex-1 space-y-4">
            <div>
              <p className="text-xs text-gray-500 uppercase font-semibold tracking-wider">Origem</p>
              <p className="text-gray-900 font-medium">{viagem.origem}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase font-semibold tracking-wider">Destino</p>
              <p className="text-gray-900 font-medium">{viagem.destino}</p>
            </div>
          </div>
        </div>

        <hr className="border-gray-100" />

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center space-x-2 min-w-0">
            <div className="p-1.5 bg-emerald-50 rounded-lg flex-shrink-0">
              <Truck className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] text-gray-500 font-semibold uppercase">Veículo</p>
              <p className="text-xs text-gray-900 font-medium truncate">{viagem.veiculoPlaca}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2 min-w-0">
            <div className="p-1.5 bg-blue-50 rounded-lg flex-shrink-0">
              <Package className="w-4 h-4 text-blue-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] text-gray-500 font-semibold uppercase">Carga</p>
              <p className="text-xs text-gray-900 font-medium truncate" title={viagem.tipoCarga}>
                {viagem.tipoCarga}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="p-4 bg-gray-50 flex flex-col space-y-2.5">
        {viagem.status === 'em_execucao' ? (
          <div className="flex space-x-2">
            <Link
              to={`/viagem/${viagem.idOS}/mapa`}
              className="flex-1 flex items-center justify-center space-x-1.5 bg-slate-900 hover:bg-slate-800 text-white py-3 px-3 rounded-xl font-bold text-xs transition-colors shadow-sm"
            >
              <Navigation className="w-4 h-4 fill-emerald-400 text-emerald-400 rotate-45" />
              <span>MAPA GPS</span>
            </Link>
            <Link
              to={`/viagem/${viagem.idOS}/execucao`}
              className="flex-1 flex items-center justify-center space-x-1.5 bg-emerald-600 hover:bg-emerald-700 text-white py-3 px-3 rounded-xl font-bold text-xs transition-colors shadow-sm"
            >
              <span>FINALIZAR (POD)</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        ) : viagem.status === 'agendada' ? (
          <Link
            to={`/viagem/${viagem.idOS}/execucao`}
            className="w-full flex items-center justify-center space-x-2 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white py-3.5 px-4 rounded-xl font-bold transition-colors shadow-sm"
          >
            <Navigation className="w-5 h-5" />
            <span>INICIAR VIAGEM</span>
          </Link>
        ) : (
          <div className="w-full text-center py-3 bg-slate-200 text-slate-700 rounded-xl font-bold text-xs">
            VIAGEM CONCLUÍDA
          </div>
        )}

        <Link
          to={`/viagem/${viagem.idOS}`}
          className="w-full flex items-center justify-center space-x-1 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-xl font-bold text-xs hover:bg-gray-50 active:bg-gray-100 transition-colors"
        >
          <span>Ver Detalhes</span>
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
};
