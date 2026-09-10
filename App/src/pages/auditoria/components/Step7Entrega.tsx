import type { AuditoriaOTIF } from '../../../types';
import { CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';

interface Props {
  data: AuditoriaOTIF;
  onChange: (value: AuditoriaOTIF) => void;
}

const CRITERIOS_OTIF = [
  { id: 'horario', label: 'Cumprimento do horário de carregamento' },
  { id: 'janela', label: 'Cumprimento da janela de entrega/descarga' },
  { id: 'ciclo', label: 'Tempo de ciclo/permanência dentro do previsto' },
  { id: 'comunicacao', label: 'Comunicação prévia em caso de atraso' },
  { id: 'quantidade', label: 'Quantidade entregue conforme solicitado (sem faltas)' },
  { id: 'integridade', label: 'Integridade da carga (sem avarias ou perdas)' },
  { id: 'destino', label: 'Destino/local correto' },
];

export function Step7Entrega({ data, onChange }: Props) {
  const handleChange = (id: string, value: boolean) => {
    onChange({
      ...data,
      [id]: value,
    });
  };

  // Cálculo da porcentagem atual
  const total = CRITERIOS_OTIF.length;
  const respondidos = CRITERIOS_OTIF.filter(c => data[c.id] !== undefined).length;
  const simCount = CRITERIOS_OTIF.filter(c => data[c.id] === true).length;
  
  const porcentagem = respondidos > 0 ? Math.round((simCount / total) * 100) : 0;
  const isAbaixoMeta = porcentagem < 85 && respondidos === total;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-xl font-bold text-neutral-800">Entrega (OTIF)</h2>
        <p className="text-sm text-neutral-500 mt-1">
          Avalie os critérios de On Time In Full (No Prazo e Completo).
        </p>
      </div>

      {/* Card de Meta OTIF */}
      <div className="bg-white border border-neutral-200 rounded-lg p-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-neutral-600">Aderência OTIF</h3>
          <p className="text-xs text-neutral-500 mt-0.5">Meta: 85%</p>
        </div>
        <div className="text-right">
          <span className={`text-2xl font-bold ${
            respondidos === 0 ? 'text-neutral-400' 
            : isAbaixoMeta ? 'text-orange-600' : 'text-green-600'
          }`}>
            {porcentagem}%
          </span>
          {isAbaixoMeta && (
            <div className="flex items-center gap-1 text-xs text-orange-600 mt-1">
              <AlertTriangle className="w-3 h-3" /> Abaixo da meta
            </div>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {CRITERIOS_OTIF.map((criterio) => {
          const value = data[criterio.id];
          
          return (
            <div 
              key={criterio.id} 
              className={`p-4 rounded-lg border transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4
                ${value === false ? 'border-orange-200 bg-orange-50' : 'border-neutral-200 bg-white'}
              `}
            >
              <div className="flex-1">
                <h3 className="text-sm font-medium text-neutral-800">{criterio.label}</h3>
              </div>
              
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleChange(criterio.id, true)}
                  className={`
                    flex items-center gap-1.5 px-3 py-2 rounded-md border text-sm font-medium transition-colors
                    ${value === true 
                      ? 'bg-green-50 border-green-200 text-green-700' 
                      : 'bg-white border-neutral-200 text-neutral-500 hover:bg-neutral-50'
                    }
                  `}
                >
                  <CheckCircle2 className={`w-4 h-4 ${value === true ? 'text-green-600' : ''}`} />
                  Sim
                </button>
                <button
                  type="button"
                  onClick={() => handleChange(criterio.id, false)}
                  className={`
                    flex items-center gap-1.5 px-3 py-2 rounded-md border text-sm font-medium transition-colors
                    ${value === false 
                      ? 'bg-red-50 border-red-200 text-red-700' 
                      : 'bg-white border-neutral-200 text-neutral-500 hover:bg-neutral-50'
                    }
                  `}
                >
                  <XCircle className={`w-4 h-4 ${value === false ? 'text-red-600' : ''}`} />
                  Não
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
