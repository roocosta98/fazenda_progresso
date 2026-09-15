import type { VercelRequest, VercelResponse } from '@vercel/node';
import sql from 'mssql';
import { getMssqlPool } from './mssql.js';

const CHAVE_PERIODO_PADRAO = 'periodoPadrao';
export type TipoPeriodoPadrao = 'dias' | 'mes_atual' | 'trimestre_atual' | 'ano_atual';
export type PeriodoPadrao = { tipo: TipoPeriodoPadrao; dias: number };
export const PERIODO_PADRAO_FALLBACK: PeriodoPadrao = { tipo: 'dias', dias: 30 };

const TIPOS_VALIDOS: TipoPeriodoPadrao[] = ['dias', 'mes_atual', 'trimestre_atual', 'ano_atual'];

// Mesmo padrão de admin usado em iaConhecimento.ts: o proxy de autenticação do frontend
// sobrescreve este header a partir da sessão logada — nunca é o navegador quem decide.
function exigirAdmin(req: VercelRequest, res: VercelResponse) {
  if (String(req.headers['x-user-type'] ?? '') !== 'admin') { res.status(403).json({ error: 'Apenas administradores podem alterar as configurações gerais.' }); return false; }
  return true;
}

function normalizarPeriodo(valor: unknown): PeriodoPadrao {
  try {
    const obj = JSON.parse(String(valor));
    const tipo = TIPOS_VALIDOS.includes(obj?.tipo) ? obj.tipo : PERIODO_PADRAO_FALLBACK.tipo;
    const dias = Number.isInteger(obj?.dias) && obj.dias >= 1 && obj.dias <= 365 ? obj.dias : PERIODO_PADRAO_FALLBACK.dias;
    return { tipo, dias };
  } catch {
    return PERIODO_PADRAO_FALLBACK;
  }
}

// GET é lido por qualquer tela que monte um filtro "de-até" pra saber com que período pré-
// preencher os campos — a escolha de qual período usar como padrão é feita só aqui, em
// Configurações Gerais; a tela em si sempre mostra e deixa editar as duas datas livremente.
// Por isso não tem gate de admin no GET.
export async function configuracaoGeral(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  try {
    if (req.method === 'GET') {
      const pool = await getMssqlPool();
      const resultado = await pool.request().input('chave', sql.NVarChar, CHAVE_PERIODO_PADRAO)
        .query(`SELECT Valor FROM dbo.ConfiguracaoSistema WHERE Chave=@chave`);
      const periodoPadrao = resultado.recordset[0]?.Valor ? normalizarPeriodo(resultado.recordset[0].Valor) : PERIODO_PADRAO_FALLBACK;
      return res.status(200).json({ periodoPadrao });
    }
    if (req.method === 'PUT') {
      if (!exigirAdmin(req, res)) return;
      const tipo = req.body?.tipo;
      if (!TIPOS_VALIDOS.includes(tipo)) return res.status(400).json({ error: 'Tipo de período inválido.' });
      const dias = Number(req.body?.dias);
      if (tipo === 'dias' && (!Number.isInteger(dias) || dias < 1 || dias > 365)) return res.status(400).json({ error: 'Informe um prazo entre 1 e 365 dias.' });
      const periodoPadrao: PeriodoPadrao = { tipo, dias: tipo === 'dias' ? dias : PERIODO_PADRAO_FALLBACK.dias };
      const pool = await getMssqlPool();
      await pool.request()
        .input('chave', sql.NVarChar, CHAVE_PERIODO_PADRAO)
        .input('valor', sql.NVarChar, JSON.stringify(periodoPadrao))
        .query(`MERGE dbo.ConfiguracaoSistema AS destino USING (SELECT @chave AS Chave) AS origem ON destino.Chave = origem.Chave
                WHEN MATCHED THEN UPDATE SET Valor=@valor, AtualizadoEm=SYSUTCDATETIME()
                WHEN NOT MATCHED THEN INSERT (Chave, Valor, AtualizadoEm) VALUES (@chave, @valor, SYSUTCDATETIME());`);
      return res.status(200).json({ ok: true });
    }
    return res.status(405).json({ error: 'Método não permitido' });
  } catch (error) {
    // Mesma postura tolerante do treinamento de IA: se dbo.ConfiguracaoSistema ainda não existe
    // nesta instalação, o sistema inteiro segue com o padrão de 30 dias em vez de tela quebrada.
    if (req.method === 'GET') return res.status(200).json({ periodoPadrao: PERIODO_PADRAO_FALLBACK });
    res.status(502).json({ error: error instanceof Error ? error.message : 'Falha ao salvar configuração geral. A tabela dbo.ConfiguracaoSistema existe no banco?' });
  }
}
