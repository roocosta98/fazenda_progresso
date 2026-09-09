import type { VercelRequest, VercelResponse } from '@vercel/node';
import sql from 'mssql';
import { getMssqlPool } from '../_lib/mssql.js';

// Benchmark calculado no servidor: não há estimativa inventada por IA nem
// comparação quando não existir uma referência pública para o modelo.
const QUERY_CUSTO_DIARIO = `
  SELECT r.EquipamentoId, MAX(r.NomeEquipamento) AS NomeEquipamento,
    AVG(CAST(r.CustoOperacionalRealDia AS DECIMAL(18,4))) AS CustoDiarioReal,
    COUNT(DISTINCT CAST(r.Dia AS date)) AS DiasComDado
  FROM vw_ResultadoDiarioVeiculo r
  WHERE r.Dia >= @inicio AND r.Dia < @fim AND r.CustoOperacionalRealDia IS NOT NULL
  GROUP BY r.EquipamentoId
`;

interface Referencia {
  ChaveModelo: string; Regiao: string; Segmento: string; DiariaBase: number;
  FonteTitulo: string; FonteUrl: string; FonteData: string | null; Homologada: boolean;
}

const moeda = (valor: number) => valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const COLUNAS_BENCHMARK = [
  'ValorBaseDiaria', 'CustoRealDiario', 'DiferencaPercentual',
  'FonteReferenciaTitulo', 'FonteReferenciaUrl', 'FonteReferenciaData', 'EscopoReferencia',
] as const;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });
  try {
    const hoje = new Date();
    const inicio = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), 1));
    const fim = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth() + 1, 1));
    const pool = await getMssqlPool();
    const [custos, referencias, schema] = await Promise.all([
      pool.request().input('inicio', sql.DateTime2, inicio).input('fim', sql.DateTime2, fim).query(QUERY_CUSTO_DIARIO).then((r) => r.recordset),
      pool.request().query(`SELECT ChaveModelo, Regiao, Segmento, DiariaBase, FonteTitulo, FonteUrl, FonteData, Homologada FROM CustoReferenciaOperacional WHERE Ativa=1`).then((r) => r.recordset as Referencia[]),
      pool.request().query(`SELECT name FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.InsightIA')`).then((r) => new Set(r.recordset.map((row) => String(row.name)))),
    ]);
    const colunasBenchmarkDisponiveis = COLUNAS_BENCHMARK.filter((coluna) => schema.has(coluna));

    const inseridos = [];
    for (const custo of custos) {
      const nome = String(custo.NomeEquipamento ?? 'Equipamento sem nome');
      const referencia = referencias.find((item) => nome.toLowerCase().includes(item.ChaveModelo.toLowerCase()));
      if (!referencia) continue;
      const diarioReal = Number(custo.CustoDiarioReal);
      const diariaBase = Number(referencia.DiariaBase);
      const diferenca = ((diarioReal - diariaBase) / diariaBase) * 100;
      const acima = diferenca > 0;
      const fato = `Custo diário real: ${moeda(diarioReal)} em ${Number(custo.DiasComDado)} dia(s) com dado. Referência: ${moeda(diariaBase)}/dia. Diferença: ${acima ? '+' : ''}${diferenca.toFixed(1).replace('.', ',')}%.`;
      const escopo = `${referencia.Regiao}; ${referencia.Segmento}; referência pública ${referencia.Homologada ? 'homologada' : 'não homologada'}`;
      const descricao = `${fato} Fonte: ${referencia.FonteTitulo} (${referencia.FonteUrl}). Não é cotação específica de fazenda de batata; serve apenas como balizador externo.`;
      const request = pool.request()
        .input('categoria', sql.NVarChar, 'Benchmark').input('severidade', sql.NVarChar, acima && diferenca > 20 ? 'alta' : acima ? 'media' : 'baixa')
        .input('titulo', sql.NVarChar, `Custo diário: ${nome}`).input('descricao', sql.NVarChar, descricao)
        .input('entidade', sql.NVarChar, nome).input('equipamentoId', sql.Int, custo.EquipamentoId).input('inicio', sql.Date, inicio).input('fim', sql.Date, new Date(fim.getTime() - 86400000))
        .input('fato', sql.NVarChar, fato).input('recomendacao', sql.NVarChar, acima ? 'Validar combustível, manutenção e jornada antes de concluir que existe desvio operacional.' : 'Manter o acompanhamento: o custo está igual ou abaixo desta referência externa.');

      const valoresBenchmark: Record<typeof COLUNAS_BENCHMARK[number], string> = {
        ValorBaseDiaria: '@valorBase', CustoRealDiario: '@valorReal', DiferencaPercentual: '@diferenca',
        FonteReferenciaTitulo: '@fonteTitulo', FonteReferenciaUrl: '@fonteUrl', FonteReferenciaData: '@fonteData', EscopoReferencia: '@escopo',
      };
      request.input('valorBase', sql.Decimal(18, 2), diariaBase).input('valorReal', sql.Decimal(18, 2), diarioReal).input('diferenca', sql.Decimal(9, 2), diferenca)
        .input('fonteTitulo', sql.NVarChar, referencia.FonteTitulo).input('fonteUrl', sql.NVarChar, referencia.FonteUrl).input('fonteData', sql.Date, referencia.FonteData ? new Date(referencia.FonteData) : null).input('escopo', sql.NVarChar, escopo);

      const colunasBase = ['Categoria', 'Severidade', 'Titulo', 'Descricao', 'EntidadeReferencia', 'EquipamentoId', 'PeriodoInicio', 'PeriodoFim', 'FatoCalculado', 'RecomendacaoIA'];
      const valoresBase = ['@categoria', '@severidade', '@titulo', '@descricao', '@entidade', '@equipamentoId', '@inicio', '@fim', '@fato', '@recomendacao'];
      const result = await request.query(`INSERT INTO dbo.InsightIA (${[...colunasBase, ...colunasBenchmarkDisponiveis].join(', ')})
        OUTPUT INSERTED.* VALUES (${[...valoresBase, ...colunasBenchmarkDisponiveis.map((coluna) => valoresBenchmark[coluna])].join(', ')})`);
      inseridos.push(result.recordset[0]);
    }
    if (!inseridos.length) return res.status(422).json({ error: 'Não há custo diário no mês ou referência cadastrada para o modelo dos veículos.' });
    res.status(200).json(inseridos);
  } catch (error) {
    console.error('Erro ao gerar benchmark de custo:', error);
    const detalhe = error instanceof Error ? error.message : '';
    // Erros de schema são acionáveis pelo administrador e não expõem credenciais.
    if (/invalid object name|invalid column name/i.test(detalhe)) {
      return res.status(503).json({
        error: 'Configuração do benchmark pendente no SQL Server. Execute o script de ajustes de custo operacional no banco conectado à Vercel.',
        detalhe,
      });
    }
    res.status(502).json({ error: 'Falha ao comparar custo diário com a referência cadastrada.' });
  }
}
