import type { VercelRequest, VercelResponse } from '@vercel/node';
import sql from 'mssql';
import { getMssqlPool } from '../_lib/mssql.js';

// Metas órfãs (Fase B2, PRD §4.3 [PENDENTE]) — a última vaga reservada do limite de 12
// serverless functions do Admin (ver PR #4). Diferente do resto do painel de metas, este
// endpoint consulta MetasMotoristas DIRETO (tabela base, não a view), porque a view
// vw_PainelMotoristaVeiculo não expõe MetaMotoristaId (a chave real da meta) nem a coluna de
// vínculo MotoristaId — sem a PK real eu não conseguiria identificar com segurança qual linha
// atualizar. Nomes de coluna confirmados pelo Rodrigo direto no DBeaver (SELECT TOP 1 * FROM
// MetasMotoristas / Motoristas) — não é a mesma situação de "adivinhar nome de coluna" que já
// deu errado antes com CustosFixosEquipamento.
//
// ?modo=orfas&competencia=AAAA-MM -> lista metas sem motorista vinculado (MotoristaId IS NULL)
// ?modo=motoristas -> lista o cadastro real de motoristas (Motoristas), pra popular o combobox
// POST { metaMotoristaId, motoristaId } -> vincula (só se ainda estiver órfã, nunca sobrescreve
//   um vínculo já existente)

function competenciaAtualYYYYMM(): string {
  const agora = new Date();
  return `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}`;
}

async function modoOrfas(req: VercelRequest, res: VercelResponse) {
  const competencia = typeof req.query.competencia === 'string' ? req.query.competencia : competenciaAtualYYYYMM();
  const [ano, mes] = competencia.split('-').map(Number);
  const inicioCompetencia = new Date(Date.UTC(ano, mes - 1, 1));
  const fimCompetencia = new Date(Date.UTC(ano, mes, 1));

  const pool = await getMssqlPool();
  const result = await pool.request()
    .input('inicioCompetencia', sql.DateTime2, inicioCompetencia)
    .input('fimCompetencia', sql.DateTime2, fimCompetencia)
    .query(`
      SELECT MetaMotoristaId, Competencia, CodigoConjunto, Placa, VeiculoModelo, Atividade, MetaKmL, MetaCpk, MotoristaNome
      FROM MetasMotoristas
      WHERE MotoristaId IS NULL AND Competencia >= @inicioCompetencia AND Competencia < @fimCompetencia
      ORDER BY Atividade, Placa
    `);

  res.status(200).json(result.recordset);
}

async function modoMotoristas(res: VercelResponse) {
  const pool = await getMssqlPool();
  const result = await pool.request().query(`
    SELECT MotoristaId, CodigoFuncionario, NomeCompleto
    FROM Motoristas
    ORDER BY NomeCompleto
  `);
  res.status(200).json(result.recordset);
}

async function vincular(req: VercelRequest, res: VercelResponse) {
  const { metaMotoristaId, motoristaId } = req.body ?? {};
  if (typeof metaMotoristaId !== 'number' || typeof motoristaId !== 'number') {
    res.status(400).json({ error: 'metaMotoristaId e motoristaId são obrigatórios e devem ser numéricos' });
    return;
  }

  const pool = await getMssqlPool();
  const result = await pool.request()
    .input('metaMotoristaId', sql.Int, metaMotoristaId)
    .input('motoristaId', sql.Int, motoristaId)
    .query(`
      UPDATE MetasMotoristas
      SET MotoristaId = @motoristaId,
          MotoristaNome = (SELECT NomeCompleto FROM Motoristas WHERE MotoristaId = @motoristaId)
      OUTPUT INSERTED.MetaMotoristaId, INSERTED.MotoristaId, INSERTED.MotoristaNome
      WHERE MetaMotoristaId = @metaMotoristaId AND MotoristaId IS NULL
    `);

  if (result.recordset.length === 0) {
    res.status(409).json({ error: 'Esta meta já não está mais órfã (foi vinculada por outra pessoa nesse meio tempo) ou não existe mais.' });
    return;
  }

  res.status(200).json(result.recordset[0]);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method === 'GET') {
      const modo = Array.isArray(req.query.modo) ? req.query.modo[0] : req.query.modo;
      if (modo === 'orfas') return await modoOrfas(req, res);
      if (modo === 'motoristas') return await modoMotoristas(res);
      res.status(400).json({ error: 'Parâmetro modo é obrigatório: orfas ou motoristas' });
      return;
    }
    if (req.method === 'POST') return await vincular(req, res);
    res.status(405).json({ error: 'Método não permitido' });
  } catch (error) {
    console.error('Erro em vincular-motorista:', error);
    res.status(502).json({ error: 'Falha ao consultar/gravar no banco de dados da fazenda (SQL Server)' });
  }
}
