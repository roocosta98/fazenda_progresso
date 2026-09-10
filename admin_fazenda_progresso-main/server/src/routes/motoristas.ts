import { Router } from 'express';
import { prisma } from '../lib/prisma.js';

const router = Router();

router.get('/', async (_req, res) => {
  const motoristas = await prisma.motorista.findMany({ orderBy: { nome: 'asc' } });
  res.json(motoristas);
});

router.post('/', async (req, res) => {
  const motorista = await prisma.motorista.create({ data: req.body });
  res.status(201).json(motorista);
});

router.patch('/:id', async (req, res) => {
  const motorista = await prisma.motorista.update({ where: { id: req.params.id }, data: req.body });
  res.json(motorista);
});

export default router;
