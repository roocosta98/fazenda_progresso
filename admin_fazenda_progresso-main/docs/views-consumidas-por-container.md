# Views SQL consumidas por container

> Levantamento estático em 08/09/2026. Ele registra as consultas existentes no código; não comprova que as views, colunas ou permissões estejam disponíveis no SQL Server de produção.

## Visão geral

| Container | Papel | Views SQL Server consumidas diretamente |
|---|---|---|
| `admin_fazenda_progresso-main` | Painel administrativo/logística no Vercel | `vw_PainelMotoristaVeiculo`, `vw_ResultadoDiarioVeiculo`, `vw_ResultadoDiarioMotorista`, `vw_MotivosOperacaoEquipamento`, `vw_TempoMotorEquipamento`, `vw_ProgressoMensalVeiculo`, `vw_ProgressoMensalMotorista`, `vw_UltimaPosicao` |
| `App` | Aplicativo do motorista | `vw_PainelMotoristaVeiculo`, `vw_ResultadoDiarioMotorista`, `vw_ProgressoMensalMotorista` |
| `admin_fazenda_progresso-main/server` | Backend Express local/legado | `vw_UltimaPosicao` |

Os componentes React não acessam o banco: eles chamam as rotas listadas abaixo. As views são lidas pelas APIs serverless em `admin_fazenda_progresso-main/api/`, pelas APIs de `App/api/` ou pelo Express.

## Container: admin_fazenda_progresso-main

| Rota/API | View | Uso |
|---|---|---|
| `api/gastos/resumo.ts` | `vw_PainelMotoristaVeiculo` | Resumo de combustível, pneus, manutenção, outros, custo do motorista e custo operacional. Alimenta Gastos e o dashboard executivo. |
| `api/metas/painel.ts` | `vw_PainelMotoristaVeiculo` | Painel mensal de metas por motorista/equipamento. |
| `api/metas/diario.ts?modo=diario` | `vw_ResultadoDiarioVeiculo` | Custos, quilômetros, litros, meta e resultado diário por veículo. |
| `api/metas/diario.ts?modo=motoristas` | `vw_ResultadoDiarioMotorista` | Lista de motoristas com resultado diário no período. |
| `api/metas/diario.ts?modo=motivos` | `vw_MotivosOperacaoEquipamento`, `vw_ResultadoDiarioVeiculo` | Motivos de parada/operação e custo associado; cruza com a jornada do motorista. |
| `api/metas/diario.ts?modo=motor` | `vw_TempoMotorEquipamento`, `vw_ResultadoDiarioVeiculo` | Tempo de motor ligado/ocioso, limitado à jornada cadastrada. |
| `api/metas/diario.ts?modo=executivo` | `vw_ResultadoDiarioVeiculo`, `vw_PainelMotoristaVeiculo` | KPIs executivos e agregados de custo/meta. |
| `api/metas/diario.ts?modo=progresso-veiculo` | `vw_ProgressoMensalVeiculo` | Evolução mensal por veículo. |
| `api/metas/diario.ts?modo=progresso-motorista` | `vw_ProgressoMensalMotorista` | Evolução mensal por motorista. |
| `api/insights/gerar.ts` | `vw_PainelMotoristaVeiculo` | Agrega metas, gastos e horímetro/odômetro antes de solicitar a interpretação da IA. |
| `api/frota/equipamentos.ts` | `vw_UltimaPosicao` | Lista de caminhões/equipamentos disponíveis nos filtros. |
| `api/frota/posicoes.ts` | `vw_UltimaPosicao` | Posição, comunicação e estado mais recentes para mapa/monitoramento. |

### Tabelas auxiliares do painel operacional

Além das views, `api/metas/diario.ts?modo=motivos` e `?modo=motor` consultam `JornadaMotorista` e `CustoHoraMaquina`. Elas não são views e precisam ser criadas pelo script [ajustes_custo_operacional.sql](../server/sql/ajustes_custo_operacional.sql) e alimentadas/homologadas a partir do Sankhya.

## Container: App

| Rota/API | View | Uso |
|---|---|---|
| `api/motoristas/listar.ts` | `vw_PainelMotoristaVeiculo` | Localiza o motorista e os veículos associados. |
| `api/metas/minha-meta.ts` | `vw_PainelMotoristaVeiculo` | Exibe a meta individual do motorista. |
| `api/metas/diario.ts?modo=diario` | `vw_ResultadoDiarioMotorista` | Resultado diário do motorista autenticado no app. |
| `api/metas/diario.ts?modo=progresso` | `vw_ProgressoMensalMotorista` | Evolução mensal da meta do motorista. |

As rotas `api/checklist/criar.ts` e demais recursos desse container escrevem/leem tabelas operacionais diretamente; não consomem views `vw_*`.

## Container: server (Express local/legado)

| Rota/script | View | Uso |
|---|---|---|
| `server/src/routes/frota.ts` | `vw_UltimaPosicao` | Lista de frota e última telemetria. |
| `server/src/scripts/testMssql.ts` | `vw_UltimaPosicao` | Diagnóstico manual da conectividade com o SQL Server. |

As demais rotas Express operam sobre Prisma/PostgreSQL ou tabelas próprias e não fazem leitura direta de views SQL Server.

## Dependências críticas para o painel de custo operacional

```
vw_MotivosOperacaoEquipamento ─┐
vw_ResultadoDiarioVeiculo ─────┼─> api/metas/diario?modo=motivos ─> custos por motivo
JornadaMotorista ──────────────┤
CustoHoraMaquina ──────────────┘

vw_TempoMotorEquipamento ──────┐
vw_ResultadoDiarioVeiculo ─────┼─> api/metas/diario?modo=motor ───> uso do motor
JornadaMotorista ──────────────┘
```

Sem `JornadaMotorista` homologada, as leituras de parada e tempo de motor não devem ser interpretadas como ociosidade real: o código deliberadamente não usa 24 horas como jornada de trabalho.
