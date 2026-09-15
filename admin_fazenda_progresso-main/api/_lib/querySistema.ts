import sql from 'mssql';
import { getMssqlPool } from './mssql.js';

// Comandos que NUNCA podem aparecer numa query editável pela tela de Configurações Gerais —
// essa tela só existe pra trocar o SELECT que já roda, nunca pra escrever no banco. Essa lista
// não é uma sandbox de SQL completa (não impede um SELECT malicioso contra outra tabela, por
// exemplo), mas barra o cenário mais comum e mais grave: um admin erra a mão e apaga/altera
// dado de produção sem querer.
const COMANDOS_PROIBIDOS = /\b(INSERT|UPDATE|DELETE|DROP|ALTER|EXEC|EXECUTE|TRUNCATE|MERGE|GRANT|REVOKE|CREATE|DENY|BACKUP|RESTORE)\b/i;
const PREFIXO_PROIBIDO = /\bsp_|\bxp_/i;

// Exportado pra iaConhecimento.ts validar no MOMENTO DE SALVAR (o admin vê o erro na hora, em
// vez de salvar algo que só vai ser silenciosamente ignorado depois na hora de rodar a query).
export function validarSomenteLeitura(textoSql: string): string | null {
  const limpo = textoSql.trim();
  if (!/^(SELECT|WITH)\b/i.test(limpo)) return 'não começa com SELECT ou WITH';
  if (COMANDOS_PROIBIDOS.test(limpo)) return 'contém um comando não permitido (só leitura é aceito)';
  if (PREFIXO_PROIBIDO.test(limpo)) return 'contém chamada a procedure de sistema (sp_/xp_), não permitida';
  return null;
}

// Substituição de placeholders {{nome}} pelos valores já validados/internos que o backend
// monta pra cada requisição (datas já checadas por validarDataIso, filtros fixos definidos no
// código) — nunca texto vindo direto do usuário final da tela. Isso mantém a mesma segurança
// da interpolação que o código já fazia antes (${dataInicio} etc.), só que a partir de um
// template guardado no banco em vez de um template literal do TypeScript.
function aplicarPlaceholders(textoSql: string, valores: Record<string, string | number>): string {
  return Object.entries(valores).reduce(
    (acumulado, [chave, valor]) => acumulado.split(`{{${chave}}}`).join(String(valor)),
    textoSql,
  );
}

// Carrega a versão customizada de uma query (cadastrada em Configurações Gerais > Treinamento
// de IA, tipo "Query SQL executável") pela chave estável dela; se não houver customização ativa,
// ou se ela falhar em qualquer validação, usa silenciosamente o SQL padrão do código (a tela
// nunca fica fora do ar por causa de uma query customizada quebrada — só deixa de refletir a
// edição até alguém corrigir).
export async function carregarQuerySql(chave: string, sqlPadrao: string, valores: Record<string, string | number>): Promise<string> {
  try {
    const pool = await getMssqlPool();
    const resultado = await pool.request().input('chave', sql.NVarChar, chave)
      .query(`SELECT TOP 1 Conteudo FROM dbo.ConfiguracaoIA WHERE Tipo='query' AND ChaveQuery=@chave AND Ativo=1 ORDER BY AtualizadoEm DESC`);
    const textoCustom = resultado.recordset[0]?.Conteudo;
    if (!textoCustom || !String(textoCustom).trim()) return sqlPadrao;

    const motivo = validarSomenteLeitura(String(textoCustom));
    if (motivo) {
      console.error(`Query customizada '${chave}' ignorada (${motivo}) — usando a query padrão do sistema.`);
      return sqlPadrao;
    }
    return aplicarPlaceholders(String(textoCustom), valores);
  } catch (error) {
    // Mesma postura tolerante do treinamento de IA: se a coluna/tabela ainda não existir nesta
    // instalação ou a consulta falhar, segue com a query padrão em vez de quebrar a tela.
    console.error(`Falha ao carregar query customizada '${chave}' (seguindo com a query padrão):`, error);
    return sqlPadrao;
  }
}
