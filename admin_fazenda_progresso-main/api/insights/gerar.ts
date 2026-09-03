import type { VercelRequest, VercelResponse } from '@vercel/node';
import sql from 'mssql';
import OpenAI from 'openai';
import { getMssqlPool } from '../_lib/mssql.js';

// Painel de Insights (IA) — sugestão do Cássio (WhatsApp): "trazer uma IA pra fazer
// a leitura dos dados e trazer alguma sugestão pra gente". Agrega Metas + Gastos +
// Alarmes num resumo compacto e manda pra OpenAI interpretar e sugerir.
//
// Privacidade: o payload NUNCA inclui SalarioBase, CustoMotoristaMes ou
// CustoOperacionalTotalMes (que embute o motorista) — só métricas de performance
// (Km/L, CPK controlável, contagem de alarmes) e custo do EQUIPAMENTO. Dado de
// remuneração não sai da infraestrutura da fazenda pra um provedor externo.
//
// As 3 agregações rodam isoladas (try/catch cada uma): se uma falhar (ex.: schema
// mudou), as outras duas ainda alimentam a IA em vez de derrubar o recurso inteiro.

const QUERY_METAS = `
WITH Consumo AS (
  SELECT EquipamentoId, SUM(CAST(ConsumoMedioLitros AS FLOAT)) AS LitrosConsumidosMes
  FROM LeiturasOperacao
  WHERE ColetadoEmUtc >= @inicioCompetencia AND ColetadoEmUtc < @fimCompetencia
  GROUP BY EquipamentoId
),
Calculado AS (
  SELECT
    v.MotoristaNomeFicha, v.Atividade, v.NomeEquipamento,
    v.MetaKmL, v.MetaCpk, v.KmLHistorico, v.CpkHistorico,
    CASE WHEN c.LitrosConsumidosMes > 0
         THEN v.VariacaoHorimetroOdometroMes / c.LitrosConsumidosMes
         ELSE NULL END AS KmLRealizado,
    CASE WHEN v.VariacaoHorimetroOdometroMes > 0
         THEN (ISNULL(v.CustoCombustivelMes,0) + ISNULL(v.CustoPneusMes,0) + ISNULL(v.CustoManutencaoMes,0)) / v.VariacaoHorimetroOdometroMes
         ELSE NULL END AS CpkRealizado
  FROM vw_PainelMotoristaVeiculo v
  LEFT JOIN Consumo c ON c.EquipamentoId = v.EquipamentoId
  WHERE v.CompetenciaMeta >= @inicioCompetencia AND v.CompetenciaMeta < @fimCompetencia
    AND v.MotoristaNomeFicha IS NOT NULL
)
SELECT *,
  AVG(KmLRealizado) OVER (PARTITION BY Atividade) AS MediaKmLAtividade,
  AVG(CpkRealizado) OVER (PARTITION BY Atividade) AS MediaCpkAtividade
FROM Calculado
`;

const QUERY_GASTOS = `
SELECT v.NomeEquipamento, v.CompetenciaMeta, v.CustoFixoTotalMes
FROM vw_PainelMotoristaVeiculo v
WHERE v.CompetenciaMeta >= @inicioTrimestre AND v.CompetenciaMeta < @fimCompetencia
ORDER BY v.NomeEquipamento, v.CompetenciaMeta
`;

const QUERY_ALARMES = `
SELECT eq.Nome AS NomeEquipamento, COUNT(*) AS QtdAlarmes30Dias
FROM AlarmesEquipamento al
LEFT JOIN Equipamentos eq ON eq.EquipamentoId = al.EquipamentoId
WHERE al.ColetadoEmUtc >= DATEADD(DAY, -30, SYSUTCDATETIME())
GROUP BY eq.Nome
HAVING COUNT(*) > 0
ORDER BY QtdAlarmes30Dias DESC
`;

const CATEGORIAS = ['Metas', 'Gastos', 'Alarmes'] as const;
const SEVERIDADES = ['baixa', 'media', 'alta'] as const;

