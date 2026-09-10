import sql from 'mssql';

// Mesmo padrão de conexão do admin (admin_fazenda_progresso-main/api/_lib/mssql.ts) — o App
// é um projeto Vercel separado, então precisa da própria cópia das env vars MSSQL_* configuradas
// (mesmo banco de dados da fazenda, só duas aplicações Vercel distintas consultando).
const config: sql.config = {
  server: process.env.MSSQL_SERVER ?? '',
  port: Number(process.env.MSSQL_PORT ?? 1433),
  database: process.env.MSSQL_DATABASE,
  user: process.env.MSSQL_USER,
  password: process.env.MSSQL_PASSWORD,
  connectionTimeout: Number(process.env.MSSQL_CONNECTION_TIMEOUT_MS ?? 15000),
  // Padrão do driver (tedious) é 15s por consulta — baixo demais para agregações sobre views
  // pesadas. Timeout de conexão e de consulta são coisas diferentes no mssql.
  requestTimeout: Number(process.env.MSSQL_REQUEST_TIMEOUT_MS ?? 45000),
  options: {
    encrypt: process.env.MSSQL_ENCRYPT === 'true',
    trustServerCertificate: process.env.MSSQL_TRUST_SERVER_CERTIFICATE !== 'false',
  },
};

let poolPromise: Promise<sql.ConnectionPool> | null = null;

export function getMssqlPool(): Promise<sql.ConnectionPool> {
  if (!poolPromise) {
    poolPromise = new sql.ConnectionPool(config).connect().catch((error) => {
      poolPromise = null;
      throw error;
    });
  }
  return poolPromise;
}
