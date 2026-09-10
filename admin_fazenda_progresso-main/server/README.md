# server — backend do POC (Fazenda Progresso)

API que substitui os dados mocados dos dois frontends (`admin_fazenda_progresso` e `aap_fazenda_progresso`) por um banco de dados real, para a apresentação da POC.

## Stack

- **Node.js + TypeScript + Express** — mesma linguagem dos dois frontends (React/TS), curva de entrada baixa.
- **PostgreSQL** — banco relacional, adequado para as entidades de frota/solicitações (OS, veículos, motoristas, projetos) que já têm relacionamentos claros no mock atual.
- **Prisma** — schema tipado, migrations automáticas e client gerado a partir do `schema.prisma`, o que acelera iteração durante a POC.

O schema em `prisma/schema.prisma` foi modelado a partir das `interface`s já usadas nos dois frontends (`Usuario`, `Projeto`, `Veiculo`, `Motorista`, `SolicitacaoTransporte`/`ViagemMotorista`), então os dados que a API retorna têm o mesmo formato do que os componentes React já esperam (mudam poucos nomes de campo).

## Rodando localmente

```bash
cd server
cp .env.example .env          # ajuste DATABASE_URL se não usar o docker-compose
docker compose up -d          # sobe um Postgres local na porta 5432
npm install
npx prisma migrate dev --name init
npm run seed                  # popula com os mesmos dados do mock atual
npm run dev                   # API em http://localhost:3333
```

Teste rápido: `curl http://localhost:3333/api/solicitacoes`

## Endpoints

- `GET /health`
- `GET/POST /api/usuarios`, `GET /api/usuarios/:id`
- `GET/POST /api/projetos`
- `GET/POST/PATCH /api/veiculos`
- `GET/POST/PATCH /api/motoristas`
- `GET/POST/PATCH /api/solicitacoes`, `GET /api/solicitacoes/:id`, `POST /api/solicitacoes/:id/gps`
- `GET/PATCH /api/notificacoes`

`GET /api/solicitacoes` aceita `?status=pendente|agendada|em_execucao|concluida|cancelada`.

## Próximos passos (fora do escopo da POC)

- Trocar os imports de `src/mock/data.ts` (admin) e `populateInitialData` (app, via Dexie) por chamadas `fetch`/`axios` para esta API.
- Autenticação (hoje não há nenhuma — endpoints estão abertos).
- Estratégia de sincronização offline para o app do motorista (fila local no Dexie → replay contra `/api/solicitacoes/:id` quando a conexão voltar).
- Deploy do banco (Railway/Render/Supabase) e da API (Railway/Render/Fly.io) para a apresentação não depender da máquina local.
