import type { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI from 'openai';
import { exigirAcessoCustos } from './custosAuth.js';
import { treinamentoAtivo } from './iaConhecimento.js';
import { modeloOpenAI, parametrosDeterministicos } from './openaiConfig.js';

// Uma linha de insight por seção do painel de estoque, gerada a partir dos dados que a própria
// tela já carregou (o cliente manda uma amostra, não fazemos consulta nova ao Sankhya aqui).
// Uma chamada só pro painel inteiro — não uma por seção — pra não multiplicar custo de IA a
// cada carregamento de tela.
export async function insightEstoque(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });
  if (!exigirAcessoCustos(req, res)) return;
  if (!process.env.OPENAI_API_KEY) return res.status(503).json({ error: 'Insight por IA precisa de OPENAI_API_KEY configurada na Vercel.' });
  const secoes = req.body?.secoes;
  if (!secoes || typeof secoes !== 'object') return res.status(400).json({ error: 'Envie "secoes": { nome: linhas[] }.' });
  // Amostra pequena por seção — o insight é sobre padrão geral, não precisa do dataset inteiro,
  // e mantém o prompt (e o custo) pequeno independente de quantas linhas a tela carregou.
  const amostra = Object.fromEntries(
    Object.entries(secoes).map(([nome, linhas]) => [nome, Array.isArray(linhas) ? linhas.slice(0, 15) : linhas])
  );
  try {
    const ia = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    // Mesmo treinamento cadastrado em Administração > Configuração de IA usado na pesquisa por
    // IA — garante que o insight não contradiz uma regra de negócio ou particularidade de dado
    // já documentada (ex.: um campo que sempre vem zerado nesta instalação).
    const treinamento = await treinamentoAtivo('estoque');
    const contextoTreinamento = treinamento ? `\n\nCONTEXTO ADICIONAL CADASTRADO PELO ADMINISTRADOR (use como referência de negócio):\n${treinamento}` : '';
    const modelo = modeloOpenAI();
    const resposta = await ia.chat.completions.create({
      model: modelo, ...parametrosDeterministicos(modelo),
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: `Você é um analista de estoque agrícola (produção de batata, uva/vinícola e café — a fazenda não vende ao consumidor final pelo estoque; toda saída é consumo interno pra produção, manutenção ou baixa). Para cada seção recebida no JSON, escreva UMA frase curta (máximo 20 palavras) em português com o achado mais relevante daquela amostra de dados. Nunca use a palavra "venda" (mesmo que o dado traga um campo como DIASSEMVENDA) — diga "saída", "consumo" ou "movimentação". Nunca invente números que não estejam nos dados enviados; se a amostra estiver vazia ou não tiver nada notável, diga isso em poucas palavras. Responda em JSON no formato {"nome_da_secao": "frase"}, uma chave por seção recebida.${contextoTreinamento}` },
        { role: 'user', content: JSON.stringify(amostra) },
      ],
    });
    const insights = JSON.parse(resposta.choices[0]?.message.content ?? '{}');
    res.status(200).json({ insights });
  } catch (error) {
    console.error('Insight de estoque:', error);
    res.status(502).json({ error: error instanceof Error ? error.message : 'Falha ao gerar insight.' });
  }
}
