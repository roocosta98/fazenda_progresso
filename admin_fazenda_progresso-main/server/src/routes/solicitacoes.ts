import { Router } from 'express';
import { prisma } from '../lib/prisma.js';

const router = Router();

const include = {
  solicitante: true,
  projeto: true,
  veiculo: true,
  motorista: true,
  historicoTrocaVeiculo: true,
  gpsPings: true,
} as const;

router.get('/', async (req, res) => {
  const { status } = req.query;
  const solicitacoes = await prisma.solicitacaoTransporte.findMany({
    where: status ? { status: status as any } : undefined,
    include,
    orderBy: { dataSolicitacao: 'desc' },
  });
  res.json(solicitacoes);
});

router.get('/:id', async (req, res) => {
  const solicitacao = await prisma.solicitacaoTransporte.findUnique({
    where: { id: req.params.id },
    include,
  });
  if (!solicitacao) return res.status(404).json({ error: 'Solicitação não encontrada' });
  res.json(solicitacao);
});

router.post('/', async (req, res) => {
  const solicitacao = await prisma.solicitacaoTransporte.create({ data: req.body, include });
  res.status(201).json(solicitacao);
});

router.patch('/:id', async (req, res) => {
  const solicitacao = await prisma.solicitacaoTransporte.update({
    where: { id: req.params.id },
    data: req.body,
    include,
  });
  res.json(solicitacao);
});

router.post('/:id/gps', async (req, res) => {
  const { lat, lng } = req.body;
  const ping = await prisma.gpsPing.create({
    data: { solicitacaoId: req.params.id, lat, lng },
  });
  res.status(201).json(ping);
});

export default router;
