// Critérios padrão de Avaliação de Condução (IEC, PRD 4.5) — [PENDENTE] no PRD: falta pedir pro
// Cristiano a lista exata de critérios que ele usa hoje. Até lá, usa os que ele mencionou
// verbalmente (frenagem brusca, aceleração, cinto, sinalização). Central num array só, igual ao
// checklist do App (App/src/config/checklist.ts), pra trocar sem mexer em query nem schema.
export const CRITERIOS_AVALIACAO_CONDUCAO = [
  'Frenagem brusca',
  'Aceleração',
  'Uso de cinto de segurança',
  'Sinalização',
] as const;
