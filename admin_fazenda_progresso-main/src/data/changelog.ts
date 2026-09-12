// Changelog exibido no sino de notificações (Header.tsx) — em linguagem simples, sem termos
// técnicos, pra quem usa o sistema no dia a dia. Ordem: mais recente primeiro. Ao adicionar uma
// entrada nova, o sino mostra o indicador de "não lido" de novo automaticamente (compara a data
// mais recente aqui com a última vista, guardada no navegador de cada usuário).
export type EntradaChangelog = { data: string; itens: string[] };

export const CHANGELOG: EntradaChangelog[] = [
  {
    data: '13/09/2026 (acesso facilitado)',
    itens: [
      'Estoque: a lista completa (com todas as tabelas) voltou pro menu, com o nome "Lista completa" — tinha ficado escondida, só acessível clicando num botão pequeno no Dashboard.',
      'Dashboard de Estoque ganhou botões "Lista completa" e "Pergunte à IA" bem visíveis no topo, inclusive no celular.',
      'Botão pra voltar ao Dashboard adicionado na tela de Lista completa.',
    ],
  },
  {
    data: '13/09/2026 (visual v2)',
    itens: [
      'Identidade visual refeita puxando as cores REAIS da Fazenda Progresso (o verde-oliva e o verde-limão do site institucional da empresa) e a fonte usada lá, no lugar do dourado provisório da versão anterior.',
      'Logo e foto da tela de login trocados pelos originais da Fazenda Progresso (Chapada Diamantina/Mucugê-BA) — antes eram imagens genéricas de banco de imagens.',
      'Estoque: corrigida a palavra "venda" onde na verdade é saída de estoque (consumo pra produção, manutenção ou baixa) — a fazenda não vende pelo estoque. Ajustado em "Itens sem movimentação", nos gráficos do Dashboard e no comportamento da IA (busca e insights).',
    ],
  },
  {
    data: '13/09/2026 (visual)',
    itens: [
      'Identidade visual do sistema modernizada: dourado no lugar do verde, tons mais quentes, títulos com fonte serifada, menu lateral redesenhado.',
      'Tela de login com novo visual.',
    ],
  },
  {
    data: '13/09/2026',
    itens: [
      'Dashboard de Estoque virou a porta de entrada única do estoque — o item "Painel de Estoque" saiu do menu.',
      'Todo card e todo gráfico do Dashboard de Estoque agora pode ser clicado pra abrir uma tela cheia com o gráfico completo e a tabela detalhada.',
      'Novos gráficos no Dashboard de Estoque: Ranking de fornecedores (taxa de vitória) e Cotações em aberto por situação.',
    ],
  },
  {
    data: '12/09/2026',
    itens: [
      'Novo: Painel Geral (BI) — uma tela só com um painel de gráficos por módulo (Estoque e Logística já com dados reais). Acesse pelo botão na tela Início ou pelo atalho "Visão Geral (BI)" no menu de qualquer módulo.',
      'Dashboard de Logística ganhou o mesmo cabeçalho (nome do módulo e descrição) que o Dashboard de Estoque já tinha.',
      'Corrigido de vez o número de "Cotações em aberto" no Estoque — estava contando cotações antigas já fechadas há muito tempo.',
      'Clique no card "Cotações em aberto" agora mostra o detalhamento por situação (aberta, fechada, cancelada etc).',
      '"Itens sem movimentação" ganhou um filtro pra mostrar só com estoque ou só sem estoque.',
    ],
  },
  {
    data: '11/09/2026',
    itens: [
      'Novo módulo Fiscal no menu (em construção).',
      'Detalhe do produto no Estoque agora separa Entradas e Saídas, e a data aparece formatada corretamente.',
      'Painéis de Estoque (giro, curva ABC, ruptura, fornecedores, cotações) deixaram de considerar grupos de produto que não fazem parte do controle de almoxarifado (ex.: matéria-prima de beneficiamento, materiais de escritório).',
      'Login persistente — atualizar a página não derruba mais o usuário logado.',
      'Ajustes de responsividade pra celular em várias telas.',
      'Botão "Pergunte à IA" adicionado no Dashboard de Estoque.',
      'Importação de arquivos (PDF, Word, Excel, texto) na Configuração de IA, pra treinar a busca com documentos.',
      'Correções na busca por IA (Estoque e Logística): erros de tabela/consulta que apareciam em algumas perguntas foram corrigidos.',
    ],
  },
  {
    data: '10/09/2026',
    itens: [
      'Busca por IA disponível também em Logística/Frota (antes só existia em Estoque).',
      'Nova tela de Configuração de IA, pra administradores ensinarem a IA com regras de negócio.',
      'Dashboard de Estoque com mais gráficos, paginação e detalhamento por item.',
      'Menu lateral reformulado: some quando não precisa, abre por um botão, e fica melhor no celular.',
      'Ajustes de estabilidade e performance nos painéis de Logística.',
    ],
  },
];
