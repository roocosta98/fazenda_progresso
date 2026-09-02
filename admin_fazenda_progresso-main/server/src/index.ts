import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import usuariosRouter from './routes/usuarios.js';
import projetosRouter from './routes/projetos.js';
import veiculosRouter from './routes/veiculos.js';
import motoristasRouter from './routes/motoristas.js';
import solicitacoesRouter from './routes/solicitacoes.js';
import notificacoesRouter from './routes/notificacoes.js';
import frotaRouter from './routes/frota.js';

const app = express();
const allowedOrigins = (process.env.CORS_ORIGINS ?? '').split(',').map((origin) => origin.trim()).filter(Boolean);

app.use(cors({ origin: allowedOrigins.length > 0 ? allowedOrigins : true }));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/usuarios', usuariosRouter);
app.use('/api/projetos', projetosRouter);
app.use('/api/veiculos', veiculosRouter);
app.use('/api/motoristas', motoristasRouter);
app.use('/api/solicitacoes', solicitacoesRouter);
app.use('/api/notificacoes', notificacoesRouter);
app.use('/api/frota', frotaRouter);

const port = Number(process.env.PORT ?? 3333);
app.listen(port, () => {
  console.log(`API rodando em http://localhost:${port}`);
});
