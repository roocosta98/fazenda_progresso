import type { VercelRequest, VercelResponse } from '@vercel/node';
import sql from 'mssql';
import { getMssqlPool } from '../_lib/mssql.js';

// Grava o Checklist de Atividade (ICO, PRD 4.5) nas tabelas novas ChecklistAtividade +
// ChecklistAtividadeItem (server/sql/checklist_avaliacao.sql no admin_fazenda_progresso-main —
// precisa ter sido executado no SQL Server antes deste endpoint funcionar).
//
// EquipamentoId é resolvido pela placa (veiculoPlaca do cadastro Postgres de viagens) contra
// Equipamentos.CodigoEquipamento — os dois sistemas usam o mesmo formato de placa como código do
// equipamento (ver PRD 5.2: "chave sempre pelo código do equipamento, nunca pelo nome"). Se não
// achar, grava mesmo assim com EquipamentoId nulo (mais vale registrar o checklist do que perder
// o preenchimento por causa de uma placa que não bateu).
interface ChecklistPayload {
  viagemId: string;
  motorista: string;
  respondidoPor: string;
  veiculoPlaca?: string;
  observacao?: string;
  itens: { item: string; conforme: boolean; observacao?: string }[];
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método não permitido' });
    return;
  }

  const payload = req.body as ChecklistPayload;
  if (!payload?.motorista || !payload?.respondidoPor || !Array.isArray(payload.itens) || payload.itens.length === 0) {
    res.status(400).json({ error: 'motorista, respondidoPor e itens são obrigatórios' });
    return;
  }

  try {
    const pool = await getMssqlPool();

    let equipamentoId: number | null = null;
    if (payload.veiculoPlaca) {
      const eq = await pool.request()
        .input('placa', sql.NVarChar, payload.veiculoPlaca)
        .query('SELECT TOP 1 EquipamentoId FROM Equipamentos WHERE CodigoEquipamento = @placa');
      equipamentoId = eq.recordset[0]?.EquipamentoId ?? null;
    }

    const header = await pool.request()
      .input('motoristaNomeFicha', sql.NVarChar, payload.motorista)
      .input('equipamentoId', sql.Int, equipamentoId)
      .input('veiculoPlacaOrigem', sql.NVarChar, payload.veiculoPlaca ?? null)
      .input('respondidoPor', sql.NVarChar, payload.respondidoPor)
      .input('observacao', sql.NVarChar, payload.observacao ?? null)
      .query(`
        INSERT INTO ChecklistAtividade (MotoristaNomeFicha, EquipamentoId, VeiculoPlacaOrigem, RespondidoPor, Observacao)
        OUTPUT INSERTED.ChecklistAtividadeId
        VALUES (@motoristaNomeFicha, @equipamentoId, @veiculoPlacaOrigem, @respondidoPor, @observacao)
      `);

    const checklistAtividadeId = header.recordset[0].ChecklistAtividadeId as number;

    for (const item of payload.itens) {
      await pool.request()
        .input('checklistAtividadeId', sql.Int, checklistAtividadeId)
        .input('item', sql.NVarChar, item.item)
        .input('conforme', sql.Bit, item.conforme)
        .input('observacao', sql.NVarChar, item.observacao ?? null)
        .query(`
          INSERT INTO ChecklistAtividadeItem (ChecklistAtividadeId, Item, Conforme, Observacao)
          VALUES (@checklistAtividadeId, @item, @conforme, @observacao)
        `);
    }

    res.status(200).json({ ok: true, checklistAtividadeId });
  } catch (error) {
    console.error('Erro ao gravar ChecklistAtividade:', error);
    res.status(502).json({ error: 'Falha ao gravar no banco de dados da fazenda (SQL Server). As tabelas ChecklistAtividade/ChecklistAtividadeItem existem?' });
  }
}
