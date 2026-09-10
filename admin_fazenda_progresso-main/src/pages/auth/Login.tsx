import { useAuth } from '../../context/AuthContext';
import { Navigate } from 'react-router-dom';
import { useState } from 'react';
import { Leaf, ArrowRight, Lock, Mail } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL ?? '';

export const Login = () => {
  const { usuario, loginUsuario } = useAuth();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);

  if (usuario) {
    return <Navigate to={usuario.perfil === 'solicitante' ? '/solicitante/minhas' : '/logistica/dashboard'} replace />;
  }

  const handleFakeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    try {
      const resposta = await fetch(`${API_URL}/api/administracao/usuarios`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ acao: 'login', email, senha }) });
      const corpo = await resposta.json();
      if (!resposta.ok) throw new Error(corpo.error ?? 'Não foi possível entrar.');
      loginUsuario(corpo);
    } catch (falha) { setErro(falha instanceof Error ? falha.message : 'Não foi possível entrar.'); }
  };

  return (
    <div className="min-h-screen flex w-full bg-white">
      {/* Left Side - Image Background */}
      <div className="hidden lg:flex w-1/2 relative">
        <img 
          src="/login-bg.png" 
          alt="Fazenda Progresso" 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-agro-950/90 via-agro-900/40 to-transparent flex flex-col justify-end p-16">
          <div className="flex items-center gap-3 mb-6 animate-fade-in-up">
            <div className="p-3 bg-green-500/20 backdrop-blur-md rounded-xl border border-green-500/30 shadow-sm">
              <Leaf className="w-10 h-10 text-green-400" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold tracking-widest text-green-400 uppercase">AgroTech</span>
              <h1 className="text-4xl font-black tracking-tight text-white leading-none drop-shadow-sm mt-1">
                FAZENDA<span className="text-green-400">PROGRESSO</span>
              </h1>
            </div>
          </div>
          <p className="text-agro-50 text-xl max-w-lg font-light leading-relaxed animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            Plataforma integrada para gestão de requisições e logística agropecuária.
          </p>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-8 sm:p-12 lg:p-24 bg-slate-50">
        <div className="w-full max-w-md animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          
          <div className="flex items-center gap-3 mb-12 lg:hidden">
            <div className="p-2 bg-green-500/10 rounded-xl border border-green-500/20 shadow-sm">
              <Leaf className="w-8 h-8 text-green-600" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold tracking-widest text-green-600 uppercase">AgroTech</span>
              <h1 className="text-2xl font-black tracking-tight text-slate-800 leading-none mt-0.5">
                FAZENDA<span className="text-green-600">PROGRESSO</span>
              </h1>
            </div>
          </div>

          <div className="mb-10 text-center lg:text-left">
            <h2 className="text-3xl font-bold text-slate-900 mb-2">Bem-vindo de volta</h2>
            <p className="text-slate-500">Insira suas credenciais para acessar o sistema.</p>
          </div>

          <form onSubmit={handleFakeSubmit} className="space-y-5 mb-10">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 ml-1">E-mail</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-400" />
                </div>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all outline-none bg-white shadow-sm"
                />
              </div>
            </div>
            
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 ml-1">Senha</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input 
                  type="password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all outline-none bg-white shadow-sm"
                />
              </div>
            </div>
            
            {erro && (
              <p className="text-sm text-rose-600 font-medium -mt-2">{erro}</p>
            )}

            <div className="flex items-center justify-between pt-2">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-brand-primary focus:ring-brand-primary cursor-pointer" />
                <span className="text-sm text-slate-600 group-hover:text-slate-800 transition-colors">Lembrar-me</span>
              </label>
              <a href="#" className="text-sm font-medium text-brand-primary hover:text-brand-secondary transition-colors">Esqueceu a senha?</a>
            </div>

            <button
              type="submit"
              className="w-full bg-brand-primary text-white py-3.5 rounded-xl font-medium hover:bg-brand-secondary active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-2 shadow-soft hover:shadow-md"
            >
              Entrar na plataforma
              <ArrowRight className="w-5 h-5" />
            </button>
          </form>

          <p className="text-xs text-slate-400 text-center">Use o e-mail e a senha cadastrados pelo administrador.</p>

        </div>
      </div>
    </div>
  );
};
