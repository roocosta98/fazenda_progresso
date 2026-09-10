import { SlideOverDrawer } from '../../../components/common/SlideOverDrawer';
import type { SolicitacaoTransporte } from '../../../types';

interface AprovarSolicitacaoDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  solicitacao: SolicitacaoTransporte | null;
  onSuccess?: (message: string) => void;
}

export const AprovarSolicitacaoDrawer = ({
  isOpen,
  onClose,
  solicitacao,
}: AprovarSolicitacaoDrawerProps) => {
  if (!isOpen || !solicitacao) return null;

  return (
    <SlideOverDrawer
      isOpen={isOpen}
      onClose={onClose}
      title={`Aprovar Solicitação: ${solicitacao.numeroOS}`}
    >
      <div className="p-4 space-y-4 text-xs text-slate-300">
        <div>
          <p className="font-bold text-white text-sm">{solicitacao.tipoServico}</p>
          <p className="text-slate-400">Solicitante: {solicitacao.solicitante?.nome}</p>
        </div>
        <div className="bg-[#152a20] p-3 rounded-xl border border-[#234332] space-y-1">
          <p><strong>Origem:</strong> {solicitacao.origem}</p>
          <p><strong>Destino:</strong> {solicitacao.destino}</p>
          <p><strong>Data:</strong> {solicitacao.dataProgramada || solicitacao.dataSolicitacao}</p>
        </div>
        {solicitacao.observacoes && (
          <p className="italic text-slate-400">"{solicitacao.observacoes}"</p>
        )}
      </div>
    </SlideOverDrawer>
  );
};
