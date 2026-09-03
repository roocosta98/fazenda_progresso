import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Truck } from 'lucide-react';

export const Splash: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Simula carregamento e redireciona para login
    const timer = setTimeout(() => {
      // Aqui checaríamos se há sessão. Por ora, mockamos redirecionamento para login.
      navigate('/login', { replace: true });
    }, 2000);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-[#1E3A2F] h-full">
      <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-lg animate-bounce mb-6">
        <Truck className="w-12 h-12 text-[#1E3A2F]" />
      </div>
      <h1 className="text-3xl font-black text-white tracking-wider text-center">
        FAZENDA<br/>PROGRESSO
      </h1>
      <p className="text-[#D4AF37] mt-2 font-bold uppercase tracking-widest text-sm">Logística</p>
    </div>
  );
};
