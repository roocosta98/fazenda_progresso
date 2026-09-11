// Modelo configurável via OPENAI_MODEL (Vercel), default gpt-4o-mini.
export function modeloOpenAI(): string {
  return process.env.OPENAI_MODEL ?? 'gpt-4o-mini';
}

// A família gpt-5 (via Chat Completions) só aceita o temperature padrão (1) — passar 0 devolve
// erro 400 ("Unsupported value: 'temperature' does not support 0 with this model"). Os outros
// modelos (gpt-4o, gpt-4o-mini) aceitam 0, que usamos de propósito pra determinismo na geração
// de SQL. Esta função devolve só o que cada modelo aceita, pra não hardcodar uma suposição que
// quebra ao trocar de modelo.
export function parametrosDeterministicos(modelo: string): { temperature?: number } {
  return modelo.startsWith('gpt-5') ? {} : { temperature: 0 };
}
