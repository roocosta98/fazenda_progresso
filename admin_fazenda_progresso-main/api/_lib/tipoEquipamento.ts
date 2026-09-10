// Filtro de caminhão / veículos de transporte:
// Traz o veículo se contiver "cam", "caminhao", "caminhão" no nome, no código ou na descrição do tipo.
export const FILTRO_TIPO_CAMINHAO_LIKE = '%cam%';

export const FILTRO_CAMINHAO_SQL = `(
  eq.Nome LIKE '%cam%'
  OR eq.Nome LIKE '%caminh%'
  OR eq.Nome LIKE '%caminhão%'
  OR eq.CodigoEquipamento LIKE '%cam%'
  OR te.Descricao LIKE '%cam%'
  OR te.Descricao LIKE '%caminh%'
  OR te.Descricao LIKE '%caminhão%'
)`;

