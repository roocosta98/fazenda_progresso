import { useAppContext } from '../../context/AppContext';
import { Truck, Clock, Wifi, WifiOff } from 'lucide-react';
import { DataTable } from '../../components/common/DataTable';
import type { SolicitacaoTransporte } from '../../types';

export const CentralEmExecucao = () => {
  const { solicitacoes } = useAppContext();
  const emExecucao = solicitacoes.filter(s => s.status === 'em_execucao');

  const columns = [
    {
      header: 'ID Chamado',
      accessor: 'numeroOS' as keyof SolicitacaoTransporte,
      render: (row: SolicitacaoTransporte) => (
        <span className="font-bold text-slate-800 bg-slate-100 px-2 py-1 rounded border border-slate-200">{row.numeroOS}</span>
      )
    },
    {
      header: 'Solicitante & Rota',
      render: (row: SolicitacaoTransporte) => (
        <div>
          <div className="font-bold text-slate-800">{row.solicitante.nome}</div>
          <div className="text-xs text-slate-500 mt-1">{row.origem} &rarr; {row.destino}</div>
        </div>
      )
    },
    {
      header: 'Recursos',
      render: (row: SolicitacaoTransporte) => (
        <div>
          <div className="font-bold text-slate-800">{row.motoristaAlocado?.nome}</div>
          <div className="text-xs text-slate-500 flex items-center mt-1">
            <Truck size={12} className="mr-1" /> {row.veiculoAlocado?.modelo} ({row.veiculoAlocado?.placa})
          </div>
        </div>
      )
    },
    {
      header: 'Horário de Saída',
      render: (row: SolicitacaoTransporte) => (
        <div className="flex items-center text-slate-700 font-medium">
          <Clock size={14} className="mr-1.5 text-slate-400" /> 
          {row.dadosExecucao?.dataHoraSaida ? new Date(row.dadosExecucao.dataHoraSaida).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '08:00'}
        </div>
      )
    },
    {
      header: 'Comunicação',
      render: (row: SolicitacaoTransporte) => {
        const status = row.indicadorComunicacao?.status || (Math.random() > 0.8 ? 'alerta' : 'online');
        const time = row.indicadorComunicacao?.ultimaComunicacao || (status === 'alerta' ? 'Há 45 min' : 'Há 2 min');
        
        return (
          <div className="flex items-center">
             {status === 'online' ? (
                <span className="flex items-center text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full w-fit">
                  <Wifi size={12} className="mr-1.5" /> Conectado ({time})
                </span>
             ) : (
                <span className="flex items-center text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 px-2.5 py-1 rounded-full w-fit">
                  <WifiOff size={12} className="mr-1.5" /> Sem sinal ({time})
                </span>
             )}
          </div>
        );
      }
    }
  ];

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Central de Chamados em Execução</h2>
        <p className="text-slate-500 mt-1">Acompanhe as viagens ativas e o status de comunicação da frota.</p>
      </div>

      <div className="bg-white p-2 rounded-2xl shadow-soft border border-slate-200/80">
        <DataTable 
          columns={columns} 
          data={emExecucao} 
          keyExtractor={(row) => row.id}
          emptyMessage="Nenhuma viagem em execução no momento."
        />
      </div>
    </div>
  );
};
