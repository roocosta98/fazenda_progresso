interface Step {
  id: number;
  title: string;
}

interface StepperProps {
  currentStep: number;
  steps: Step[];
}

export function Stepper({ currentStep, steps }: StepperProps) {
  const current = steps[currentStep];
  const progressPercentage = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className="w-full bg-white px-5 py-4 border-b border-neutral-200">
      <div className="flex justify-between items-end mb-3">
        <div>
          <span className="text-[11px] font-extrabold text-[#D4AF37] uppercase tracking-widest block mb-1">
            Etapa {currentStep + 1} de {steps.length}
          </span>
          <h2 className="text-xl font-bold text-[#1E3A2F] leading-none">
            {current.title}
          </h2>
        </div>
        <div className="text-[11px] font-bold text-neutral-400 mb-0.5">
          {Math.round(progressPercentage)}%
        </div>
      </div>
      
      {/* Barra de Progresso */}
      <div className="w-full h-1.5 bg-neutral-100 rounded-full overflow-hidden flex">
        <div 
          className="h-full bg-[#1E3A2F] rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>
    </div>
  );
}
