import type { AuditoriaData } from '../../../types';
import { SignaturePad } from './SignaturePad';
import { ClipboardCheck, AlertTriangle } from 'lucide-react';

interface Props {
  formData: AuditoriaData;
  onChange: (value: AuditoriaData['conclusao']) => void;
}

export function Step8Conclusao({ formData, onChange }: Props) {
  // Funções de Cálculo
  const calcDimensionScore = (dimension: Record<string, number>, count: number) => {
    const keys = Object.keys(dimension);
    if (keys.length === 0) return 100; // default if skipped
    const sum = keys.reduce((acc, key) => acc + dimension[key], 0);
    // Average 0-10, multiplied by 10 to get 0-100
    return Math.round((sum / count) * 10);
  };

  const calcOtifScore = () => {
    const keys = Object.keys(formData.entregaOTIF);
    if (keys.length === 0) return 100; // default if skipped
    const simCount = keys.filter(k => formData.entregaOTIF[k] === true).length;
    return Math.round((simCount / 7) * 100); // 7 is total criteria in Step7
  };

  const scoreSeg = calcDimensionScore(formData.seguranca, 7);
  const scoreOpe = calcDimensionScore(formData.operacional, 9);
  const scoreVei = calcDimensionScore(formData.veiculo, 9);
  const scoreCom = calcDimensionScore(formData.comportamento, 7);
  const scoreOtif = calcOtifScore();

  // Pesos
  const wSeg = 0.25;
  const wOpe = 0.25;
  const wVei = 0.15;
  const wCom = 0.15;
  const wOtif = 0.20;

  const finalScore = Math.round(
    (scoreSeg * wSeg) +
    (scoreOpe * wOpe) +
    (scoreVei * wVei) +
    (scoreCom * wCom) +
    (scoreOtif * wOtif)
  );

  // Checks for action plans
  const hasActionPlan = () => {
    const checkDim = (dim: Record<string, number>) => Object.values(dim).some(val => val < 7);
    const checkOtif = Object.values(formData.entregaOTIF).some(val => val === false);
    
    return checkDim(formData.seguranca) || 
           checkDim(formData.operacional) || 
           checkDim(formData.veiculo) || 
           checkDim(formData.vias) || 
           checkDim(formData.comportamento) || 
           checkOtif;
  };

  const hasFlags = hasActionPlan();

  const handleObsChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange({ ...formData.conclusao, observacoes: e.target.value });
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-xl font-bold text-neutral-800">Conclusão</h2>
        <p className="text-sm text-neutral-500 mt-1">
          Resumo da avaliação e assinaturas de validação.
        </p>
      </div>

      {/* Card de Score Global */}
      <div className={`p-6 rounded-lg border-2 flex flex-col items-center justify-center text-center transition-colors
        ${finalScore >= 85 ? 'border-green-200 bg-green-50' : finalScore >= 70 ? 'border-yellow-200 bg-yellow-50' : 'border-red-200 bg-red-50'}
      `}>
        <h3 className="text-sm font-semibold text-neutral-600 uppercase tracking-wider mb-2">Nota Global</h3>
        <div className="flex items-baseline gap-1">
          <span className={`text-5xl font-black ${
            finalScore >= 85 ? 'text-green-700' : finalScore >= 70 ? 'text-yellow-700' : 'text-red-700'
          }`}>
            {finalScore}
          </span>
          <span className="text-lg font-medium text-neutral-500">/100</span>
        </div>
      </div>

      {/* Alerta de Plano de Ação */}
      {hasFlags ? (
        <div className="flex items-start gap-3 p-4 bg-orange-50 border border-orange-200 rounded-lg text-orange-800">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-sm">Atenção Necessária</p>
            <p className="text-sm mt-1">Foram identificados critérios com nota abaixo de 7 ou não conformidades no OTIF. Um <strong>Plano de Ação</strong> será gerado automaticamente.</p>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
          <ClipboardCheck className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-sm">Conformidade Total</p>
            <p className="text-sm mt-1">Todos os critérios atenderam aos requisitos operacionais e de segurança.</p>
          </div>
        </div>
      )}

      {/* Barras de Progresso */}
      <div className="space-y-4 bg-white p-4 rounded-lg border border-neutral-200">
        <h3 className="font-medium text-neutral-800 mb-3">Detalhamento</h3>
        
        <ProgressRow label="Segurança (25%)" score={scoreSeg} />
        <ProgressRow label="Operacional (25%)" score={scoreOpe} />
        <ProgressRow label="Veículo (15%)" score={scoreVei} />
        <ProgressRow label="Comportamental (15%)" score={scoreCom} />
        <ProgressRow label="OTIF (20%)" score={scoreOtif} />
      </div>

      {/* Observações */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-neutral-700">Observações Gerais</label>
        <textarea
          rows={3}
          value={formData.conclusao.observacoes}
          onChange={handleObsChange}
          placeholder="Adicione comentários, justificativas ou detalhes adicionais..."
          className="w-full rounded-md border border-neutral-300 p-3 text-sm focus:ring-1 focus:ring-[#1E3A2F] focus:border-[#1E3A2F]"
        />
      </div>

      {/* Assinaturas */}
      <div className="space-y-6 pt-4 border-t border-neutral-200">
        <SignaturePad
          label="Assinatura do Motorista"
          value={formData.conclusao.assinaturaMotorista}
          onChange={(val) => onChange({ ...formData.conclusao, assinaturaMotorista: val })}
        />
        <SignaturePad
          label="Assinatura do Supervisor"
          value={formData.conclusao.assinaturaSupervisor}
          onChange={(val) => onChange({ ...formData.conclusao, assinaturaSupervisor: val })}
        />
      </div>
    </div>
  );
}

// Subcomponente de barra de progresso
function ProgressRow({ label, score }: { label: string, score: number }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-32 text-xs font-medium text-neutral-600 truncate">{label}</div>
      <div className="flex-1 h-2 bg-neutral-100 rounded-full overflow-hidden">
        <div 
          className={`h-full rounded-full transition-all duration-500 ${
            score >= 85 ? 'bg-green-500' : score >= 70 ? 'bg-yellow-500' : 'bg-red-500'
          }`} 
          style={{ width: `${score}%` }}
        />
      </div>
      <div className="w-8 text-right text-xs font-bold text-neutral-700">{score}</div>
    </div>
  );
}
