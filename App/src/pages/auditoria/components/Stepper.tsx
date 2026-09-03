import { useEffect, useRef } from 'react';
import { Check } from 'lucide-react';

interface Step {
  id: number;
  title: string;
}

interface StepperProps {
  currentStep: number;
  steps: Step[];
}

export function Stepper({ currentStep, steps }: StepperProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to current step on mobile
  useEffect(() => {
    if (scrollRef.current) {
      const activeElement = scrollRef.current.children[currentStep] as HTMLElement;
      if (activeElement) {
        activeElement.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center',
        });
      }
    }
  }, [currentStep]);

  return (
    <div className="w-full overflow-x-auto no-scrollbar border-b border-neutral-200">
      <div 
        ref={scrollRef}
        className="flex items-center min-w-max px-4 py-3 gap-2"
      >
        {steps.map((step, index) => {
          const isCompleted = currentStep > index;
          const isCurrent = currentStep === index;
          const isPending = currentStep < index;

          return (
            <div key={step.id} className="flex items-center">
              {/* Node */}
              <div
                className={`
                  flex items-center justify-center whitespace-nowrap px-3 py-1.5 rounded-full text-sm font-medium transition-colors
                  ${isCompleted ? 'bg-green-100 text-green-700 border border-green-200' : ''}
                  ${isCurrent ? 'bg-[#1E3A2F] text-white shadow-sm' : ''}
                  ${isPending ? 'bg-neutral-100 text-neutral-400' : ''}
                `}
              >
                {isCompleted && <Check className="w-4 h-4 mr-1.5" />}
                {step.title}
              </div>

              {/* Line connector */}
              {index < steps.length - 1 && (
                <div 
                  className={`w-6 h-px mx-1 
                    ${isCompleted ? 'bg-green-300' : 'bg-neutral-200'}
                  `}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
