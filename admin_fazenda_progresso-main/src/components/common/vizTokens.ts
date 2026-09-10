// Tokens e formatadores dos gráficos do Admin — sem JSX de propósito, pra o Fast Refresh não
// quebrar (componentes ficam em viz.tsx).
//
// Paleta validada: slots categóricos 1 (azul) e 2 (laranja) passam banda de luminosidade, piso de
// croma, contraste >= 3:1 sobre fundo branco e separação para daltonismo (ΔE CVD 24.7 / visão
// normal 33.6). Status good/critical carregam polaridade (economia x excesso) e vêm SEMPRE com
// rótulo/legenda — nunca só a cor.
export const COR = {
  serie1: '#2a78d6',
  serie2: '#eb6834',
  bom: '#0ca30c',
  critico: '#d03b3b',
  atencao: '#fab219',
  grid: '#e1e0d9',
  eixo: '#c3c2b7',
  tintaMuda: '#898781',
  tintaSecundaria: '#52514e',
} as const;

export const estiloTooltip = {
  backgroundColor: '#ffffff',
  borderRadius: '12px',
  border: `1px solid ${COR.grid}`,
  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
  fontSize: '11px',
} as const;

export const formatMoeda = (valor: number | null | undefined) =>
  valor === null || valor === undefined ? '—' : valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const formatMoedaCurta = (valor: number) =>
  valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact', maximumFractionDigits: 1 });

export const formatMinutos = (minutos: number) => {
  const total = Math.round(minutos);
  if (total < 60) return `${total} min`;
  const horas = Math.floor(total / 60);
  const resto = total % 60;
  return resto === 0 ? `${horas}h` : `${horas}h ${resto}min`;
};

export const formatDiaCurto = (iso: string) => {
  const [ano, mes, dia] = iso.split('T')[0].split('-').map(Number);
  return new Date(ano, mes - 1, dia).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
};

export const hojeISO = () => new Date().toISOString().split('T')[0];

export const diasAtrasISO = (dias: number) => {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  return d.toISOString().split('T')[0];
};

export const primeiroDiaMesISO = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
};

export const somar = <T,>(lista: T[], pegar: (item: T) => number | null | undefined) =>
  lista.reduce((acc, item) => acc + (pegar(item) ?? 0), 0);
