import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { ErrorBoundary } from '../common/ErrorBoundary';

export const MainLayout = () => {
  const location = useLocation();
  const [menuAberto, setMenuAberto] = useState(false);

  // Fecha o menu mobile automaticamente ao navegar de tela
  useEffect(() => {
    setMenuAberto(false);
  }, [location.pathname]);

  return (
    <div className="flex h-screen bg-[#f8fafc] overflow-hidden font-sans">
      <Sidebar mobileAberto={menuAberto} onFechar={() => setMenuAberto(false)} />
      <div className="flex-1 flex flex-col overflow-hidden relative min-w-0">
        <Header onAbrirMenu={() => setMenuAberto(true)} />
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
