import type { VercelRequest, VercelResponse } from '@vercel/node';
import sql from 'mssql';
import { getMssqlPool } from '../_lib/mssql.js';

// Painel de Metas Completo (diário) do lado do motorista — PRD v3 §5/§10.2 ("Minhas Metas"
// ganha gráfico meta x realizado por dia e saldo do mês). Mesmas views do Admin
// (admin_fazenda_progresso-main/api/metas/diario.ts, sql/013_painel_metas_completo.sql), mas
// sempre filtrado pelo motorista logado — nunca dado de outro motorista (regra de privacidade
// não-negociável do PRD, seguida em todo o resto do App: minha-meta.ts, motoristas/listar.ts).
function competenciaAtualYYYYMM(): string {
  const agora = new Date();
  return `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}`;
}

async function modoDiario(motorista: string, res: VercelResponse) {
  const fimDefault = new Date();
  fimDefault.setUTCDate(fimDefault.getUTCDate() + 1);
  const inicioDefault = new Date(fimDefault);
  inicioDefault.setUTCDate(inicioDefault.getUTCDate() - 30);

  const pool = await getMssqlPool();
  const result = await pool.request()
    .input('motorista', sql.NVarChar, motorista)
    .input('dataInicio', sql.DateTime2, inicioDefault)
    .input('dataFim', sql.DateTime2, fimDefault)
    .query(`
      SELECT * FROM vw_ResultadoDiarioMotorista
      WHERE MotoristaNomeFicha = @motorista AND Dia >= @dataInicio AND Dia < @dataFim
      ORDER BY Dia
    `);

  res.status(200).json(result.recordset);
}

async function modoProgresso(motorista: string, competencia: string | null, res: VercelResponse) {
  const referencia = competencia ?? competenciaAtualYYYYMM();
  const [ano, mes] = referencia.split('-').map(Number);
  const inicioCompetencia = new Date(Date.UTC(ano, mes - 1, 1));
  const fimCompetencia = new Date(Date.UTC(ano, mes, 1));

  const pool = await getMssqlPool();
  const result = await pool.request()
    .input('motorista', sql.NVarChar, motorista)
    .input('inicioCompetencia', sql.DateTime2, inicioCompetencia)
    .input('fimCompetencia', sql.DateTime2, fimCompetencia)
    .query(`
      SELECT * FROM vw_ProgressoMensalMotorista
      WHERE MotoristaNomeFicha = @motorista AND Competencia >= @inicioCompetencia AND Competencia < @fimCompetencia
    `);

  res.status(200).json(result.recordset[0] ?? null);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const motorista = typeof req.query.motorista === 'string' ? req.query.motorista : null;
  if (!motorista) {
    res.status(400).json({ error: 'Parâmetro motorista é obrigatório' });
    return;
  }

  const modo = Array.isArray(req.query.modo) ? req.query.modo[0] : req.query.modo;
  const competencia = typeof req.query.competencia === 'string' ? req.query.competencia : null;

  try {
    if (modo === 'diario') return await modoDiario(motorista, res);
    if (modo === 'progresso') return await modoProgresso(motorista, competencia, res);
    res.status(400).json({ error: 'Parâmetro modo é obrigatório: diario ou progresso' });
  } catch (error) {
    console.error(`Erro ao consultar painel diário do motorista (modo=${modo}):`, error);
    res.status(502).json({ error: 'Falha ao consultar o banco de dados da fazenda (SQL Server). As views do painel diário (sql/013_painel_metas_completo.sql) existem?' });
  }
}
