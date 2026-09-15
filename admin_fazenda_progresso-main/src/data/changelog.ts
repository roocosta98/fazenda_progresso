// Changelog exibido no sino de notificações (Header.tsx) — em linguagem simples, sem termos
// técnicos, pra quem usa o sistema no dia a dia. Ordem: mais recente primeiro. Ao adicionar uma
// entrada nova, o sino mostra o indicador de "não lido" de novo automaticamente (compara a
// entrada mais recente aqui com a última vista, guardada no navegador de cada usuário).
// "hora" é o horário local da fazenda (Bahia, UTC-3) do deploy — só preenchido quando o horário
// real é conhecido (a partir de 12/09/2026); antes disso, entradas só têm a data.
export type EntradaChangelog = { data: string; hora?: string; itens: string[] };

export const CHANGELOG: EntradaChangelog[] = [
  {
    data: '15/09/2026',
    hora: '13:06:09',
    itens: [
      'Corrigido: a tela de Treinamento de IA estava dando erro "Invalid column name \'ChaveQuery\'" pra quem ainda não rodou a migração mais recente no banco — agora funciona normalmente com ou sem a coluna (só a "Query SQL executável" fica indisponível até a migração rodar).',
      'Ajustado o filtro de período: os botões de preset (Últimos N dias, Mês atual etc.) saíram das telas de Estoque e Logística — elas voltam a mostrar só "De"/"Até", como antes. A escolha de qual período usar como padrão inicial desses filtros continua em Configurações Gerais > Padrões do Sistema, agora com opção de Últimos N dias, Mês atual, Trimestre atual ou Ano atual.',
    ],
  },
  {
    data: '15/09/2026',
    hora: '12:45:44',
    itens: [
      'Treinamento de IA ganhou um 4º tipo de entrada: "Query SQL executável" — permite substituir, de verdade, a query que uma tela do sistema roda, sem precisar mexer em código. Por enquanto só a Análise de Fornecedores (Estoque) está conectada a esse mecanismo (chave "estoque.fornecedores", já com um modelo pronto pra usar). Só SELECT/WITH é aceito; qualquer outro comando é recusado ao salvar, e um erro na query customizada volta sozinho pra query padrão do sistema (nunca derruba a tela).',
      'Seletor de período ganhou mais opções: além de Últimos 7/15/30/60/90 dias, agora tem "Mês atual", "Trimestre atual" e "Ano atual".',
    ],
  },
  {
    data: '15/09/2026',
    hora: '14:55:09',
    itens: [
      '"Configuração de IA" virou "Configurações Gerais": agora tem duas abas — "Padrões do Sistema" (novo) e "Treinamento de IA" (o que já existia). A tela de treinamento ganhou "Modelos prontos", com 5 exemplos já preenchidos com o esquema real mapeado nesta instalação (critério de vitória em cotação, limites de status da frota, regra de status de estoque etc.) — só clicar em "Usar este modelo" pra revisar e adicionar.',
      'Novo em "Padrões do Sistema": o período padrão dos filtros de data (hoje 30 dias) fica configurável. Os filtros de Estoque e Logística trocaram o "de-até" fixo por um seletor de período relativo (Últimos 7/15/30/60/90 dias, com o padrão configurado em destaque, ou "Personalizado" pra escolher datas específicas).',
    ],
  },
  {
    data: '15/09/2026',
    hora: '11:32:04',
    itens: [
      'Menu de Logística reduzido: "Metas & Ranking" e "Avaliação de Condução" agora ficam dentro de um grupo "Metas"; "Telemetria & Mapa" e "Monitor TV" dentro de um grupo "Monitoramento". Cada grupo abre/fecha independente (antes um clique abria ou fechava todos juntos).',
      'Logística ganhou "Central de Ações" e "Análises", no mesmo espírito das telas já existentes em Estoque: veículos sem comunicação ou com alarme, motoristas abaixo do ponto de equilíbrio ou com avaliação de condução baixa, e insights de custo ainda não resolvidos, tudo priorizado por impacto — e gráficos de custo operacional, custo por frente/fazenda, ranking de motoristas e distribuição das avaliações de condução.',
    ],
  },
  {
    data: '15/09/2026',
    hora: '11:18:53',
    itens: [
      'Corrigido o critério de "venceu a cotação" na Análise de Fornecedores: estava usando o status de workflow do item (que também fica "Aprovada" em casos que não são a proposta vencedora), agora usa o campo do Sankhya dedicado a isso — o mesmo já validado antes no detalhe de cotação.',
      'Módulos ainda em construção (Produção, Manutenção, Compras, Financeiro, Comercial, Custos, DP/RH, Segurança do Trabalho, Controladoria, Fiscal) ganharam números de exemplo nos cards da tela Início, no mesmo estilo de Estoque e Logística — sempre com o aviso "Números de exemplo" (não são dados reais, os módulos ainda não estão conectados).',
    ],
  },
  {
    data: '15/09/2026',
    hora: '11:11:13',
    itens: [
      'Fornecedores ganhou filtro de data no topo (igual Dashboard/Inventário) — os indicadores e o Supplier Score passaram a respeitar o período escolhido, em vez de fixar sempre os últimos 90 dias.',
      'Corrigido o prazo médio de entrega: o campo usado vinha em branco nesta instalação do Sankhya, fazendo o card "Melhor prazo médio" e o gráfico Prazo × Taxa de vitória mostrarem tudo zerado. Agora usa o campo correto (mesmo já usado antes) e mostra "—" quando realmente não há prazo registrado, em vez de um zero enganoso.',
      'Os 5 indicadores de Fornecedores (ativos, melhor prazo, maior taxa de vitória, categorias atendidas, economia acumulada) agora são clicáveis e abrem a lista completa ordenada por aquele indicador.',
    ],
  },
  {
    data: '15/09/2026',
    hora: '11:00:47',
    itens: [
      'Telas de Estoque agora ocupam a largura toda (antes sobrava espaço vazio nas laterais em telas grandes) — mais espaço pra tabelas e gráficos.',
      'Sistema agora pode ser instalado como aplicativo (PWA): aviso na tela Início e botão "Instalar app" no topo, quando o navegador oferece a instalação.',
    ],
  },
  {
    data: '15/09/2026',
    hora: '10:50:29',
    itens: [
      'Menu de Estoque: "Cotações" virou "Compras & Cotações" e mudou de posição (antes de Fornecedores), igual ao layout que o Marcos enviou.',
      'Fornecedores reformulado com o Supplier Score real enviado pela Fazenda Progresso: pondera taxa de vitória, competitividade de preço contra os concorrentes na mesma cotação, prazo, cobertura e volume — com economia calculada item a item (não é estimativa, é a fórmula e os preços reais das cotações dos últimos 90 dias).',
    ],
  },
  {
    data: '14/09/2026',
    hora: '18:30:42',
    itens: [
      'Fornecedores e Cotações: "Sugestões automáticas" também foi pra lateral direita (mesmo padrão do Dashboard e Inventário) — antes ficava esticado na tela toda.',
      'Card de sugestões deixa mais explícito que ainda estamos estudando como aplicar IA de verdade e que, por enquanto, mistura tipos diferentes de regra (estoque, excesso, parado, cotação).',
    ],
  },
  {
    data: '14/09/2026',
    hora: '18:22:32',
    itens: [
      'Dashboard de Estoque: "Sugestões automáticas" foi pra lateral direita e agora mistura vários tipos de alerta (estoque zerado/mínimo, excesso acima do máximo, parado há muito tempo, cotação atrasada/sem prazo) em vez de só ruptura.',
      'Cards de indicador (KPI) trocaram o texto "clique p/ detalhar" por um ícone de olho no canto, menos poluído.',
      'Painel de detalhe (produto/cotação/fornecedor) ganhou um botão de expandir pra tela cheia, sem deixar de ser um popup.',
    ],
  },
  {
    data: '14/09/2026',
    hora: '18:07:53',
    itens: [
      'Dashboard, Inventário, Fornecedores e Cotações (Estoque) ganharam um painel de "Sugestões automáticas": produtos com estoque zerado/abaixo do mínimo e cotações atrasadas/sem prazo, priorizados por regra de negócio real — sem inteligência artificial e sem número de economia inventado.',
    ],
  },
  {
    data: '14/09/2026',
    hora: '16:38:52',
    itens: [
      'Duas telas novas no menu de Estoque: "Central de Ações" (produtos e cotações que pedem atenção agora, priorizados por regra de negócio real — não por IA) e "Análises" (curva ABC, itens mais críticos, produtos parados e estoque por local, todos com resumo calculado a partir do cadastro atual).',
    ],
  },
  {
    data: '14/09/2026',
    hora: '16:32:41',
    itens: [
      'Fornecedores ganhou indicadores reais (melhor prazo médio, maior taxa de vitória, cotações no histórico) e um gráfico de Prazo × Taxa de vitória.',
      'Cotações ganhou indicadores (atrasadas, sem prazo definido, prazo médio até o final) e a coluna "Situação" na lista, calculada a partir do prazo real de cada cotação.',
    ],
  },
  {
    data: '14/09/2026',
    hora: '16:26:25',
    itens: [
      'Tela Início: cards de módulo em construção ganharam textura visual diferenciada, e o card de Estoque mostra valor total e itens em ruptura em tempo real.',
      'Inventário reformulado: novos indicadores (Total de SKUs, Abaixo do mínimo, Acima do máximo, Sem local padrão, Cobertura média), painel de distribuição de estoque por local e atalho pros itens parados há mais tempo.',
    ],
  },
  {
    data: '14/09/2026',
    hora: '16:09:56',
    itens: [
      'Ruptura de estoque corrigida: não compara mais o saldo de um lote isolado contra o mínimo do produto (gerava linhas repetidas do mesmo item, como o Éder identificou com o CARTAP BR 1KG) — agora soma o estoque de todos os locais/lotes antes de comparar.',
      'Giro de estoque recalculado conforme o guia enviado: usa a média entre o estoque inicial e o final do período (não só o saldo atual), e nunca soma compra com requisição.',
    ],
  },
  {
    data: '14/09/2026',
    hora: '08:33:46',
    itens: [
      'Estoque reorganizado em páginas por assunto: Inventário, Fornecedores e Cotações agora têm cada uma sua própria tela no menu (antes ficavam empilhadas numa lista só).',
      'Inventário ganhou abas (Ruptura, Curva ABC, Sem movimentação, Giro) em vez de tudo em uma tela só, e cada linha mostra um selo de status (Zerado / Abaixo do mínimo / Acima do máximo / Normal).',
      'Curva ABC ganhou selo colorido por classe (A/B/C) na tabela.',
      'Cards de indicador (Dashboard e Inventário) ganharam ícone com fundo colorido por tipo de alerta.',
      '"Pergunte à IA" virou uma tela própria, em vez de um link que só rolava a página até a caixa de busca.',
    ],
  },
  {
    data: '12/09/2026',
    hora: '12:10:08',
    itens: [
      'Sino de novidades agora mostra a hora exata (além da data) de cada atualização, pra dar pra acompanhar quando cada mudança entrou no ar.',
    ],
  },
  {
    data: '12/09/2026',
    hora: '12:06:27',
    itens: [
      'Estoque: a lista completa (com todas as tabelas) voltou pro menu, com o nome "Lista completa" — tinha ficado escondida, só acessível clicando num botão pequeno no Dashboard.',
      'Dashboard de Estoque ganhou botões "Lista completa" e "Pergunte à IA" bem visíveis no topo, inclusive no celular.',
      'Botão pra voltar ao Dashboard adicionado na tela de Lista completa.',
    ],
  },
  {
    data: '12/09/2026',
    hora: '11:54:19',
    itens: [
      'Identidade visual refeita puxando as cores REAIS da Fazenda Progresso (o verde-oliva e o verde-limão do site institucional da empresa) e a fonte usada lá, no lugar do dourado provisório da versão anterior.',
      'Logo e foto da tela de login trocados pelos originais da Fazenda Progresso (Chapada Diamantina/Mucugê-BA) — antes eram imagens genéricas de banco de imagens.',
      'Estoque: corrigida a palavra "venda" onde na verdade é saída de estoque (consumo pra produção, manutenção ou baixa) — a fazenda não vende pelo estoque. Ajustado em "Itens sem movimentação", nos gráficos do Dashboard e no comportamento da IA (busca e insights).',
    ],
  },
  {
    data: '12/09/2026',
    hora: '11:39:20',
    itens: [
      'Identidade visual do sistema modernizada: dourado no lugar do verde, tons mais quentes, títulos com fonte serifada, menu lateral redesenhado.',
      'Tela de login com novo visual.',
    ],
  },
  {
    data: '12/09/2026',
    hora: '11:21:59',
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
