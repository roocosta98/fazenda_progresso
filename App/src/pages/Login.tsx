import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Truck, Key, User } from 'lucide-react';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const [matricula, setMatricula] = useState('');
  const [senha, setSenha] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (matricula && senha) {
      navigate('/viagens', { replace: true });
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full relative overflow-hidden bg-gray-900">
      {/* Imagem de Fundo (Agricultura) */}
      <div 
        className="absolute inset-0 bg-cover bg-center z-0 scale-105"
        style={{ backgroundImage: "url('https://images.unsplash.com/photo-1586771107445-d3ca888129ff?auto=format&fit=crop&q=80&w=1000')" }}
      >
        {/* Degradê escurecendo de cima para baixo e misturando verde esmeralda */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-emerald-900/60 to-gray-900/95"></div>
      </div>

      <div className="relative z-10 flex-1 flex flex-col justify-end px-6 pb-10 pt-16">
        
        {/* Topo / Marca com Glassmorphism */}
        <div className="mb-auto flex flex-col items-center mt-6">
          <div className="w-24 h-24 bg-white/10 backdrop-blur-lg rounded-3xl flex items-center justify-center mb-5 border border-white/20 shadow-2xl">
            <Truck className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-[28px] font-black text-white tracking-tight text-center drop-shadow-lg leading-tight">
            FAZENDA<br/>PROGRESSO
          </h1>
          <p className="text-emerald-300 text-xs font-bold uppercase tracking-[0.3em] mt-3 drop-shadow-md">
            Portal do Motorista
          </p>
        </div>

        {/* Cartão de Login (Design Premium) */}
        <div className="bg-white/95 backdrop-blur-2xl rounded-[32px] p-7 shadow-2xl border border-white/50 translate-y-0 opacity-100 transition-all duration-700">
          <h2 className="text-xl font-extrabold text-gray-800 mb-6 text-center">Acesse sua conta</h2>
          
          <form onSubmit={handleLogin} className="space-y-4">
            
            {/* Input Matrícula */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-gray-400" />
              </div>
              <input 
                type="text" 
                className="w-full bg-gray-100/80 border border-gray-200 text-gray-900 rounded-2xl pl-11 pr-4 py-4 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all font-bold placeholder:text-gray-400 placeholder:font-medium"
                placeholder="Matrícula ou CPF"
                value={matricula}
                onChange={(e) => setMatricula(e.target.value)}
                required
              />
            </div>
            
            {/* Input Senha */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Key className="h-5 w-5 text-gray-400" />
              </div>
              <input 
                type="password" 
                className="w-full bg-gray-100/80 border border-gray-200 text-gray-900 rounded-2xl pl-11 pr-4 py-4 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all font-bold placeholder:text-gray-400 placeholder:font-medium"
                placeholder="Sua senha"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                required
              />
            </div>

            <button 
              type="submit" 
              className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 active:scale-[0.98] text-white rounded-2xl py-4 font-black text-[15px] tracking-wide mt-2 transition-all shadow-lg shadow-emerald-500/30 uppercase"
            >
              Entrar
            </button>
          </form>
          
          <div className="mt-6 text-center">
            <button className="text-[13px] text-emerald-700 font-extrabold hover:text-emerald-800 transition-colors">
              ESQUECEU A SENHA?
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
