import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowLeft, CheckCircle2, Circle, ListChecks, CloudOff } from 'lucide-react';
import { db } from '../db/offlineDB';
import { useAuth } from '../context/AuthContext';
import { ITENS_CHECKLIST_ATIVIDADE } from '../config/checklist';

type ItemEstado = { item: string; conforme: boolean; observacao: string };

export const ChecklistAtividade: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { motorista } = useAuth();
  const viagem = useLiveQuery(() => db.viagens.get(id || ''));

  const [itens, setItens] = useState<ItemEstado[]>(
    ITENS_CHECKLIST_ATIVIDADE.map((item) => ({ item, conforme: false, observacao: '' }))
  );
  const [observacaoGeral, setObservacaoGeral] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [concluido, setConcluido] = useState(false);

  const toggleItem = (idx: number) => {
    setItens((atual) => atual.map((it, i) => (i === idx ? { ...it, conforme: !it.conforme } : it)));
  };

  const handleEnviar = async () => {
    if (!motorista || !id) return;
    setEnviando(true);
    try {
      const checklistLocalId = await db.checklists.add({
        viagemId: id,
        motorista,
        respondidoPor: motorista,
        itens: itens.map(({ item, conforme, observacao }) => ({ item, conforme, observacao: observacao || undefined })),
        observacao: observacaoGeral || undefined,
        timestamp: new Date().toISOString(),
        sincronizado: false,
      });

      await db.syncQueue.add({
        type: 'CRIAR_CHECKLIST',
        payload: {
          checklistLocalId,
          viagemId: id,
          motorista,
          respondidoPor: motorista,
          veiculoPlaca: viagem?.veiculoPlaca,
          observacao: observacaoGeral || undefined,
          itens: itens.map(({ item, conforme, observacao }) => ({ item, conforme, observacao: observacao || undefined })),
        },
        timestamp: new Date().toISOString(),
      });

      setConcluido(true);
    } finally {
      setEnviando(false);
    }
  };

  if (concluido) {
    return (
      <div className="flex flex-col h-screen bg-slate-50 items-center justify-center p-6 text-center">
        <CheckCircle2 className="text-emerald-500 w-16 h-16 mb-4" />
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Checklist enviado</h2>
        <p className="text-slate-500 mb-6">
          Guardado no aparelho — se estiver sem conexão agora, sincroniza automático assim que voltar o sinal.
        </p>
        <button
          onClick={() => navigate(-1)}
          className="bg-emerald-600 text-white px-6 py-3.5 rounded-xl font-bold w-full max-w-xs shadow-lg shadow-emerald-500/20"
        >
          Voltar
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <div className="bg-emerald-600 text-white px-4 py-4 shadow-md flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center">
          <button onClick={() => navigate(-1)} className="mr-3 p-1.5 rounded-full hover:bg-emerald-700 active:bg-emerald-800 transition-colors">
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-lg font-bold leading-tight">Checklist de Atividade</h1>
            <p className="text-xs text-emerald-100">{viagem?.veiculoNome ?? 'Veículo'} {viagem?.veiculoPlaca ? `· ${viagem.veiculoPlaca}` : ''}</p>
          </div>
        </div>
        <ListChecks size={22} className="text-emerald-100" />
      </div>

      <div className="flex-1 p-4 space-y-3 pb-10">
        <p className="text-xs text-slate-500 px-1">
          Toque em cada item pra confirmar que está conforme antes de sair. Lista padrão — pode mudar quando a fazenda confirmar os itens oficiais.
        </p>

        {itens.map((it, idx) => (
          <button
            key={it.item}
            type="button"
            onClick={() => toggleItem(idx)}
            className={`w-full text-left bg-white rounded-2xl border p-4 flex items-start gap-3 transition-colors ${
              it.conforme ? 'border-emerald-300 bg-emerald-50/60' : 'border-slate-200'
            }`}
          >
            {it.conforme ? (
              <CheckCircle2 className="text-emerald-600 shrink-0 mt-0.5" size={22} />
            ) : (
              <Circle className="text-slate-300 shrink-0 mt-0.5" size={22} />
            )}
            <span className={`text-sm font-semibold ${it.conforme ? 'text-emerald-800' : 'text-slate-700'}`}>{it.item}</span>
          </button>
        ))}

        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 block">Observações (opcional)</label>
          <textarea
            value={observacaoGeral}
            onChange={(e) => setObservacaoGeral(e.target.value)}
            rows={3}
            placeholder="Alguma coisa fora do padrão pra registrar?"
            className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>

        {!navigator.onLine && (
          <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-3">
            <CloudOff size={16} /> Sem conexão agora — o checklist fica salvo no aparelho e sincroniza sozinho depois.
          </div>
        )}
      </div>

      <div className="sticky bottom-0 w-full p-4 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-[0_-10px_30px_rgba(0,0,0,0.08)] z-30 mt-auto">
        <button
          onClick={handleEnviar}
          disabled={enviando}
          className="w-full max-w-lg mx-auto flex items-center justify-center py-4 rounded-2xl font-black text-base tracking-wide transition-all shadow-lg active:scale-[0.98] bg-emerald-600 text-white shadow-emerald-500/30 disabled:opacity-60"
        >
          {enviando ? 'Enviando...' : 'Concluir checklist'}
        </button>
      </div>
    </div>
  );
};
