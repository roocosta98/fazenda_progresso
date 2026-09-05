import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [motoristas, setMotoristas] = useState<string[]>([]);
  const [selecionado, setSelecionado] = useState('');
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    api
      .listarMotoristas()
      .then((nomes) => {
        setMotoristas(nomes);
        setErro(null);
      })
      .catch((error) => {
        console.error('Erro ao buscar motoristas:', error);
        setErro('Não foi possível conectar ao banco de dados da fazenda. Verifique sua conexão e tente novamente.');
      })
      .finally(() => setLoading(false));
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selecionado) return;
    login(selecionado);
    navigate('/viagens', { replace: true });
  };

  return (
    <div className="flex-1 flex flex-col h-full relative overflow-hidden bg-gray-900">
      <div
        className="absolute inset-0 bg-cover bg-center z-0 scale-105"
        style={{ backgroundImage: "url('https://images.unsplash.com/photo-1586771107445-d3ca888129ff?auto=format&fit=crop&q=80&w=1000')" }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-[#1E3A2F]/80 to-gray-900/95"></div>
      </div>

      <div className="relative z-10 flex-1 flex flex-col justify-end px-6 pb-10 pt-16">
        <div className="mb-auto flex flex-col items-center mt-6">
          <img src="/logo.png" alt="Fazenda Progresso" className="w-28 h-28 object-contain mb-5 drop-shadow-2xl" />
          <h1 className="text-[28px] font-black text-white tracking-tight text-center drop-shadow-lg leading-tight">
            FAZENDA<br />PROGRESSO
          </h1>
          <p className="text-[#D4AF37] text-xs font-bold uppercase tracking-[0.3em] mt-3 drop-shadow-md">
            Portal do Motorista
          </p>
        </div>

        <div className="bg-white/95 backdrop-blur-2xl rounded-[32px] p-7 shadow-2xl border border-white/50 translate-y-0 opacity-100 transition-all duration-700">
          <h2 className="text-xl font-extrabold text-gray-800 mb-2 text-center">Acesse</h2>
          <p className="text-xs text-gray-500 text-center mb-6">Selecione seu nome na lista de motoristas cadastrados</p>

          {erro && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl p-3 text-xs mb-4">{erro}</div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-gray-400" />
              </div>
              <select
                className="w-full bg-gray-100/80 border border-gray-200 text-gray-900 rounded-2xl pl-11 pr-4 py-4 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all font-bold appearance-none disabled:opacity-50"
                value={selecionado}
                onChange={(e) => setSelecionado(e.target.value)}
                disabled={loading || motoristas.length === 0}
                required
              >
                <option value="" disabled>
                  {loading ? 'Carregando motoristas...' : 'Selecione seu nome'}
                </option>
                {motoristas.map((nome) => (
                  <option key={nome} value={nome}>{nome}</option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={!selecionado}
              className="w-full bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 active:scale-[0.98] text-white rounded-2xl py-4 font-black text-[15px] tracking-wide mt-2 transition-all shadow-lg shadow-green-500/30 uppercase disabled:opacity-50 disabled:pointer-events-none"
            >
              Entrar
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
