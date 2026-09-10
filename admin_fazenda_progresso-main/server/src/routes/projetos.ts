import { Router } from 'express';
import { prisma } from '../lib/prisma.js';

const router = Router();

router.get('/', async (_req, res) => {
  const projetos = await prisma.projeto.findMany({ orderBy: { nome: 'asc' } });
  res.json(projetos);
});

router.post('/', async (req, res) => {
  const projeto = await prisma.projeto.create({ data: req.body });
  res.status(201).json(projeto);
});

export default router;
