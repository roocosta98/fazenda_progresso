import sql from 'mssql';

const config: sql.config = {
  server: process.env.MSSQL_SERVER ?? '',
  port: Number(process.env.MSSQL_PORT ?? 1433),
  database: process.env.MSSQL_DATABASE,
  user: process.env.MSSQL_USER,
  password: process.env.MSSQL_PASSWORD,
  connectionTimeout: Number(process.env.MSSQL_CONNECTION_TIMEOUT_MS ?? 15000),
  options: {
    encrypt: process.env.MSSQL_ENCRYPT === 'true',
    trustServerCertificate: process.env.MSSQL_TRUST_SERVER_CERTIFICATE !== 'false',
  },
};

// Reaproveita a pool entre invocações "quentes" da function (evita reconectar a cada request)
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
