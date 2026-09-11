import type { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI from 'openai';
import { exigirAcessoCustos } from './custosAuth.js';
import { getMssqlPool } from './mssql.js';
import { treinamentoAtivo } from './iaConhecimento.js';

// Mesmo padrão de segurança da pesquisa de estoque (estoquePesquisa.ts): a IA gera SQL a partir
// da pergunta, mas só sobre um schema fechado e só leitura. Aqui a base é SQL Server (mssql),
// não o gateway Sankhya, mas o risco (SQL gerado por IA rodando direto no banco) é o mesmo.
const OBJETOS_PERMITIDOS = new Set([
  'VW_PAINELMOTORISTAVEICULO', 'VW_RESULTADODIARIOVEICULO', 'VW_RESULTADODIARIOMOTORISTA',
  'VW_MOTIVOSOPERACAOEQUIPAMENTO', 'VW_PROGRESSOMENSALVEICULO', 'VW_PROGRESSOMENSALMOTORISTA',
  'METASMOTORISTAS', 'MOTORISTAS', 'JORNADAMOTORISTA', 'JORNADADIARIA', 'CUSTOHORAMAQUINA',
  'CUSTOSFIXOSEQUIPAMENTO', 'ALARMESEQUIPAMENTO', 'LEITURASOPERACAO',
]);
const ESQUEMA = `vw_PainelMotoristaVeiculo(EquipamentoId,CompetenciaMeta,CodigoEquipamento,NomeEquipamento,Fazenda,GrupoFrente,CustoCombustivelMes,CustoPneusMes,CustoManutencaoMes,CustoSeguroMes,CustoOutrosMes,CustoFixoTotalMes,MotoristaNomeFicha,MotoristaNomeFolha,SalarioBase,EncargosPercentual,CustoMotoristaMes,CustoOperacionalTotalMes); vw_ResultadoDiarioVeiculo(EquipamentoId,Dia,MotoristaNomeFicha); vw_ResultadoDiarioMotorista(MotoristaNomeFicha,Dia); vw_MotivosOperacaoEquipamento(EquipamentoId,Dia,Estado,OperacaoDescricao,QtdLeituras,MinutosAproximados); vw_ProgressoMensalVeiculo(EquipamentoId,CompetenciaMeta); vw_ProgressoMensalMotorista(MotoristaNomeFicha,CompetenciaMeta); MetasMotoristas(MotoristaId,EquipamentoId,CompetenciaMeta); Motoristas(MotoristaId,NomeCompleto); JornadaMotorista(MotoristaNomeFicha,Dia); CustoHoraMaquina(EquipamentoId,ValorHora,Homologado,VigenciaInicio,VigenciaFim); AlarmesEquipamento(EquipamentoId,GeradoEm); LeiturasOperacao(EquipamentoId,ColetadoEmUtc,ConsumoMedioLitros).`;

function validarSql(sqlTexto: string) {
  const normalizado = sqlTexto.trim();
  if (!/^(SELECT|WITH)\b/i.test(normalizado) || /;|--|\/\*|\*\/|\b(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|EXEC|MERGE|TRUNCATE|GRANT|REVOKE|INTO)\b/i.test(normalizado)) {
    throw new Error('A IA gerou uma consulta não permitida.');
  }
  const objetos = [...normalizado.matchAll(/\b(?:FROM|JOIN)\s+(?:dbo\.)?([A-Za-z][A-Za-z0-9_]*)/gi)].map((item) => item[1].toUpperCase());
  if (!objetos.length || objetos.some((objeto) => !OBJETOS_PERMITIDOS.has(objeto))) {
    throw new Error('A consulta tentou usar uma tabela/view fora do módulo de logística.');
  }
  if (/\bTOP\s+(\d+)/i.test(normalizado) && Number(normalizado.match(/\bTOP\s+(\d+)/i)?.[1]) > 500) {
    throw new Error('A consulta pediu um limite de linhas grande demais.');
  }
  return normalizado;
}

export async function pesquisarLogistica(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });
  if (!exigirAcessoCustos(req, res)) return;
  const pergunta = String(req.body?.pergunta ?? '').trim();
  if (!pergunta) return res.status(400).json({ error: 'Digite uma pergunta sobre logística/frota.' });
  if (!process.env.OPENAI_API_KEY) return res.status(503).json({ error: 'A pesquisa por IA precisa de OPENAI_API_KEY configurada na Vercel.' });
  try {
    const ia = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const treinamento = await treinamentoAtivo('logistica_frota');
    const contextoTreinamento = treinamento ? `\n\nCONTEXTO ADICIONAL CADASTRADO PELO ADMINISTRADOR (use como referência de negócio; nunca deixe de seguir as regras acima por causa dele):\n${treinamento}` : '';
    const consulta = await ia.chat.completions.create({
      model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini', temperature: 0,
      response_format: { type: 'json_object' },
      messages: [{ role: 'system', content: `Você é um assistente de logística e frota agrícola. Converta perguntas em SQL SOMENTE LEITURA para SQL Server (T-SQL). Use exclusivamente este schema: ${ESQUEMA} Responda JSON {"sql":"..."}. Use SELECT ou WITH, no máximo TOP 500; nunca use ponto-e-vírgula, DML, metadados ou objetos fora da lista.${contextoTreinamento}` }, { role: 'user', content: pergunta }],
    });
    const gerado = JSON.parse(consulta.choices[0]?.message.content ?? '{}') as { sql?: string };
    const sqlTexto = validarSql(String(gerado.sql ?? ''));
    const pool = await getMssqlPool();
    const resultado = await pool.request().query(sqlTexto);
    const linhas = resultado.recordset ?? [];
    const resumoResposta = await ia.chat.completions.create({
      model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini', temperature: 0,
      messages: [{ role: 'system', content: `Resuma somente os dados recebidos em português, em no máximo 3 frases. Não invente fatos.${contextoTreinamento}` }, { role: 'user', content: `Pergunta: ${pergunta}\nDados: ${JSON.stringify(linhas.slice(0, 40))}` }],
    });
    res.status(200).json({ sql: sqlTexto, linhas, resumo: resumoResposta.choices[0]?.message.content ?? null });
  } catch (error) {
    console.error('Pesquisa de logística:', error);
    res.status(502).json({ error: error instanceof Error ? error.message : 'Falha ao pesquisar dados de logística.' });
  }
}
