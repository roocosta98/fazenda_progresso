import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { ErrorBoundary } from '../common/ErrorBoundary';

export const MainLayout = () => {
  const location = useLocation();

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden relative">
        <Header />
        <main className="flex-1 overflow-y-auto p-6 lg:p-10 bg-slate-50/50 relative">
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
