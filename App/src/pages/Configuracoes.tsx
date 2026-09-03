import React, { useState } from 'react';
import { ArrowLeft, Save, Bell, Map, Database, Smartphone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Configuracoes: React.FC = () => {
  const navigate = useNavigate();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [gpsHighAccuracy, setGpsHighAccuracy] = useState(true);
  const [autoSync, setAutoSync] = useState(true);

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 pb-10">
      
      {/* App Bar */}
      <div className="bg-white px-4 py-5 shadow-sm flex items-center sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="mr-3 p-2 rounded-full hover:bg-gray-100 transition-colors">
          <ArrowLeft size={24} className="text-gray-700" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900 leading-tight">Configurações</h1>
        </div>
      </div>

      <div className="p-4 space-y-6 mt-2">
        
        {/* Section: Sistema */}
        <section>
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 px-1">Sistema</h2>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden divide-y divide-gray-100">
            
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-50 rounded-lg">
                  <Bell className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">Notificações Push</p>
                  <p className="text-xs text-gray-500">Alertas sobre novas viagens</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={notificationsEnabled} onChange={() => setNotificationsEnabled(!notificationsEnabled)} />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
              </label>
            </div>

            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Map className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">GPS Alta Precisão</p>
                  <p className="text-xs text-gray-500">Usa mais bateria, rastreio exato</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={gpsHighAccuracy} onChange={() => setGpsHighAccuracy(!gpsHighAccuracy)} />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
              </label>
            </div>

          </div>
        </section>

        {/* Section: Offline */}
        <section>
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 px-1">Dados & Conexão</h2>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden divide-y divide-gray-100">
            
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-purple-50 rounded-lg">
                  <Database className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">Sincronização Automática</p>
                  <p className="text-xs text-gray-500">Enviar dados assim que houver rede</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={autoSync} onChange={() => setAutoSync(!autoSync)} />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-500"></div>
              </label>
            </div>

          </div>
        </section>
        
        {/* Section: Info */}
        <section>
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 px-1">Sobre o App</h2>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden divide-y divide-gray-100">
            
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <Smartphone className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">Versão</p>
                  <p className="text-xs text-gray-500">v1.0.0 (Build 42)</p>
                </div>
              </div>
            </div>

          </div>
        </section>

      </div>

      <div className="mt-8 px-4">
        <button 
          onClick={() => navigate(-1)}
          className="w-full flex items-center justify-center space-x-2 bg-gray-900 hover:bg-black text-white py-4 rounded-xl font-bold transition-colors"
        >
          <Save className="w-5 h-5" />
          <span>Salvar Alterações</span>
        </button>
      </div>

    </div>
  );
};
