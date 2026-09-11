import type { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI from 'openai';
import { exigirAcessoCustos } from './custosAuth.js';
import { getMssqlPool } from './mssql.js';
import { treinamentoAtivo } from './iaConhecimento.js';
import { modeloOpenAI, parametrosDeterministicos } from './openaiConfig.js';

// Mesmo padrão de segurança da pesquisa de estoque (estoquePesquisa.ts): a IA gera SQL a partir
// da pergunta, mas só sobre um schema fechado e só leitura. Aqui a base é SQL Server (mssql),
// não o gateway Sankhya, mas o risco (SQL gerado por IA rodando direto no banco) é o mesmo.
const OBJETOS_PERMITIDOS = new Set([
  'VW_PAINELMOTORISTAVEICULO', 'VW_RESULTADODIARIOVEICULO', 'VW_RESULTADODIARIOMOTORISTA',
  'VW_MOTIVOSOPERACAOEQUIPAMENTO', 'VW_PROGRESSOMENSALVEICULO', 'VW_PROGRESSOMENSALMOTORISTA',
  'METASMOTORISTAS', 'MOTORISTAS', 'JORNADAMOTORISTA', 'JORNADADIARIA', 'CUSTOHORAMAQUINA',
  'CUSTOSFIXOSEQUIPAMENTO', 'ALARMESEQUIPAMENTO', 'LEITURASOPERACAO',
]);
const ESQUEMA = `vw_PainelMotoristaVeiculo(EquipamentoId,CompetenciaMeta,CodigoEquipamento,NomeEquipamento,Fazenda,GrupoFrente,CustoCombustivelMes,CustoPneusMes,CustoManutencaoMes,CustoSeguroMes,CustoOutrosMes,CustoFixoTotalMes,MotoristaNomeFicha,MotoristaNomeFolha,SalarioBase,EncargosPercentual,CustoMotoristaMes,CustoOperacionalTotalMes); vw_ResultadoDiarioVeiculo(EquipamentoId,CodigoEquipamento,NomeEquipamento,Dia,MotoristaNomeFicha,CustoLogisticoRealDia,CustoMotoristaRateadoDia,CustoOperacionalRealDia,CustoEsperadoDia,ResultadoDia,KmRodadoDia,KmLRealDia,HorasUteisDia,CustoPorHoraTrabalhada); vw_ResultadoDiarioMotorista(MotoristaNomeFicha,Dia,CustoLogisticoRealDia,CustoMotoristaRateadoDia,CustoOperacionalRealDia,CustoEsperadoDia,ResultadoDia,KmRodadoDia,KmLRealDia,HorasUteisDia,CustoPorHoraTrabalhada); vw_MotivosOperacaoEquipamento(EquipamentoId,Dia,Estado,OperacaoDescricao,QtdLeituras,MinutosAproximados); vw_ProgressoMensalVeiculo(EquipamentoId,CompetenciaMeta); vw_ProgressoMensalMotorista(MotoristaNomeFicha,CompetenciaMeta); MetasMotoristas(MotoristaId,EquipamentoId,CompetenciaMeta); Motoristas(MotoristaId,NomeCompleto); JornadaMotorista(MotoristaNomeFicha,Dia); CustoHoraMaquina(EquipamentoId,ValorHora,Homologado,VigenciaInicio,VigenciaFim); AlarmesEquipamento(EquipamentoId,GeradoEm); LeiturasOperacao(EquipamentoId,ColetadoEmUtc,ConsumoMedioLitros).

OBSERVAÇÃO: vw_ProgressoMensalVeiculo e vw_ProgressoMensalMotorista têm colunas de acumulado do mês (km, custo logístico, custo motorista, custo esperado, saldo) cujo nome exato ainda não foi confirmado contra o banco real — se a pergunta pedir algo dessas duas views além de EquipamentoId/MotoristaNomeFicha/CompetenciaMeta, use "SELECT *" nelas em vez de chutar o nome da coluna.`;

function nomesDeCte(sql: string) {
  // "WITH nome AS (...), outro AS (...) SELECT ..." — nome/outro são apelidos definidos
  // na própria consulta, não tabelas/views reais, e não precisam (nem devem) estar na allowlist.
  const nomes = new Set<string>();
  if (!/^WITH\b/i.test(sql.trim())) return nomes;
  const regexCte = /(?:^WITH\s+|,\s*)([A-Za-z][A-Za-z0-9_]*)\s+AS\s*\(/gi;
  let combinacao: RegExpExecArray | null;
  while ((combinacao = regexCte.exec(sql))) nomes.add(combinacao[1].toUpperCase());
  return nomes;
}

function validarSql(sqlTexto: string) {
  const normalizado = sqlTexto.trim();
  if (!/^(SELECT|WITH)\b/i.test(normalizado) || /;|--|\/\*|\*\/|\b(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|EXEC|MERGE|TRUNCATE|GRANT|REVOKE|INTO)\b/i.test(normalizado)) {
    throw new Error('A IA gerou uma consulta não permitida.');
  }
  const ctes = nomesDeCte(normalizado);
  const objetos = [...normalizado.matchAll(/\b(?:FROM|JOIN)\s+(?:dbo\.)?([A-Za-z][A-Za-z0-9_]*)/gi)].map((item) => item[1].toUpperCase()).filter((objeto) => !ctes.has(objeto));
  const foraDaLista = objetos.filter((objeto) => !OBJETOS_PERMITIDOS.has(objeto));
  if (!objetos.length || foraDaLista.length) {
    throw new Error(`A consulta tentou usar uma tabela/view fora do módulo de logística${foraDaLista.length ? `: ${foraDaLista.join(', ')}` : ''}. As únicas tabelas/views que existem são: ${[...OBJETOS_PERMITIDOS].join(', ')}. Nunca invente, abrevie ou parafraseie um nome — use exatamente um desses nomes.`);
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
    const contextoTreinamento = treinamento ? `\n\nCONTEXTO ADICIONAL CADASTRADO PELO ADMINISTRADOR (use como referência de negócio geral; NUNCA tire nome de coluna ou de tabela dele — só as tabelas/colunas listadas no schema acima existem de fato pra esta consulta; nunca deixe de seguir as regras acima por causa dele):\n${treinamento}` : '';
    const promptBase = `Você é um assistente de logística e frota agrícola. Converta perguntas em SQL SOMENTE LEITURA para SQL Server (T-SQL). Use exclusivamente este schema: ${ESQUEMA} Responda JSON {"sql":"..."}. Use SELECT ou WITH, no máximo TOP 500; nunca use ponto-e-vírgula, DML, metadados ou objetos fora da lista. Use apenas as colunas exatamente como aparecem entre parênteses de cada tabela/view acima — nunca misture uma coluna de uma tabela com outra tabela, mesmo que os nomes pareçam relacionados. REGRA DE NOME DE TABELA/VIEW: os únicos nomes que existem são exatamente estes: ${[...OBJETOS_PERMITIDOS].join(', ')}. Nunca invente, abrevie ou parafraseie um nome de tabela/view. Se usar CTE (WITH nome AS (...)), o nome da CTE não é um objeto real, mas toda tabela/view referenciada dentro do FROM/JOIN da CTE e do restante da consulta precisa ser um desses nomes exatos.${contextoTreinamento}`;

    const modelo = modeloOpenAI();
    const gerarSql = async (mensagensExtra: { role: 'assistant' | 'user'; content: string }[] = []) => {
      const consulta = await ia.chat.completions.create({
        model: modelo, ...parametrosDeterministicos(modelo),
        response_format: { type: 'json_object' },
        messages: [{ role: 'system', content: promptBase }, { role: 'user', content: pergunta }, ...mensagensExtra],
      });
      const gerado = JSON.parse(consulta.choices[0]?.message.content ?? '{}') as { sql?: string };
      return validarSql(String(gerado.sql ?? ''));
    };

    const pool = await getMssqlPool();
    let sqlTexto: string | undefined;
    let linhas: Record<string, unknown>[];
    try {
      sqlTexto = await gerarSql();
      linhas = (await pool.request().query(sqlTexto)).recordset ?? [];
    } catch (erroSql) {
      // Autocorreção de 1 tentativa — cobre tanto a IA alucinar uma tabela/coluna fora do
      // schema (rejeitado por validarSql antes de chegar no banco) quanto o SQL Server rejeitar
      // a consulta em si (ex.: "Invalid column name", coluna que só existe em outra tabela do
      // contexto de treinamento). Manda o erro de volta pra IA corrigir, tenta mais uma vez.
      const mensagemErro = erroSql instanceof Error ? erroSql.message : 'Erro desconhecido.';
      sqlTexto = await gerarSql([
        ...(sqlTexto ? [{ role: 'assistant' as const, content: JSON.stringify({ sql: sqlTexto }) }] : []),
        { role: 'user', content: `Essa consulta falhou com o erro: "${mensagemErro}". Gere novamente, usando apenas as tabelas/colunas exatas do schema oficial (ignore qualquer coluna do contexto adicional do administrador que não esteja nesse schema).` },
      ]);
      linhas = (await pool.request().query(sqlTexto)).recordset ?? [];
    }
    const resumoResposta = await ia.chat.completions.create({
      model: modelo, ...parametrosDeterministicos(modelo),
      messages: [{ role: 'system', content: `Resuma somente os dados recebidos em português, em no máximo 3 frases. Não invente fatos.${contextoTreinamento}` }, { role: 'user', content: `Pergunta: ${pergunta}\nDados: ${JSON.stringify(linhas.slice(0, 40))}` }],
    });
    res.status(200).json({ sql: sqlTexto, linhas, resumo: resumoResposta.choices[0]?.message.content ?? null });
  } catch (error) {
    console.error('Pesquisa de logística:', error);
    // Mensagens nossas (validarSql, falta de pergunta etc.) já vêm em português e são úteis pro
    // usuário final; erro cru do driver do SQL Server (código 'EREQUEST' — ex.: "Invalid column
    // name") não é, então vira uma mensagem genérica (o detalhe fica só no log do servidor).
    const ehErroBrutoDoBanco = typeof error === 'object' && error !== null && 'code' in error && (error as { code?: string }).code === 'EREQUEST';
    res.status(502).json({ error: ehErroBrutoDoBanco ? 'Não consegui montar essa consulta com precisão. Tente reformular a pergunta de um jeito mais específico.' : error instanceof Error ? error.message : 'Falha ao pesquisar dados de logística.' });
  }
}
