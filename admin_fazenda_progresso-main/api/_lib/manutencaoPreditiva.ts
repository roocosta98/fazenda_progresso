// Limites de manutenção preditiva leve (Insights IA, categoria "Manutencao" — PRD v3 seção 12:
// "alerta preditivo de manutenção baseado no acúmulo de horímetro/odômetro"). Não é IA pesada,
// é regra simples em cima de dado que já flui (vw_PainelMotoristaVeiculo.HorimetroOdometroAtual).
//
// PLACEHOLDER — documentado como provisório até validar com o Cristiano/fabricante dos
// equipamentos, mesmo padrão já usado nos itens de checklist e critérios de avaliação de condução.
export const INTERVALO_REVISAO_KM_HORAS = 20000;
export const MARGEM_ALERTA_KM_HORAS = 1500;
