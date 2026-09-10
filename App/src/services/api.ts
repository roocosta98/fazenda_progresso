// Primeiro client HTTP do App — até aqui o projeto era 100% offline (só Dexie/IndexedDB).
// Mesmo padrão de API_URL do admin (admin_fazenda_progresso-main): caminho relativo por padrão
// (funciona com `vercel dev` local e em produção no Vercel), com override opcional via
// VITE_API_URL pra apontar pra outro host em desenvolvimento.
const API_URL = import.meta.env.VITE_API_URL ?? '';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const resp = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  });
  if (!resp.ok) {
    throw new Error(`API respondeu ${resp.status} em ${path}`);
  }
  return resp.json() as Promise<T>;
}

export const api = {
  listarMotoristas: () => request<string[]>('/api/motoristas/listar'),
  minhaMeta: (motorista: string) =>
    request<import('../types').MetaMotorista[]>(`/api/metas/minha-meta?motorista=${encodeURIComponent(motorista)}`),
  metaDiaria: (motorista: string) =>
    request<import('../types').ResultadoDiarioMotorista[]>(`/api/metas/diario?modo=diario&motorista=${encodeURIComponent(motorista)}`),
  progressoMensal: (motorista: string) =>
    request<import('../types').ProgressoMensalMotorista | null>(`/api/metas/diario?modo=progresso&motorista=${encodeURIComponent(motorista)}`),
  criarChecklist: (payload: unknown) =>
    request<{ ok: true }>('/api/checklist/criar', { method: 'POST', body: JSON.stringify(payload) }),
};
