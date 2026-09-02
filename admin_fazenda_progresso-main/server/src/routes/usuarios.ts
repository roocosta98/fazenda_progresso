import { Router } from 'express';
import { prisma } from '../lib/prisma.js';

const router = Router();

router.get('/', async (_req, res) => {
  const usuarios = await prisma.usuario.findMany({ orderBy: { nome: 'asc' } });
  res.json(usuarios);
});

router.get('/:id', async (req, res) => {
  const usuario = await prisma.usuario.findUnique({ where: { id: req.params.id } });
  if (!usuario) return res.status(404).json({ error: 'Usuário não encontrado' });
  res.json(usuario);
});

router.post('/', async (req, res) => {
  const usuario = await prisma.usuario.create({ data: req.body });
  res.status(201).json(usuario);
});

export default router;
