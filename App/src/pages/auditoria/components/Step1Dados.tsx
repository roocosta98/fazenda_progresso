import React, { useState } from 'react';
import { AuditoriaData } from '../../../types';
import { MapPin, AlertCircle } from 'lucide-react';

interface Props {
  data: AuditoriaData['dadosAuditoria'];
  onChange: (value: AuditoriaData['dadosAuditoria']) => void;
}

export function Step1Dados({ data, onChange }: Props) {
  const [isLocating, setIsLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    onChange({ ...data, [name]: value });
  };

  const getGeolocation = () => {
    if (!navigator.geolocation) {
      setGeoError('Geolocalização não suportada pelo navegador.');
      return;
    }
    
    setIsLocating(true);
    setGeoError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        onChange({
          ...data,
          geolocation: {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          }
        });
        setIsLocating(false);
      },
      (error) => {
        setIsLocating(false);
        setGeoError('Falha ao obter localização. Verifique as permissões.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-xl font-bold text-neutral-800">Dados da Auditoria</h2>
        <p className="text-sm text-neutral-500 mt-1">Preencha as informações básicas da operação.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Data e Hora */}
        <div className="space-y-1">
          <label className="text-sm font-medium text-neutral-700">Data</label>
          <input 
            type="date" 
            name="data"
            value={data.data}
            onChange={handleChange}
            className="w-full rounded-md border border-neutral-300 p-2.5 text-sm focus:ring-1 focus:ring-[#1E3A2F] focus:border-[#1E3A2F]"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-neutral-700">Hora</label>
          <input 
            type="time" 
            name="hora"
            value={data.hora}
            onChange={handleChange}
            className="w-full rounded-md border border-neutral-300 p-2.5 text-sm focus:ring-1 focus:ring-[#1E3A2F] focus:border-[#1E3A2F]"
          />
        </div>

        {/* Localização */}
        <div className="space-y-1">
          <label className="text-sm font-medium text-neutral-700">Fazenda</label>
          <select 
            name="fazenda"
            value={data.fazenda}
            onChange={handleChange}
            className="w-full rounded-md border border-neutral-300 p-2.5 text-sm focus:ring-1 focus:ring-[#1E3A2F] focus:border-[#1E3A2F] bg-white"
          >
            <option value="">Selecione uma fazenda...</option>
            <option value="Fazenda I">Fazenda I</option>
            <option value="Fazenda II">Fazenda II</option>
            <option value="Fazenda III">Fazenda III</option>
            <option value="Fazenda IV">Fazenda IV</option>
            <option value="Fazenda V">Fazenda V</option>
            <option value="Outra">Outra</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-neutral-700">Local / Talhão</label>
          <input 
            type="text" 
            name="localTalhao"
            value={data.localTalhao}
            onChange={handleChange}
            placeholder="Ex: Talhão 45B"
            className="w-full rounded-md border border-neutral-300 p-2.5 text-sm focus:ring-1 focus:ring-[#1E3A2F] focus:border-[#1E3A2F]"
          />
        </div>

        {/* Envolvidos */}
        <div className="space-y-1">
          <label className="text-sm font-medium text-neutral-700">Motorista</label>
          <input 
            type="text" 
            name="motorista"
            value={data.motorista}
            onChange={handleChange}
            placeholder="Nome do motorista auditado"
            className="w-full rounded-md border border-neutral-300 p-2.5 text-sm focus:ring-1 focus:ring-[#1E3A2F] focus:border-[#1E3A2F]"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-neutral-700">Veículo / Placa</label>
          <input 
            type="text" 
            name="veiculo"
            value={data.veiculo}
            onChange={handleChange}
            placeholder="Identificação do veículo"
            className="w-full rounded-md border border-neutral-300 p-2.5 text-sm focus:ring-1 focus:ring-[#1E3A2F] focus:border-[#1E3A2F]"
          />
        </div>
        <div className="space-y-1 md:col-span-2">
          <label className="text-sm font-medium text-neutral-700">Supervisor / Avaliador</label>
          <input 
            type="text" 
            name="supervisor"
            value={data.supervisor}
            onChange={handleChange}
            placeholder="Nome do supervisor responsável"
            className="w-full rounded-md border border-neutral-300 p-2.5 text-sm focus:ring-1 focus:ring-[#1E3A2F] focus:border-[#1E3A2F]"
          />
        </div>

        {/* Medidores */}
        <div className="space-y-1">
          <label className="text-sm font-medium text-neutral-700">KM Inicial (Opcional)</label>
          <input 
            type="number" 
            name="kmInicial"
            value={data.kmInicial}
            onChange={handleChange}
            placeholder="0"
            className="w-full rounded-md border border-neutral-300 p-2.5 text-sm focus:ring-1 focus:ring-[#1E3A2F] focus:border-[#1E3A2F]"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-neutral-700">KM Final (Opcional)</label>
          <input 
            type="number" 
            name="kmFinal"
            value={data.kmFinal}
            onChange={handleChange}
            placeholder="0"
            className="w-full rounded-md border border-neutral-300 p-2.5 text-sm focus:ring-1 focus:ring-[#1E3A2F] focus:border-[#1E3A2F]"
          />
        </div>
        <div className="space-y-1 md:col-span-2">
          <label className="text-sm font-medium text-neutral-700">Horímetro (Opcional)</label>
          <input 
            type="number" 
            name="horimetro"
            value={data.horimetro}
            onChange={handleChange}
            placeholder="0"
            className="w-full rounded-md border border-neutral-300 p-2.5 text-sm focus:ring-1 focus:ring-[#1E3A2F] focus:border-[#1E3A2F]"
          />
        </div>
      </div>

      {/* Geolocalização */}
      <div className="pt-4 border-t border-neutral-200">
        <label className="text-sm font-medium text-neutral-700 mb-2 block">Coordenadas de GPS</label>
        {data.geolocation ? (
          <div className="flex items-center gap-2 p-3 bg-green-50 text-green-800 rounded-md border border-green-200">
            <MapPin className="w-5 h-5 text-green-600" />
            <span className="text-sm font-medium">
              Capturado: {data.geolocation.lat.toFixed(6)}, {data.geolocation.lng.toFixed(6)}
            </span>
          </div>
        ) : (
          <button
            type="button"
            onClick={getGeolocation}
            disabled={isLocating}
            className="flex items-center justify-center gap-2 w-full md:w-auto px-4 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-md font-medium text-sm transition-colors"
          >
            <MapPin className="w-4 h-4" />
            {isLocating ? 'Capturando...' : 'Capturar Localização Atual'}
          </button>
        )}
        {geoError && (
          <div className="mt-2 flex items-center gap-1.5 text-red-600 text-sm">
            <AlertCircle className="w-4 h-4" />
            {geoError}
          </div>
        )}
      </div>
    </div>
  );
}
