// Dados de exemplo (ilustrativos) pra módulos que ainda não têm integração de dados real —
// nunca usar em decisão de negócio, só pra mostrar como o painel fica quando a fonte real
// existir. Cada painel que usa esses dados exibe o selo "Dados ilustrativos" (biShared.tsx).
export type ModuloMock = {
  chave: string;
  kpis: { rotulo: string; valor: string; apoio?: string }[];
  graficoPrincipal: { titulo: string; tipo: 'barra' | 'linha'; dados: Record<string, unknown>[]; categoria: string; series: { chave: string; nome: string; cor: string }[]; formato?: 'moeda' | 'numero' };
  graficoPizza: { titulo: string; dados: Record<string, unknown>[]; chaveValor: string; chaveNome: string; formato?: 'moeda' | 'numero' };
};

export const MODULOS_MOCK: Record<string, ModuloMock> = {
  producao_batata: {
    chave: 'producao_batata',
    kpis: [
      { rotulo: 'Toneladas colhidas (safra)', valor: '18.420 t' },
      { rotulo: 'Custo médio por tonelada', valor: 'R$ 612,00' },
      { rotulo: 'Área plantada', valor: '640 ha' },
      { rotulo: 'Produtividade média', valor: '28,8 t/ha' },
    ],
    graficoPrincipal: {
      titulo: 'Colheita por mês (toneladas)', tipo: 'barra', categoria: 'mes',
      dados: [
        { mes: 'Abr', toneladas: 2100 }, { mes: 'Mai', toneladas: 3400 }, { mes: 'Jun', toneladas: 4800 },
        { mes: 'Jul', toneladas: 4100 }, { mes: 'Ago', toneladas: 2600 }, { mes: 'Set', toneladas: 1420 },
      ],
      series: [{ chave: 'toneladas', nome: 'Toneladas', cor: '#2a78d6' }],
    },
    graficoPizza: {
      titulo: 'Área plantada por talhão', chaveValor: 'ha', chaveNome: 'talhao',
      dados: [{ talhao: 'Talhão 1', ha: 210 }, { talhao: 'Talhão 2', ha: 180 }, { talhao: 'Talhão 3', ha: 150 }, { talhao: 'Talhão 4', ha: 100 }],
    },
  },
  manutencao: {
    chave: 'manutencao',
    kpis: [
      { rotulo: 'OS abertas', valor: '34' },
      { rotulo: 'OS em atraso', valor: '6' },
      { rotulo: 'Custo do mês', valor: 'R$ 187.500' },
      { rotulo: 'MTTR médio', valor: '3,2 dias' },
    ],
    graficoPrincipal: {
      titulo: 'Ordens de serviço por mês', tipo: 'barra', categoria: 'mes',
      dados: [
        { mes: 'Abr', abertas: 28, fechadas: 24 }, { mes: 'Mai', abertas: 31, fechadas: 30 },
        { mes: 'Jun', abertas: 26, fechadas: 25 }, { mes: 'Jul', abertas: 35, fechadas: 29 },
        { mes: 'Ago', abertas: 30, fechadas: 32 }, { mes: 'Set', abertas: 34, fechadas: 28 },
      ],
      series: [{ chave: 'abertas', nome: 'Abertas', cor: '#2a78d6' }, { chave: 'fechadas', nome: 'Fechadas', cor: '#1baf7a' }],
    },
    graficoPizza: {
      titulo: 'Custo por tipo de manutenção', chaveValor: 'valor', chaveNome: 'tipo', formato: 'moeda',
      dados: [{ tipo: 'Preventiva', valor: 62000 }, { tipo: 'Corretiva', valor: 98000 }, { tipo: 'Pneus', valor: 27500 }],
    },
  },
  compras: {
    chave: 'compras',
    kpis: [
      { rotulo: 'Pedidos abertos', valor: '52' },
      { rotulo: 'Valor comprado (mês)', valor: 'R$ 890.200' },
      { rotulo: 'Fornecedores ativos', valor: '118' },
      { rotulo: 'Prazo médio de entrega', valor: '12 dias' },
    ],
    graficoPrincipal: {
      titulo: 'Valor comprado por mês', tipo: 'linha', categoria: 'mes', formato: 'moeda',
      dados: [
        { mes: 'Abr', valor: 620000 }, { mes: 'Mai', valor: 710000 }, { mes: 'Jun', valor: 655000 },
        { mes: 'Jul', valor: 802000 }, { mes: 'Ago', valor: 748000 }, { mes: 'Set', valor: 890200 },
      ],
      series: [{ chave: 'valor', nome: 'Valor comprado', cor: '#2a78d6' }],
    },
    graficoPizza: {
      titulo: 'Pedidos por situação', chaveValor: 'qtd', chaveNome: 'situacao',
      dados: [{ situacao: 'Aberto', qtd: 22 }, { situacao: 'Aprovado', qtd: 18 }, { situacao: 'Entregue', qtd: 74 }, { situacao: 'Cancelado', qtd: 6 }],
    },
  },
  financeiro: {
    chave: 'financeiro',
    kpis: [
      { rotulo: 'Saldo em caixa', valor: 'R$ 2.140.000' },
      { rotulo: 'Contas a pagar (30d)', valor: 'R$ 980.000' },
      { rotulo: 'Contas a receber (30d)', valor: 'R$ 1.320.000' },
      { rotulo: 'Margem líquida', valor: '14,2%' },
    ],
    graficoPrincipal: {
      titulo: 'Fluxo de caixa por mês', tipo: 'linha', categoria: 'mes', formato: 'moeda',
      dados: [
        { mes: 'Abr', entradas: 1450000, saidas: 1180000 }, { mes: 'Mai', entradas: 1620000, saidas: 1340000 },
        { mes: 'Jun', entradas: 1510000, saidas: 1290000 }, { mes: 'Jul', entradas: 1780000, saidas: 1520000 },
        { mes: 'Ago', entradas: 1690000, saidas: 1410000 }, { mes: 'Set', entradas: 1820000, saidas: 1560000 },
      ],
      series: [{ chave: 'entradas', nome: 'Entradas', cor: '#1baf7a' }, { chave: 'saidas', nome: 'Saídas', cor: '#eb6834' }],
    },
    graficoPizza: {
      titulo: 'Contas a pagar por categoria', chaveValor: 'valor', chaveNome: 'categoria', formato: 'moeda',
      dados: [{ categoria: 'Fornecedores', valor: 520000 }, { categoria: 'Folha', valor: 310000 }, { categoria: 'Impostos', valor: 150000 }],
    },
  },
  comercial: {
    chave: 'comercial',
    kpis: [
      { rotulo: 'Vendas do mês', valor: 'R$ 1.240.000' },
      { rotulo: 'Ticket médio', valor: 'R$ 18.400' },
      { rotulo: 'Clientes ativos', valor: '67' },
      { rotulo: 'Taxa de conversão', valor: '31%' },
    ],
    graficoPrincipal: {
      titulo: 'Vendas por mês', tipo: 'barra', categoria: 'mes', formato: 'moeda',
      dados: [
        { mes: 'Abr', valor: 980000 }, { mes: 'Mai', valor: 1050000 }, { mes: 'Jun', valor: 890000 },
        { mes: 'Jul', valor: 1180000 }, { mes: 'Ago', valor: 1120000 }, { mes: 'Set', valor: 1240000 },
      ],
      series: [{ chave: 'valor', nome: 'Vendas', cor: '#2a78d6' }],
    },
    graficoPizza: {
      titulo: 'Vendas por canal', chaveValor: 'valor', chaveNome: 'canal', formato: 'moeda',
      dados: [{ canal: 'Direto', valor: 620000 }, { canal: 'Cooperativa', valor: 410000 }, { canal: 'Exportação', valor: 210000 }],
    },
  },
  custos: {
    chave: 'custos',
    kpis: [
      { rotulo: 'Custo total do mês', valor: 'R$ 3.180.000' },
      { rotulo: 'Maior centro de custo', valor: 'Logística' },
      { rotulo: 'Variação vs. mês anterior', valor: '+4,1%' },
      { rotulo: 'Custo por hectare', valor: 'R$ 4.970' },
    ],
    graficoPrincipal: {
      titulo: 'Custo por natureza (mês)', tipo: 'barra', categoria: 'natureza', formato: 'moeda',
      dados: [
        { natureza: 'Mão de obra', valor: 1120000 }, { natureza: 'Insumos', valor: 890000 },
        { natureza: 'Combustível', valor: 480000 }, { natureza: 'Manutenção', valor: 390000 }, { natureza: 'Outros', valor: 300000 },
      ],
      series: [{ chave: 'valor', nome: 'Custo', cor: '#eb6834' }],
    },
    graficoPizza: {
      titulo: 'Custo por centro de resultado', chaveValor: 'valor', chaveNome: 'centro', formato: 'moeda',
      dados: [{ centro: 'Logística', valor: 1240000 }, { centro: 'Estoque', valor: 780000 }, { centro: 'Produção', valor: 690000 }, { centro: 'Administrativo', valor: 470000 }],
    },
  },
  rh: {
    chave: 'rh',
    kpis: [
      { rotulo: 'Colaboradores ativos', valor: '312' },
      { rotulo: 'Admissões no mês', valor: '9' },
      { rotulo: 'Desligamentos no mês', valor: '5' },
      { rotulo: 'Turnover (12m)', valor: '8,4%' },
    ],
    graficoPrincipal: {
      titulo: 'Admissões x desligamentos por mês', tipo: 'barra', categoria: 'mes',
      dados: [
        { mes: 'Abr', admissoes: 6, desligamentos: 4 }, { mes: 'Mai', admissoes: 8, desligamentos: 3 },
        { mes: 'Jun', admissoes: 5, desligamentos: 6 }, { mes: 'Jul', admissoes: 11, desligamentos: 5 },
        { mes: 'Ago', admissoes: 7, desligamentos: 4 }, { mes: 'Set', admissoes: 9, desligamentos: 5 },
      ],
      series: [{ chave: 'admissoes', nome: 'Admissões', cor: '#1baf7a' }, { chave: 'desligamentos', nome: 'Desligamentos', cor: '#eb6834' }],
    },
    graficoPizza: {
      titulo: 'Colaboradores por setor', chaveValor: 'qtd', chaveNome: 'setor',
      dados: [{ setor: 'Campo', qtd: 168 }, { setor: 'Logística', qtd: 54 }, { setor: 'Administrativo', qtd: 38 }, { setor: 'Manutenção', qtd: 52 }],
    },
  },
  seguranca_trabalho: {
    chave: 'seguranca_trabalho',
    kpis: [
      { rotulo: 'Dias sem acidente', valor: '47' },
      { rotulo: 'Acidentes no mês', valor: '1' },
      { rotulo: 'Quase-acidentes registrados', valor: '6' },
      { rotulo: 'Treinamentos realizados (mês)', valor: '14' },
    ],
    graficoPrincipal: {
      titulo: 'Acidentes por mês', tipo: 'linha', categoria: 'mes',
      dados: [
        { mes: 'Abr', acidentes: 2 }, { mes: 'Mai', acidentes: 1 }, { mes: 'Jun', acidentes: 0 },
        { mes: 'Jul', acidentes: 1 }, { mes: 'Ago', acidentes: 0 }, { mes: 'Set', acidentes: 1 },
      ],
      series: [{ chave: 'acidentes', nome: 'Acidentes', cor: '#eb6834' }],
    },
    graficoPizza: {
      titulo: 'Quase-acidentes por tipo', chaveValor: 'qtd', chaveNome: 'tipo',
      dados: [{ tipo: 'Queda', qtd: 2 }, { tipo: 'Máquina', qtd: 2 }, { tipo: 'Químico', qtd: 1 }, { tipo: 'Outro', qtd: 1 }],
    },
  },
  controladoria: {
    chave: 'controladoria',
    kpis: [
      { rotulo: 'Margem operacional', valor: '17,8%' },
      { rotulo: 'Aderência ao orçamento', valor: '92%' },
      { rotulo: 'Indicadores no alvo', valor: '11 de 14' },
      { rotulo: 'Auditorias no trimestre', valor: '3' },
    ],
    graficoPrincipal: {
      titulo: 'Orçado x realizado por área', tipo: 'barra', categoria: 'area', formato: 'moeda',
      dados: [
        { area: 'Logística', orcado: 1300000, realizado: 1240000 }, { area: 'Estoque', orcado: 820000, realizado: 780000 },
        { area: 'Produção', orcado: 650000, realizado: 690000 }, { area: 'Administrativo', orcado: 500000, realizado: 470000 },
      ],
      series: [{ chave: 'orcado', nome: 'Orçado', cor: '#2a78d6' }, { chave: 'realizado', nome: 'Realizado', cor: '#8a5cf6' }],
    },
    graficoPizza: {
      titulo: 'Indicadores por status', chaveValor: 'qtd', chaveNome: 'status',
      dados: [{ status: 'No alvo', qtd: 11 }, { status: 'Atenção', qtd: 2 }, { status: 'Crítico', qtd: 1 }],
    },
  },
  fiscal: {
    chave: 'fiscal',
    kpis: [
      { rotulo: 'Notas emitidas (mês)', valor: '842' },
      { rotulo: 'Impostos a recolher (mês)', valor: 'R$ 214.000' },
      { rotulo: 'Notas pendentes', valor: '6' },
      { rotulo: 'Prazo da próxima obrigação', valor: '5 dias' },
    ],
    graficoPrincipal: {
      titulo: 'Notas emitidas por mês', tipo: 'barra', categoria: 'mes',
      dados: [
        { mes: 'Abr', notas: 690 }, { mes: 'Mai', notas: 740 }, { mes: 'Jun', notas: 705 },
        { mes: 'Jul', notas: 810 }, { mes: 'Ago', notas: 775 }, { mes: 'Set', notas: 842 },
      ],
      series: [{ chave: 'notas', nome: 'Notas emitidas', cor: '#2a78d6' }],
    },
    graficoPizza: {
      titulo: 'Impostos a recolher por tipo', chaveValor: 'valor', chaveNome: 'tipo', formato: 'moeda',
      dados: [{ tipo: 'ICMS', valor: 118000 }, { tipo: 'PIS/COFINS', valor: 62000 }, { tipo: 'ISS', valor: 21000 }, { tipo: 'Outros', valor: 13000 }],
    },
  },
};
