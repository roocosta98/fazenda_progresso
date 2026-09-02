import { Router } from 'express';
import { prisma } from '../lib/prisma.js';

const router = Router();

router.get('/', async (_req, res) => {
  const veiculos = await prisma.veiculo.findMany({ orderBy: { placa: 'asc' } });
  res.json(veiculos);
});

router.post('/', async (req, res) => {
  const veiculo = await prisma.veiculo.create({ data: req.body });
  res.status(201).json(veiculo);
});

router.patch('/:id', async (req, res) => {
  const veiculo = await prisma.veiculo.update({ where: { id: req.params.id }, data: req.body });
  res.json(veiculo);
});

export default router;
