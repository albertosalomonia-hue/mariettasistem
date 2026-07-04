import mysql from 'mysql2/promise';

// Instancia a nivel de módulo: en invocaciones "warm" de la función serverless
// se reutiliza el mismo pool en vez de crear conexiones nuevas en cada request.
// connectionLimit bajo porque puede haber varias instancias de la función
// concurrentes, cada una con su propio pool, contra el mismo MySQL externo.
export const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'marietta_contratos',
  waitForConnections: true,
  connectionLimit: 5,
});
