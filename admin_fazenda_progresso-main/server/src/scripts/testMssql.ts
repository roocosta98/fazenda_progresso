import 'dotenv/config';
import { getMssqlPool } from '../lib/mssql.js';

async function main() {
  console.log(`Conectando em ${process.env.MSSQL_SERVER}:${process.env.MSSQL_PORT} / banco ${process.env.MSSQL_DATABASE}...`);
  const pool = await getMssqlPool();
  const result = await pool.request().query('SELECT * FROM vw_UltimaPosicao ORDER BY 2');
  console.log(`Conectado! ${result.recordset.length} linha(s) em vw_UltimaPosicao:`);
  console.table(result.recordset);
  await pool.close();
  process.exit(0);
}

main().catch((error) => {
  console.error('Falha ao conectar/consultar o SQL Server:', error.message ?? error);
  process.exit(1);
});
