import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, ClipboardCheck, Calendar, MapPin, Truck, ChevronRight } from 'lucide-react';

const MOCK_AUDITORIAS = [
  {
    id: 1,
    data: '2023-09-02',
    veiculo: 'Volvo FMX 500',
    motorista: 'João Silva',
    fazenda: 'Fazenda Rio Verde',
    status: 'concluido',
    pontuacao: 95,
  },
  {
    id: 2,
    data: '2023-09-01',
    veiculo: 'MB Atego 2429',
    motorista: 'Pedro Santos',
    fazenda: 'Fazenda Boa Esperança',
    status: 'concluido',
    pontuacao: 82,
  },
  {
    id: 3,
    data: '2023-08-28',
    veiculo: 'VW 32.380',
    motorista: 'Tiago Oliveira',
    fazenda: 'Fazenda Progresso',
    status: 'alerta',
    pontuacao: 65,
  },
];

export function ListaAuditorias() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredAuditorias = MOCK_AUDITORIAS.filter((a) =>
    a.veiculo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.motorista.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.fazenda.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col min-h-screen bg-[#F8F9FA] pb-24">
      {/* Header Fixo */}
      <header className="sticky top-0 z-50 bg-[#1E3A2F] text-white p-4 shadow-md">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
              <ClipboardCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Auditorias</h1>
              <p className="text-sm text-[#D4AF37] font-medium">Vistorias Realizadas</p>
            </div>
          </div>
        </div>

        {/* Barra de Pesquisa */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por veículo, motorista..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white/10 border border-white/20 text-white placeholder-slate-300 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37] transition-all"
          />
        </div>
      </header>

      {/* Lista de Auditorias */}
      <main className="flex-1 p-4 space-y-4 max-w-4xl mx-auto w-full">
        {filteredAuditorias.length > 0 ? (
          filteredAuditorias.map((auditoria) => (
            <div
              key={auditoria.id}
              className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/60 active:scale-[0.98] transition-transform"
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-bold text-slate-800 text-base">{auditoria.veiculo}</h3>
                  <p className="text-sm text-slate-500">{auditoria.motorista}</p>
                </div>
                <div className={`px-2.5 py-1 rounded-lg text-xs font-bold ${auditoria.pontuacao >= 80 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                  {auditoria.pontuacao}%
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-slate-100">
                <div className="flex items-center gap-1.5 text-xs text-slate-600">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>
                    {new Date(auditoria.data).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: 'short',
                    })}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-600 truncate">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{auditoria.fazenda}</span>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center text-slate-500 py-10">
            Nenhuma auditoria encontrada.
          </div>
        )}
      </main>

      {/* FAB: Nova Auditoria */}
      <button
        onClick={() => navigate('/auditoria/nova')}
        className="fixed bottom-6 right-[max(1.25rem,calc((100vw-430px)/2+1.25rem))] w-14 h-14 bg-[#D4AF37] text-[#1E3A2F] rounded-2xl flex items-center justify-center shadow-lg hover:bg-[#b08d29] hover:scale-105 active:scale-95 transition-all z-40"
      >
        <Plus className="w-6 h-6" />
      </button>
    </div>
  );
}
