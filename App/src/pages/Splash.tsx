import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';


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
      <img src="/logo.png" alt="Fazenda Progresso" className="w-32 h-32 object-contain animate-bounce mb-6 drop-shadow-xl" />
      <h1 className="text-3xl font-black text-white tracking-wider text-center">
        FAZENDA<br/>PROGRESSO
      </h1>
      <p className="text-[#D4AF37] mt-2 font-bold uppercase tracking-widest text-sm">Logística</p>
    </div>
  );
};
