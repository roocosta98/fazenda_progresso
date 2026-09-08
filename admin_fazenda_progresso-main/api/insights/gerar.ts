import type { VercelRequest, VercelResponse } from '@vercel/node';
import sql from 'mssql';
import OpenAI from 'openai';
import { getMssqlPool } from '../_lib/mssql.js';
import { INTERVALO_REVISAO_KM_HORAS, MARGEM_ALERTA_KM_HORAS } from '../_lib/manutencaoPreditiva.js';

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

// Manutenção preditiva leve (Fase D, melhoria pedida pelo Rodrigo / PRD §12): não recalcula nada
// pesado, só olha o horímetro/odômetro acumulado de cada equipamento contra um intervalo fixo de
// revisão (api/_lib/manutencaoPreditiva.ts). Only equipamentos dentro da margem de alerta entram
// no payload — assim a IA só gera insight de manutenção quando o limite é realmente ultrapassado.
const QUERY_MANUTENCAO = `
SELECT DISTINCT NomeEquipamento, HorimetroOdometroAtual
FROM vw_PainelMotoristaVeiculo
WHERE CompetenciaMeta >= @inicioCompetencia AND CompetenciaMeta < @fimCompetencia
  AND HorimetroOdometroAtual IS NOT NULL
`;

const CATEGORIAS = ['Metas', 'Gastos', 'Alarmes', 'Manutencao'] as const;
const SEVERIDADES = ['baixa', 'media', 'alta'] as const;

interface InsightGerado {
  categoria: string;
  severidade: string;
  titulo: string;
  descricao: string;
  entidadeReferencia?: string | null;
  fatoCalculado?: string | null;
  recomendacao?: string | null;
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

    const [metas, gastos, alarmes, horimetros] = await Promise.all([
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
      pool.request()
        .input('inicioCompetencia', sql.DateTime2, inicioCompetencia)
        .input('fimCompetencia', sql.DateTime2, fimCompetencia)
        .query(QUERY_MANUTENCAO)
        .then((r) => r.recordset as { NomeEquipamento: string; HorimetroOdometroAtual: number }[])
        .catch((error) => {
          console.error('Insights: falha ao agregar Manutenção:', error);
          return [];
        }),
    ]);

    // Regra determinística (não é a IA que decide o limite): só entra no payload quem já está
    // dentro da margem de alerta pro próximo múltiplo do intervalo de revisão — assim a IA nunca
    // "inventa" um alerta de manutenção pra um equipamento que ainda está longe da troca.
    const manutencao = horimetros
      .map((h) => {
        const restante = INTERVALO_REVISAO_KM_HORAS - (h.HorimetroOdometroAtual % INTERVALO_REVISAO_KM_HORAS);
        return { NomeEquipamento: h.NomeEquipamento, HorimetroOdometroAtual: h.HorimetroOdometroAtual, RestanteAteRevisao: restante };
      })
      .filter((h) => h.RestanteAteRevisao <= MARGEM_ALERTA_KM_HORAS);

    if (metas.length === 0 && gastos.length === 0 && alarmes.length === 0 && manutencao.length === 0) {
      res.status(502).json({ error: 'Nenhum dado disponível pra gerar insights (as agregações falharam ou vieram vazias)' });
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
            'O array "manutencao" já vem filtrado: só tem equipamento cujo horímetro/odômetro (HorimetroOdometroAtual) ' +
            'está a RestanteAteRevisao unidades ou menos do próximo múltiplo do intervalo de revisão — todo item desse ' +
            'array merece um insight de categoria "Manutencao" sugerindo agendar revisão preventiva; se o array vier ' +
            'vazio, não gere nenhum insight de manutenção. ' +
            'Responda em português do Brasil, tom direto e prático, como um relatório gerencial. ' +
            'Responda em JSON: {"insights": [{"categoria": "Metas"|"Gastos"|"Alarmes"|"Manutencao", "severidade": "baixa"|"media"|"alta", ' +
            '"titulo": string curto, "descricao": string resumida, "fatoCalculado": string contendo apenas números/fatos presentes no payload, "recomendacao": string contendo apenas a ação sugerida, ' +
            '"entidadeReferencia": nome do motorista ou equipamento citado, ou null}]}. ' +
            'Gere no máximo 8 insights, só os que tiverem sinal real nos dados — não invente insight só pra preencher.',
        },
        {
          role: 'user',
          content: JSON.stringify({ metas, gastos, alarmes, manutencao }),
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

      const equipamento = insight.entidadeReferencia
        ? await pool.request().input('referencia', sql.NVarChar, insight.entidadeReferencia).query(`
            SELECT TOP 1 EquipamentoId FROM Equipamentos
            WHERE Nome = @referencia OR CodigoEquipamento = @referencia
          `).then((r) => r.recordset[0]?.EquipamentoId ?? null)
        : null;

      const result = await pool.request()
        .input('categoria', sql.NVarChar, categoria)
        .input('severidade', sql.NVarChar, severidade)
        .input('titulo', sql.NVarChar, insight.titulo.slice(0, 200))
        .input('descricao', sql.NVarChar, insight.descricao.slice(0, 1000))
        .input('entidadeReferencia', sql.NVarChar, insight.entidadeReferencia?.slice(0, 200) ?? null)
        .input('equipamentoId', sql.Int, equipamento)
        .input('periodoInicio', sql.Date, inicioCompetencia)
        .input('periodoFim', sql.Date, new Date(fimCompetencia.getTime() - 86400000))
        .input('fatoCalculado', sql.NVarChar, insight.fatoCalculado?.slice(0, 1000) ?? insight.descricao.slice(0, 1000))
        .input('recomendacaoIA', sql.NVarChar, insight.recomendacao?.slice(0, 1000) ?? null)
        .query(`
          INSERT INTO InsightIA (Categoria, Severidade, Titulo, Descricao, EntidadeReferencia, EquipamentoId, PeriodoInicio, PeriodoFim, FatoCalculado, RecomendacaoIA)
          OUTPUT INSERTED.*
          VALUES (@categoria, @severidade, @titulo, @descricao, @entidadeReferencia, @equipamentoId, @periodoInicio, @periodoFim, @fatoCalculado, @recomendacaoIA)
        `);
      inseridos.push(result.recordset[0]);
    }

    res.status(200).json(inseridos);
  } catch (error) {
    console.error('Erro ao gerar insights:', error);
    res.status(502).json({ error: 'Falha ao gerar insights (banco de dados ou OpenAI)' });
  }
}
