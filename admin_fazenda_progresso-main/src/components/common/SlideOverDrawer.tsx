import { useState, type ReactNode } from 'react';
import { Maximize2, Minimize2, X } from 'lucide-react';

interface SlideOverDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  width?: string;
  hideDefaultHeader?: boolean;
  noPadding?: boolean;
  // Mostra um botão de expandir no cabeçalho: alterna entre o painel lateral estreito e a mesma
  // sobreposição ocupando a tela toda — continua sendo um popup (mesmo fundo escurecido, fecha do
  // mesmo jeito), só muda a largura. Fora isso o comportamento é idêntico ao já usado em outras telas.
  expansivel?: boolean;
}

export const SlideOverDrawer = ({
  isOpen,
  onClose,
  title,
  children,
  width = 'max-w-md',
  hideDefaultHeader = false,
  noPadding = false,
  expansivel = false,
}: SlideOverDrawerProps) => {
  const [expandido, setExpandido] = useState(false);
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" aria-labelledby="slide-over-title" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={onClose} aria-hidden="true"></div>
      <div className={`fixed inset-y-0 right-0 flex ${expandido ? 'left-0' : 'pl-10 max-w-full'}`}>
        <div className={`pointer-events-auto w-screen ${expandido ? '' : width} animate-slide-in-right`}>
          <div className="flex h-full flex-col overflow-y-scroll bg-white shadow-2xl">
            {!hideDefaultHeader && (
              <div className="px-6 py-5 sm:px-6 bg-slate-900 text-white flex items-center justify-between sticky top-0 z-10">
                <h2 className="text-lg font-bold tracking-wide" id="slide-over-title">
                  {title}
                </h2>
                <div className="flex items-center gap-1.5">
                  {expansivel && (
                    <button
                      type="button"
                      className="rounded-md bg-white/10 text-slate-300 hover:text-white hover:bg-white/20 p-2 focus:outline-none focus:ring-2 focus:ring-white transition-all"
                      onClick={() => setExpandido((v) => !v)}
                    >
                      <span className="sr-only">{expandido ? 'Encolher painel' : 'Expandir painel'}</span>
                      {expandido ? <Minimize2 className="h-5 w-5" aria-hidden="true" /> : <Maximize2 className="h-5 w-5" aria-hidden="true" />}
                    </button>
                  )}
                  <button
                    type="button"
                    className="rounded-md bg-white/10 text-slate-300 hover:text-white hover:bg-white/20 p-2 focus:outline-none focus:ring-2 focus:ring-white transition-all"
                    onClick={onClose}
                  >
                    <span className="sr-only">Fechar painel</span>
                    <X className="h-5 w-5" aria-hidden="true" />
                  </button>
                </div>
              </div>
            )}
            <div className={`relative flex-1 bg-white ${noPadding ? '' : 'px-4 py-6 sm:px-6'}`}>
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
