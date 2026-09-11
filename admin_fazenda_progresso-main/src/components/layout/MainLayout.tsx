import { useEffect, useRef, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { ErrorBoundary } from '../common/ErrorBoundary';

export const MainLayout = () => {
  const location = useLocation();
  // Menu começa fechado (tela Início "limpa", só com hambúrguer); ao sair da Início pra
  // dentro de um módulo, abre sozinho. Fechar de novo (manual, via hambúrguer, ou o próprio
  // Sidebar fechando no mobile ao tocar num link) fica só a critério do usuário depois disso.
  const [menuAberto, setMenuAberto] = useState(false);
  const rotaAnterior = useRef(location.pathname);

  useEffect(() => {
    if (rotaAnterior.current === '/inicio' && location.pathname !== '/inicio') {
      setMenuAberto(true);
    }
    rotaAnterior.current = location.pathname;
  }, [location.pathname]);

  // Início é a porta de entrada: fica limpa, sem menu lateral nem hambúrguer — o menu só
  // existe a partir do momento que o usuário escolhe um módulo.
  const naTelaInicio = location.pathname === '/inicio';

  return (
    <div className="flex h-screen bg-[#f8fafc] overflow-hidden font-sans">
      {!naTelaInicio && <Sidebar mobileAberto={menuAberto} onFechar={() => setMenuAberto(false)} />}
      <div className="flex-1 flex flex-col overflow-hidden relative min-w-0">
        <Header onAbrirMenu={naTelaInicio ? undefined : () => setMenuAberto(true)} />
        <main className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 lg:p-8 bg-[#f8fafc] relative">
          <div className="max-w-7xl mx-auto w-full h-full">
            {/* key=pathname: trocar de tela sempre recomeça limpo, mesmo se a tela anterior travou */}
            <ErrorBoundary key={location.pathname}>
              <Outlet />
            </ErrorBoundary>
          </div>
        </main>
      </div>
    </div>
  );
};
