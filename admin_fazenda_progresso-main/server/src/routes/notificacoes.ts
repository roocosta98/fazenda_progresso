import { Router } from 'express';
import { prisma } from '../lib/prisma.js';

const router = Router();

router.get('/', async (_req, res) => {
  const notificacoes = await prisma.notificacao.findMany({ orderBy: { createdAt: 'desc' } });
  res.json(notificacoes);
});

router.patch('/:id', async (req, res) => {
  const notificacao = await prisma.notificacao.update({ where: { id: req.params.id }, data: req.body });
  res.json(notificacao);
});

export default router;
