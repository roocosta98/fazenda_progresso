import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/offlineDB';
import { 
  ArrowLeft, 
  Navigation, 
  Truck, 
  Clock, 
  Compass, 
  Locate, 
  Layers,
  ChevronRight,
  ExternalLink,
  Map as MapIcon
} from 'lucide-react';
import { useOfflineSync } from '../hooks/useOfflineSync';

export const MapaViagemMotorista: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isOnline } = useOfflineSync();

  const viagem = useLiveQuery(() => db.viagens.get(id || ''));

  // GPS tracking state
  const [currentPos, setCurrentPos] = useState<{ lat: number; lng: number } | null>(null);
  const [speed, setSpeed] = useState<number>(38); // km/h simulation/real
  const [etaMinutes, setEtaMinutes] = useState<number>(7);
  const [distanceKm, setDistanceKm] = useState<number>(4.2);
  const [gpsActive, setGpsActive] = useState<boolean>(true);
  const [mapType, setMapType] = useState<'roadmap' | 'satellite'>('roadmap');

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Default coords (Fazenda Progresso - Mucugê/BA)
  const originCoords = viagem?.origemCoords || { lat: -13.0051, lng: -41.3722 };
  const destCoords = viagem?.destinoCoords || { lat: -13.0230, lng: -41.3540 };

  // Watch GPS position
  useEffect(() => {
    let watchId: number;
    if ('geolocation' in navigator) {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setCurrentPos({ lat, lng });
          setGpsActive(true);
          if (pos.coords.speed !== null && pos.coords.speed !== undefined && !isNaN(pos.coords.speed)) {
            setSpeed(Math.round(pos.coords.speed * 3.6)); // m/s to km/h
          }
        },
        (err) => {
          console.warn('GPS browser fallback simulated position', err);
          setGpsActive(false);
          // Fallback to interpolated position between origin and destination
          setCurrentPos({
            lat: (originCoords.lat * 0.4 + destCoords.lat * 0.6),
            lng: (originCoords.lng * 0.4 + destCoords.lng * 0.6)
          });
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
      );
    } else {
      setCurrentPos({
        lat: (originCoords.lat * 0.4 + destCoords.lat * 0.6),
        lng: (originCoords.lng * 0.4 + destCoords.lng * 0.6)
      });
    }

    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, [originCoords.lat, originCoords.lng, destCoords.lat, destCoords.lng]);

  // Recalculate ETA periodically
  useEffect(() => {
    const calcDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
      const R = 6371; // km
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    };

    const vehiclePos = currentPos || {
      lat: (originCoords.lat + destCoords.lat) / 2,
      lng: (originCoords.lng + destCoords.lng) / 2
    };

    const dist = calcDistance(vehiclePos.lat, vehiclePos.lng, destCoords.lat, destCoords.lng);
    const roundedDist = Math.max(0.2, parseFloat(dist.toFixed(1)));
    setDistanceKm(roundedDist);

    const currentSpeed = speed > 0 ? speed : 35;
    const estHours = roundedDist / currentSpeed;
    const estMinutes = Math.max(1, Math.round(estHours * 60));
    setEtaMinutes(estMinutes);

  }, [currentPos, speed, originCoords, destCoords]);

  // Render Canvas visualizer fallback when offline
  useEffect(() => {
    if (isOnline) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = canvas.parentElement?.clientWidth || 400;
    canvas.height = canvas.parentElement?.clientHeight || 500;

    const width = canvas.width;
    const height = canvas.height;

    ctx.fillStyle = mapType === 'satellite' ? '#1e293b' : '#f8fafc';
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = mapType === 'satellite' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    const origPoint = { x: width * 0.25, y: height * 0.75 };
    const destPoint = { x: width * 0.75, y: height * 0.25 };
    const vehiclePoint = { 
      x: origPoint.x + (destPoint.x - origPoint.x) * 0.6, 
      y: origPoint.y + (destPoint.y - origPoint.y) * 0.6 
    };

    ctx.beginPath();
    ctx.moveTo(origPoint.x, origPoint.y);
    ctx.quadraticCurveTo(width * 0.4, height * 0.4, destPoint.x, destPoint.y);
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.stroke();

    ctx.beginPath();
    ctx.setLineDash([8, 6]);
    ctx.moveTo(origPoint.x, origPoint.y);
    ctx.quadraticCurveTo(width * 0.4, height * 0.4, destPoint.x, destPoint.y);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.beginPath();
    ctx.arc(origPoint.x, origPoint.y, 14, 0, Math.PI * 2);
    ctx.fillStyle = '#22c55e';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('A', origPoint.x, origPoint.y + 4);

    ctx.beginPath();
    ctx.arc(destPoint.x, destPoint.y, 16, 0, Math.PI * 2);
    ctx.fillStyle = '#ef4444';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('B', destPoint.x, destPoint.y + 4);

    ctx.beginPath();
    ctx.arc(vehiclePoint.x, vehiclePoint.y, 24, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(16, 185, 129, 0.25)';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(vehiclePoint.x, vehiclePoint.y, 16, 0, Math.PI * 2);
    ctx.fillStyle = '#0f172a';
    ctx.fill();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3;
    ctx.stroke();

  }, [mapType, isOnline]);

  if (!viagem) {
    return (
      <div className="flex flex-col h-screen bg-slate-50 items-center justify-center">
        <div className="animate-spin text-green-500 mb-4"><Truck size={40} /></div>
        <p className="text-slate-500 font-medium">Carregando mapa da viagem...</p>
      </div>
    );
  }

  // Google Maps Embed URL with origin & destination coordinates / addresses
  const googleMapsEmbedUrl = `https://maps.google.com/maps?saddr=${originCoords.lat},${originCoords.lng}&daddr=${destCoords.lat},${destCoords.lng}&t=${mapType === 'satellite' ? 'k' : 'm'}&z=14&output=embed`;

  // External Native Google Maps app turn-by-turn navigation URL
  const googleMapsAppUrl = `https://www.google.com/maps/dir/?api=1&origin=${originCoords.lat},${originCoords.lng}&destination=${destCoords.lat},${destCoords.lng}&travelmode=driving`;

  // Arrival time string
  const arrivalTime = new Date(Date.now() + etaMinutes * 60 * 1000).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <div className="flex flex-col h-screen bg-slate-900 text-white relative overflow-hidden">
      
      {/* Top Floating Header */}
      <div className="absolute top-3 left-3 right-3 z-20 flex flex-col space-y-2">
        <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-2xl p-3 shadow-2xl flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <button 
              onClick={() => navigate(-1)} 
              className="p-2 rounded-xl bg-slate-800 text-slate-200 hover:bg-slate-700 active:scale-95 transition-all"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-black bg-green-500/20 text-green-400 px-2 py-0.5 rounded uppercase">
                  {viagem.idOS}
                </span>
                <span className="text-[11px] text-slate-400 font-bold">{viagem.veiculoPlaca}</span>
              </div>
              <h2 className="text-xs font-extrabold text-white tracking-tight mt-0.5 truncate max-w-[160px]">
                {viagem.destino}
              </h2>
            </div>
          </div>

          {/* Map Controls */}
          <div className="flex items-center space-x-1.5">
            {/* Standard Roadmap View Button */}
            <button 
              onClick={() => setMapType('roadmap')}
              className={`p-2 rounded-xl transition-all ${
                mapType === 'roadmap' 
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30' 
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
              title="Visão Mapa Padrão"
            >
              <MapIcon size={18} />
            </button>

            {/* Satellite View Button */}
            <button 
              onClick={() => setMapType('satellite')}
              className={`p-2 rounded-xl transition-all ${
                mapType === 'satellite' 
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30' 
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
              title="Visão Satélite"
            >
              <Layers size={18} />
            </button>

            {/* GPS Indicator */}
            <div className={`px-2 py-1 rounded-full text-[9px] font-extrabold flex items-center space-x-1 ${
              gpsActive ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
            }`}>
              <span className={`w-2 h-2 rounded-full ${gpsActive ? 'bg-green-400 animate-pulse' : 'bg-amber-400'}`}></span>
              <span>{gpsActive ? 'GPS' : 'Estimado'}</span>
            </div>
          </div>
        </div>

        {/* Route Direction Instruction Banner */}
        <div className="bg-green-600 text-white rounded-xl px-3.5 py-2 shadow-lg flex items-center justify-between">
          <div className="flex items-center space-x-2.5 min-w-0">
            <Navigation className="w-4 h-4 fill-white rotate-45 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold leading-tight truncate">Rota via Google Maps: {viagem.origem} $\rightarrow$ {viagem.destino}</p>
              <p className="text-[10px] text-green-100 font-medium">Estradas internas Fazenda Progresso - Mucugê/BA</p>
            </div>
          </div>
          <a
            href={googleMapsAppUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] font-black bg-green-700 hover:bg-green-800 text-white px-2.5 py-1.5 rounded-lg flex items-center space-x-1 shrink-0 ml-2 shadow transition-colors"
          >
            <span>Navegar App</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* Main Map Container (Google Maps or Fallback Canvas) */}
      <div className="flex-1 relative w-full h-full bg-slate-950 pt-24 pb-44">
        {isOnline ? (
          <iframe
            title="Google Maps Viagem Motorista"
            src={googleMapsEmbedUrl}
            className="w-full h-full border-0 filter brightness-95 contrast-105"
            loading="lazy"
            allowFullScreen
          />
        ) : (
          <div className="w-full h-full relative">
            <canvas ref={canvasRef} className="w-full h-full object-cover" />
            {!isOnline && (
              <div className="absolute top-2 left-2 right-2 bg-amber-500/90 text-slate-950 font-black text-[10px] px-3 py-1.5 rounded-lg text-center backdrop-blur-md">
                Modo Offline Ativo - Exibindo renderização vetorial do trajeto
              </div>
            )}
          </div>
        )}

        {/* Recenter Button */}
        <button 
          onClick={() => {
            setGpsActive(true);
          }}
          className="absolute bottom-48 right-4 p-3 bg-slate-900/90 text-green-400 hover:bg-slate-800 active:scale-90 transition-all rounded-full shadow-2xl border border-slate-700 z-10"
          title="Centralizar no GPS"
        >
          <Locate className="w-5 h-5" />
        </button>
      </div>

      {/* Bottom Floating Navigation Card (Uber/99 style) */}
      <div className="z-20 bg-slate-900 border-t border-slate-800 p-4 rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.5)] flex flex-col space-y-3.5 absolute bottom-0 left-0 right-0">
        
        {/* Metric Row */}
        <div className="grid grid-cols-3 gap-2.5">
          
          {/* ETA */}
          <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-2.5 flex flex-col items-center justify-center">
            <div className="flex items-center space-x-1 text-green-400 text-[10px] font-extrabold mb-0.5">
              <Clock className="w-3 h-3" />
              <span>ETA CHEGADA</span>
            </div>
            <p className="text-lg font-black text-white">{arrivalTime}</p>
            <p className="text-[10px] text-slate-400 font-semibold">em ~{etaMinutes} min</p>
          </div>

          {/* Distance */}
          <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-2.5 flex flex-col items-center justify-center">
            <div className="flex items-center space-x-1 text-sky-400 text-[10px] font-extrabold mb-0.5">
              <Navigation className="w-3 h-3" />
              <span>DISTÂNCIA</span>
            </div>
            <p className="text-lg font-black text-white">{distanceKm}</p>
            <p className="text-[10px] text-slate-400 font-semibold">km restantes</p>
          </div>

          {/* Speed */}
          <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-2.5 flex flex-col items-center justify-center">
            <div className="flex items-center space-x-1 text-amber-400 text-[10px] font-extrabold mb-0.5">
              <Compass className="w-3 h-3" />
              <span>VELOCIDADE</span>
            </div>
            <p className="text-lg font-black text-white">{speed}</p>
            <p className="text-[10px] text-slate-400 font-semibold">km/h</p>
          </div>

        </div>

        {/* Action buttons */}
        <div className="flex space-x-2">
          <a
            href={googleMapsAppUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-3.5 px-3 rounded-2xl transition-all flex items-center justify-center space-x-1.5 text-xs shrink-0 shadow-lg shadow-blue-600/30"
          >
            <MapIcon className="w-4 h-4" />
            <span>Abrir no Google Maps</span>
          </a>

          <button
            onClick={() => navigate(`/viagem/${viagem.idOS}/execucao`)}
            className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-extrabold py-3.5 px-3 rounded-2xl shadow-lg shadow-green-500/20 active:scale-98 transition-all flex items-center justify-center space-x-1 text-xs"
          >
            <span>CONCLUIR (POD)</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

      </div>

    </div>
  );
};
