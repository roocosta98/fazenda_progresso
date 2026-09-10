import { SlideOverDrawer } from '../../../components/common/SlideOverDrawer';

interface NovaSolicitacaoDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const NovaSolicitacaoDrawer = ({
  isOpen,
  onClose,
}: NovaSolicitacaoDrawerProps) => {
  if (!isOpen) return null;

  return (
    <SlideOverDrawer
      isOpen={isOpen}
      onClose={onClose}
      title="Nova Solicitação de Transporte"
    >
      <div className="p-4 space-y-4 text-xs text-slate-300">
        <p className="text-slate-400">Preencha os dados da solicitação de transporte.</p>
        <button
          onClick={onClose}
          className="w-full py-2 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-500 transition-colors"
        >
          Fechar
        </button>
      </div>
    </SlideOverDrawer>
  );
};
