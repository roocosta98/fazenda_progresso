import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import type { AuditoriaData } from '../../types';

import { Stepper } from './components/Stepper';
import { Step0Atividade } from './components/Step0Atividade';
import { Step1Dados } from './components/Step1Dados';
import { StepDimension } from './components/StepDimension';
import { Step7Entrega } from './components/Step7Entrega';
import { Step8Conclusao } from './components/Step8Conclusao';

const initialData: AuditoriaData = {
  atividade: null,
  dadosAuditoria: {
    data: new Date().toISOString().split('T')[0],
    hora: new Date().toTimeString().split(' ')[0].substring(0, 5),
    fazenda: '',
    localTalhao: '',
    motorista: '',
    veiculo: '',
    supervisor: '',
    kmInicial: '',
    kmFinal: '',
    horimetro: '',
    geolocation: null,
  },
  seguranca: {},
  operacional: {},
  veiculo: {},
  vias: {},
  comportamento: {},
  entregaOTIF: {},
  conclusao: {
    observacoes: '',
    assinaturaMotorista: null,
    assinaturaSupervisor: null,
  },
};

const STEPS = [
  { id: 0, title: 'Atividade' },
  { id: 1, title: 'Dados' },
  { id: 2, title: 'Segurança' },
  { id: 3, title: 'Operacional' },
  { id: 4, title: 'Veículo' },
  { id: 5, title: 'Vias' },
  { id: 6, title: 'Comportamental' },
  { id: 7, title: 'Entrega' },
  { id: 8, title: 'Conclusão' }
];

export function NovaAuditoria() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<AuditoriaData>(initialData);

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
      window.scrollTo(0, 0);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
      window.scrollTo(0, 0);
    }
  };

  const handleCancel = () => {
    if (window.confirm('Tem certeza que deseja cancelar? Todos os dados não salvos serão perdidos.')) {
      navigate(-1); // Volta para a tela anterior
    }
  };

  const handleSave = () => {
    console.log('Salvando auditoria...', formData);
    // Aqui virá a integração com IndexedDB/Dexie futuramente
    alert('Auditoria salva com sucesso!');
    navigate('/viagens'); // Redireciona para viagens por enquanto
  };

  const updateFormData = (key: keyof AuditoriaData, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const isNextDisabled = () => {
    if (currentStep === 0 && !formData.atividade) return true;
    if (currentStep === 1) {
      const { data, fazenda, motorista, veiculo, supervisor } = formData.dadosAuditoria;
      if (!data || !fazenda || !motorista || !veiculo || !supervisor) return true;
    }
    return false;
  };

  return (
    <div className="flex flex-col min-h-screen bg-neutral-50 pb-20">
      {/* Header Fixo */}
      <header className="sticky top-0 z-50 bg-white border-b border-neutral-200 shadow-sm flex items-center justify-between p-4">
        <h1 className="text-lg font-semibold text-neutral-800">Nova Auditoria</h1>
        <button
          onClick={handleCancel}
          className="text-neutral-500 hover:text-red-600 transition-colors flex items-center gap-1 text-sm font-medium"
        >
          <X className="w-4 h-4" /> Cancelar
        </button>
      </header>

      {/* Stepper */}
      <div className="bg-white border-b border-neutral-200">
        <Stepper currentStep={currentStep} steps={STEPS} />
      </div>

      {/* Main Content Area */}
      <main className="flex-1 p-4 lg:p-6 max-w-4xl w-full mx-auto">
        {currentStep === 0 && (
          <Step0Atividade
            value={formData.atividade}
            onChange={(val) => updateFormData('atividade', val)}
          />
        )}
        {currentStep === 1 && (
          <Step1Dados
            data={formData.dadosAuditoria}
            onChange={(val) => updateFormData('dadosAuditoria', val)}
          />
        )}
        {currentStep === 2 && (
          <StepDimension
            title="Segurança"
            dimension="seguranca"
            criterios={[
              'Uso correto de EPIs', 'Uniforme completo', 'Comportamento seguro', 
              'Atenção aos riscos', 'Cumprimento de procedimentos', 
              'Não uso de celular ao dirigir', 'Respeito às normas'
            ]}
            data={formData.seguranca}
            onChange={(val) => updateFormData('seguranca', val)}
          />
        )}
        {currentStep === 3 && (
          <StepDimension
            title="Operacional"
            dimension="operacional"
            criterios={[
              'Amarração da carga', 'Quantidade de cintas', 'Estado das cintas', 
              'Travamento da máquina', 'Sinalização', 'Distribuição do peso', 
              'Condução', 'Velocidade', 'Conhecimento do procedimento'
            ]}
            data={formData.operacional}
            onChange={(val) => updateFormData('operacional', val)}
          />
        )}
        {currentStep === 4 && (
          <StepDimension
            title="Veículo"
            dimension="veiculo"
            criterios={[
              'Pneus', 'Iluminação', 'Freios', 'Limpeza', 'Vazamentos', 
              'Extintor', 'Tacógrafo', 'Cintos', 'Retrovisores'
            ]}
            data={formData.veiculo}
            onChange={(val) => updateFormData('veiculo', val)}
          />
        )}
        {currentStep === 5 && (
          <StepDimension
            title="Vias"
            dimension="vias"
            criterios={[
              'Buracos', 'Lama', 'Poeira', 'Sinalização', 
              'Acessibilidade', 'Pontes', 'Condições climáticas'
            ]}
            data={formData.vias}
            onChange={(val) => updateFormData('vias', val)}
          />
        )}
        {currentStep === 6 && (
          <StepDimension
            title="Comportamental"
            dimension="comportamento"
            criterios={[
              'Postura profissional', 'Comunicação', 'Organização', 
              'Responsabilidade', 'Atenção', 'Conhecimento operacional', 
              'Cumprimento das orientações'
            ]}
            data={formData.comportamento}
            onChange={(val) => updateFormData('comportamento', val)}
          />
        )}
        {currentStep === 7 && (
          <Step7Entrega
            data={formData.entregaOTIF}
            onChange={(val) => updateFormData('entregaOTIF', val)}
          />
        )}
        {currentStep === 8 && (
          <Step8Conclusao
            formData={formData}
            onChange={(val) => updateFormData('conclusao', val)}
          />
        )}
      </main>

      {/* Footer Fixo de Navegação */}
      <footer className="fixed bottom-0 w-full bg-white border-t border-neutral-200 p-4 pb-[env(safe-area-inset-bottom)] z-50">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <button
            onClick={handleBack}
            disabled={currentStep === 0}
            className="flex-1 max-w-xs flex items-center justify-center gap-2 px-4 py-3 rounded-md border border-neutral-300 text-neutral-700 bg-white hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            Voltar
          </button>

          {currentStep < STEPS.length - 1 ? (
            <button
              onClick={handleNext}
              disabled={isNextDisabled()}
              className="flex-1 max-w-xs flex items-center justify-center gap-2 px-4 py-3 rounded-md bg-[#1E3A2F] text-white hover:bg-[#2D5A46] disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
            >
              Próximo
              <ChevronRight className="w-5 h-5" />
            </button>
          ) : (
            <button
              onClick={handleSave}
              className="flex-1 max-w-xs flex items-center justify-center gap-2 px-4 py-3 rounded-md bg-[#1E3A2F] text-white hover:bg-[#2D5A46] font-medium transition-colors"
            >
              Concluir e Salvar
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}
