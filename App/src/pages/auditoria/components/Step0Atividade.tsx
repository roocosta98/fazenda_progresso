import React from 'react';
import type { TipoAtividadeAuditoria } from '../../../types';
import { Truck, Droplet, User, Package, Sprout, ShieldCheck } from 'lucide-react';

interface Props {
  value: TipoAtividadeAuditoria | null;
  onChange: (value: TipoAtividadeAuditoria) => void;
}

const ATIVIDADES: { label: TipoAtividadeAuditoria; icon: React.ReactNode }[] = [
  { label: 'Transporte de Máquinas', icon: <Truck className="w-6 h-6" /> },
  { label: 'Abastecimento (Comboio)', icon: <Droplet className="w-6 h-6" /> },
  { label: 'Operação de Munck', icon: <Package className="w-6 h-6" /> },
  { label: 'Transporte de Pessoas', icon: <User className="w-6 h-6" /> },
  { label: 'Serviços de Caçamba', icon: <Truck className="w-6 h-6" /> },
  { label: 'Transporte de Batata Consumo', icon: <Package className="w-6 h-6" /> },
  { label: 'Transporte de Sementes', icon: <Sprout className="w-6 h-6" /> },
  { label: 'Transporte de Insumos', icon: <ShieldCheck className="w-6 h-6" /> },
  { label: 'Transporte de Água (Pipa)', icon: <Droplet className="w-6 h-6" /> },
];

export function Step0Atividade({ value, onChange }: Props) {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-xl font-bold text-neutral-800">Selecione a Atividade</h2>
        <p className="text-sm text-neutral-500 mt-1">Qual operação será auditada agora?</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {ATIVIDADES.map((item) => {
          const isSelected = value === item.label;
          return (
            <button
              key={item.label}
              onClick={() => onChange(item.label)}
              className={`
                flex flex-col items-center justify-center p-4 rounded-lg border-2 text-center transition-all duration-200
                ${isSelected 
                  ? 'border-[#1E3A2F] bg-[#1E3A2F]/5 text-[#1E3A2F]' 
                  : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300 hover:bg-neutral-50'
                }
              `}
            >
              <div className={`mb-3 ${isSelected ? 'text-[#1E3A2F]' : 'text-neutral-400'}`}>
                {item.icon}
              </div>
              <span className={`text-sm font-medium ${isSelected ? 'text-[#1E3A2F]' : 'text-neutral-700'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
