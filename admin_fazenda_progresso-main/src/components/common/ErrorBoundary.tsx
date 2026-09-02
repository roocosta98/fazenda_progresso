import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  // 'inline': cabe dentro do conteúdo de uma tela (menu/header continuam de pé ao redor).
  // 'fullpage': cobre a raiz do app — usado quando o que quebrou pode estar fora do menu/header
  // (ex: Sidebar, Header, os providers de contexto), então só recarregar a página resolve.
  variant?: 'inline' | 'fullpage';
}

interface ErrorBoundaryState {
  error: Error | null;
}

// Evita que um erro de renderização em qualquer tela derrube a aplicação inteira
// (tela em branco, sem menu, sem nada) — mostra uma mensagem e deixa navegar/recarregar.
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Erro de renderização capturado pelo ErrorBoundary:', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      const fullPage = this.props.variant === 'fullpage';
      return (
        <div className={`flex flex-col items-center justify-center text-center p-8 ${fullPage ? 'h-screen w-screen bg-slate-50' : 'h-full min-h-[400px]'}`}>
          <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="text-rose-500" size={28} />
          </div>
          <h2 className="text-lg font-bold text-slate-800 mb-1">
            {fullPage ? 'O sistema encontrou um erro' : 'Essa tela encontrou um erro'}
          </h2>
          <p className="text-slate-500 text-sm max-w-md mb-6">
            {fullPage
              ? 'Algo deu errado ao carregar o sistema. Recarregue a página pra tentar de novo.'
              : 'Algo deu errado ao carregar essa página. O menu continua funcionando — tente outra tela ou recarregue.'}
          </p>
          <button
            onClick={() => (fullPage ? window.location.reload() : this.setState({ error: null }))}
            className="inline-flex items-center px-5 py-2.5 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors text-sm"
          >
            <RefreshCw size={15} className="mr-2" /> {fullPage ? 'Recarregar página' : 'Tentar de novo'}
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
