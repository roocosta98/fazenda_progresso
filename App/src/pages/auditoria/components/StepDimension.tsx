import type { AuditoriaDimension } from '../../../types';
import { AlertTriangle } from 'lucide-react';

interface Props {
  title: string;
  dimension: string;
  criterios: string[];
  data: AuditoriaDimension;
  onChange: (value: AuditoriaDimension) => void;
}

export function StepDimension({ title, criterios, data, onChange }: Props) {
  const handleChange = (criterio: string, value: number) => {
    onChange({
      ...data,
      [criterio]: value,
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-xl font-bold text-neutral-800">Avaliação: {title}</h2>
        <p className="text-sm text-neutral-500 mt-1">
          Avalie cada critério de 0 a 10. Notas menores que 7 exigem plano de ação.
        </p>
      </div>

      <div className="space-y-4">
        {criterios.map((criterio) => {
          // Default to 10 if not set, or let user set it. We use 10 as starting point 
          // or undefined. We'll treat undefined as "not evaluated yet", but for 
          // simplicity in UI we can default to 10.
          const value = data[criterio] !== undefined ? data[criterio] : 10;
          const isWarning = value < 7;

          return (
            <div 
              key={criterio} 
              className={`p-4 rounded-lg border transition-colors ${
                isWarning ? 'border-orange-200 bg-orange-50' : 'border-neutral-200 bg-white'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-neutral-800">{criterio}</h3>
                  {isWarning && (
                    <div className="flex items-center gap-1 mt-1 text-xs font-medium text-orange-700">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Requer Plano de Ação
                    </div>
                  )}
                </div>
                
                {/* Indicador Numérico */}
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-white border border-neutral-200 shadow-sm shrink-0">
                  <span className={`text-lg font-bold ${
                    isWarning ? 'text-orange-600' : 'text-[#1E3A2F]'
                  }`}>
                    {value}
                  </span>
                </div>
              </div>

              {/* Custom Slider */}
              <div className="relative pt-2 pb-2">
                <input
                  type="range"
                  min="0"
                  max="10"
                  step="1"
                  value={value}
                  onChange={(e) => handleChange(criterio, parseInt(e.target.value, 10))}
                  className="w-full h-2 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-[#1E3A2F]"
                />
                <div className="flex justify-between mt-2 text-xs font-medium text-neutral-400">
                  <span>0 (Péssimo)</span>
                  <span>5 (Regular)</span>
                  <span>10 (Excelente)</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
