import { useCallback, useEffect, useState } from 'react';

// O evento "beforeinstallprompt" não tem tipo no lib.dom padrão do TS.
interface EventoInstalarPwa extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function jaInstalado(): boolean {
  if (typeof window === 'undefined') return false;
  const standalone = window.matchMedia?.('(display-mode: standalone)').matches;
  // iOS Safari não tem display-mode: standalone nem beforeinstallprompt, mas expõe navigator.standalone.
  const iosStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  return Boolean(standalone || iosStandalone);
}

// Captura o prompt nativo de instalação (Chrome/Edge) uma única vez pra reusar quando o usuário
// clicar em "Instalar" — o navegador só permite chamar prompt() a partir de um gesto do usuário,
// nunca automaticamente. Em navegadores sem suporte (Safari, Firefox) "podeInstalar" nunca fica
// true, então o botão/aviso simplesmente não aparece — nunca promete uma instalação que não existe.
export function usePwaInstall() {
  const [evento, setEvento] = useState<EventoInstalarPwa | null>(null);
  const [instalado, setInstalado] = useState(jaInstalado);

  useEffect(() => {
    const aoTerPrompt = (e: Event) => {
      e.preventDefault();
      setEvento(e as EventoInstalarPwa);
    };
    const aoInstalar = () => { setInstalado(true); setEvento(null); };
    window.addEventListener('beforeinstallprompt', aoTerPrompt);
    window.addEventListener('appinstalled', aoInstalar);
    return () => {
      window.removeEventListener('beforeinstallprompt', aoTerPrompt);
      window.removeEventListener('appinstalled', aoInstalar);
    };
  }, []);

  const instalar = useCallback(async () => {
    if (!evento) return;
    await evento.prompt();
    await evento.userChoice;
    setEvento(null);
  }, [evento]);

  return { podeInstalar: !instalado && evento !== null, instalado, instalar };
}
