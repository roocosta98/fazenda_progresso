import type { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI from 'openai';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';

function exigirAdmin(req: VercelRequest, res: VercelResponse) {
  if (String(req.headers['x-user-type'] ?? '') !== 'admin') { res.status(403).json({ error: 'Apenas administradores podem gerir a configuração de IA.' }); return false; }
  return true;
}

// Vercel limita o corpo da requisição de uma serverless function a ~4.5MB — não é algo
// configurável por código, é limite de plataforma. Base64 é ~33% maior que o arquivo original,
// então o arquivo em si precisa ficar bem abaixo disso pra sobrar espaço pro resto do corpo.
const TAMANHO_MAXIMO_BYTES = 3 * 1024 * 1024; // 3MB de arquivo original
const CARACTERES_MAXIMOS_PARA_IA = 40000;

async function extrairTexto(nomeArquivo: string, buffer: Buffer): Promise<string> {
  const extensao = (nomeArquivo.split('.').pop() ?? '').toLowerCase();
  if (extensao === 'pdf') {
    const resultado = await pdfParse(buffer);
    return resultado.text;
  }
  if (extensao === 'docx') {
    const resultado = await mammoth.extractRawText({ buffer });
    return resultado.value;
  }
  if (extensao === 'xlsx' || extensao === 'xls') {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    return workbook.SheetNames.map((nome) => {
      const planilha = workbook.Sheets[nome];
      return `### Planilha: ${nome}\n${XLSX.utils.sheet_to_csv(planilha)}`;
    }).join('\n\n');
  }
  // .txt, .md, .csv e qualquer outro texto simples: decodifica direto como UTF-8.
  return buffer.toString('utf-8');
}

export async function importarConhecimentoIA(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });
  if (!exigirAdmin(req, res)) return;
  if (!process.env.OPENAI_API_KEY) return res.status(503).json({ error: 'A importação por IA precisa de OPENAI_API_KEY configurada na Vercel.' });
  const { nomeArquivo, conteudoBase64 } = req.body ?? {};
  if (!nomeArquivo || !conteudoBase64) return res.status(400).json({ error: 'Envie nomeArquivo e conteudoBase64.' });
  try {
    const buffer = Buffer.from(String(conteudoBase64), 'base64');
    if (buffer.byteLength > TAMANHO_MAXIMO_BYTES) return res.status(413).json({ error: 'Arquivo grande demais (limite de 3MB por causa do tamanho máximo de requisição da Vercel). Divida o conteúdo em partes menores.' });

    const textoExtraido = (await extrairTexto(String(nomeArquivo), buffer)).trim();
    if (!textoExtraido) return res.status(422).json({ error: 'Não consegui extrair nenhum texto desse arquivo. Ele pode ser uma imagem escaneada ou estar vazio.' });

    const textoTruncado = textoExtraido.length > CARACTERES_MAXIMOS_PARA_IA;
    const textoParaIa = textoExtraido.slice(0, CARACTERES_MAXIMOS_PARA_IA);

    const ia = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const sugestao = await ia.chat.completions.create({
      model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini', temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `Você organiza documentos pra virarem entradas de uma base de treinamento de IA de um sistema de gestão agrícola (Fazenda Progresso). Dado o texto extraído de um arquivo, devolva JSON {"titulo":"...","tipo":"schema|prompt|texto","modulo":"geral|estoque|logistica_frota|producao_batata|manutencao","conteudo":"..."}.
- "tipo"="schema" se o texto documenta nomes de tabela/coluna, valores de campo do banco de dados ou do Sankhya.
- "tipo"="prompt" se o texto é uma instrução de como a IA deve se comportar ao responder.
- "tipo"="texto" para qualquer outro conteúdo de negócio (observação, política interna, glossário).
- "modulo": tente identificar pelo conteúdo (estoque/Sankhya, logística/frota, produção/batata, manutenção); use "geral" se não for claro ou se valer pra mais de um módulo.
- "conteudo": reescreva de forma organizada e objetiva (tópicos/tabelas quando fizer sentido), preservando todo fato e número presente no texto original — nunca invente nem resuma a ponto de perder informação real. Se o texto já estiver bem organizado, mantenha como está.
- "titulo": curto, descritivo, sem repetir o nome do arquivo.` ,
        },
        { role: 'user', content: `Nome do arquivo: ${nomeArquivo}\n\nTexto extraído:\n${textoParaIa}` },
      ],
    });
    const resultado = JSON.parse(sugestao.choices[0]?.message.content ?? '{}') as { titulo?: string; tipo?: string; modulo?: string; conteudo?: string };

    res.status(200).json({
      titulo: resultado.titulo ?? nomeArquivo,
      tipo: ['schema', 'prompt', 'texto'].includes(String(resultado.tipo)) ? resultado.tipo : 'texto',
      modulo: resultado.modulo ?? 'geral',
      conteudo: resultado.conteudo ?? textoExtraido,
      truncado: textoTruncado,
    });
  } catch (error) {
    console.error('Importação de arquivo para Configuração de IA:', error);
    res.status(502).json({ error: error instanceof Error ? error.message : 'Falha ao processar o arquivo.' });
  }
}