interface InsightGerado {
  categoria: string;
  severidade: string;
  titulo: string;
  descricao: string;
  entidadeReferencia?: string | null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método não permitido' });
    return;
  }

  if (!process.env.OPENAI_API_KEY) {
    res.status(502).json({ error: 'OPENAI_API_KEY não configurada no Vercel' });
    return;
  }

  try {
    const agora = new Date();
    const inicioCompetencia = new Date(Date.UTC(agora.getFullYear(), agora.getMonth(), 1));
    const fimCompetencia = new Date(Date.UTC(agora.getFullYear(), agora.getMonth() + 1, 1));
    const inicioTrimestre = new Date(Date.UTC(agora.getFullYear(), agora.getMonth() - 2, 1));

    const pool = await getMssqlPool();

    const [metas, gastos, alarmes] = await Promise.all([
      pool.request()
        .input('inicioCompetencia', sql.DateTime2, inicioCompetencia)
        .input('fimCompetencia', sql.DateTime2, fimCompetencia)
        .query(QUERY_METAS)
        .then((r) => r.recordset)
        .catch((error) => {
          console.error('Insights: falha ao agregar Metas:', error);
          return [];
        }),
      pool.request()
        .input('inicioTrimestre', sql.DateTime2, inicioTrimestre)
        .input('fimCompetencia', sql.DateTime2, fimCompetencia)
        .query(QUERY_GASTOS)
        .then((r) => r.recordset)
        .catch((error) => {
          console.error('Insights: falha ao agregar Gastos:', error);
          return [];
        }),
      pool.request()
        .query(QUERY_ALARMES)
        .then((r) => r.recordset)
        .catch((error) => {
          console.error('Insights: falha ao agregar Alarmes:', error);
          return [];
        }),
    ]);

    if (metas.length === 0 && gastos.length === 0 && alarmes.length === 0) {
      res.status(502).json({ error: 'Nenhum dado disponível pra gerar insights (as 3 agregações falharam ou vieram vazias)' });
      return;
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const modelo = process.env.OPENAI_MODEL || 'gpt-4o-mini';

    const completion = await openai.chat.completions.create({
      model: modelo,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'Você analisa dados operacionais de uma fazenda de logística (Fazenda Progresso). ' +
            'Km/L: quanto maior, melhor (eficiência de combustível). CPK (custo por km): quanto menor, melhor. ' +
            'Alarmes são eventos de risco (frenagem brusca, aceleração). Custos estão em reais (R$). ' +
            'Compare cada motorista/equipamento contra a média da própria atividade (nunca entre atividades diferentes), ' +
            'e aponte tendências de custo crescente ou concentração de alarmes. ' +
            'Responda em português do Brasil, tom direto e prático, como um relatório gerencial. ' +
            'Responda em JSON: {"insights": [{"categoria": "Metas"|"Gastos"|"Alarmes", "severidade": "baixa"|"media"|"alta", ' +
            '"titulo": string curto, "descricao": string com 1-2 frases explicando o achado e uma sugestão de ação, ' +
            '"entidadeReferencia": nome do motorista ou equipamento citado, ou null}]}. ' +
            'Gere no máximo 8 insights, só os que tiverem sinal real nos dados — não invente insight só pra preencher.',
        },
        {
          role: 'user',
          content: JSON.stringify({ metas, gastos, alarmes }),
        },
      ],
    });

    const conteudo = completion.choices[0]?.message?.content ?? '{"insights":[]}';
    let insights: InsightGerado[] = [];
    try {
      const parsed = JSON.parse(conteudo);
      insights = Array.isArray(parsed.insights) ? parsed.insights : [];
    } catch (error) {
      console.error('Insights: resposta da OpenAI não é JSON válido:', conteudo, error);
    }

    const inseridos = [];
    for (const insight of insights) {
      const categoria = CATEGORIAS.includes(insight.categoria as (typeof CATEGORIAS)[number]) ? insight.categoria : 'Metas';
      const severidade = SEVERIDADES.includes(insight.severidade as (typeof SEVERIDADES)[number]) ? insight.severidade : 'baixa';
      if (!insight.titulo || !insight.descricao) continue;

      const result = await pool.request()
        .input('categoria', sql.NVarChar, categoria)
        .input('severidade', sql.NVarChar, severidade)
        .input('titulo', sql.NVarChar, insight.titulo.slice(0, 200))
        .input('descricao', sql.NVarChar, insight.descricao.slice(0, 1000))
        .input('entidadeReferencia', sql.NVarChar, insight.entidadeReferencia?.slice(0, 200) ?? null)
        .query(`
          INSERT INTO InsightIA (Categoria, Severidade, Titulo, Descricao, EntidadeReferencia)
          OUTPUT INSERTED.*
          VALUES (@categoria, @severidade, @titulo, @descricao, @entidadeReferencia)
        `);
      inseridos.push(result.recordset[0]);
    }

    res.status(200).json(inseridos);
  } catch (error) {
    console.error('Erro ao gerar insights:', error);
    res.status(502).json({ error: 'Falha ao gerar insights (banco de dados ou OpenAI)' });
  }
}
