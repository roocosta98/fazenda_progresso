// Filtro "só caminhão" — pedido explícito do Rodrigo: nunca trazer trator (nem qualquer outro
// tipo de equipamento) em NENHUMA tela do sistema. Não é uma flag/checkbox na UI, é hard-coded
// no backend.
//
// PENDENTE DE CONFIRMAÇÃO: não sei o texto exato gravado em TiposEquipamento.Descricao (pode
// ser "Caminhão", "CAMINHÃO TOCO", "Caminhao" etc.) — mesmo risco de adivinhar coluna/valor que
// já deu problema antes com CustosFixosEquipamento. Uso por enquanto um LIKE case/acento-
// insensível que pega qualquer variação de "caminhão" sem precisar acertar a grafia exata. Assim
// que o Rodrigo confirmar o(s) valor(es) reais, trocar só a constante abaixo.
export const FILTRO_TIPO_CAMINHAO_LIKE = '%aminh%';
