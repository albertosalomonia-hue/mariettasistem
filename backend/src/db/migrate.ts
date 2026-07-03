import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function migrate() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true,
  });

  const dbName = process.env.DB_NAME || 'marietta_contratos';
  await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4`);
  await connection.changeUser({ database: dbName });

  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
  await connection.query(sql);

  await migrarColumnaUsuario(connection, dbName);
  await migrarColumnaEmpleadoId(connection, dbName);
  await migrarColumnaFotoPath(connection, dbName);

  console.log(`Migración aplicada sobre la base de datos "${dbName}".`);
  await connection.end();
}

/**
 * Parche idempotente para bases creadas antes de que existiera la columna "usuario"
 * en la tabla usuarios. Usa information_schema en vez de "ADD COLUMN IF NOT EXISTS"
 * porque esa sintaxis no es válida en MySQL 8.0 dentro de ALTER TABLE ... ADD COLUMN.
 */
async function migrarColumnaUsuario(connection: mysql.Connection, dbName: string) {
  const [columnas]: any = await connection.query(
    `SELECT COLUMN_NAME, IS_NULLABLE FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'usuarios' AND COLUMN_NAME IN ('usuario', 'email')`,
    [dbName],
  );
  const usuarioCol = columnas.find((c: any) => c.COLUMN_NAME === 'usuario');
  const emailCol = columnas.find((c: any) => c.COLUMN_NAME === 'email');

  if (!usuarioCol) {
    await connection.query(
      'ALTER TABLE usuarios ADD COLUMN usuario VARCHAR(100) NULL AFTER nombre_completo',
    );
    await connection.query(
      "UPDATE usuarios SET usuario = SUBSTRING_INDEX(email, '@', 1) WHERE usuario IS NULL AND email IS NOT NULL",
    );
    await connection.query(
      "UPDATE usuarios SET usuario = CONCAT('usuario', id) WHERE usuario IS NULL",
    );
    await connection.query('ALTER TABLE usuarios MODIFY COLUMN usuario VARCHAR(100) NOT NULL');

    const [indices]: any = await connection.query(
      `SELECT 1 FROM information_schema.STATISTICS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'usuarios' AND INDEX_NAME = 'uq_usuarios_usuario'`,
      [dbName],
    );
    if (!indices.length) {
      await connection.query('ALTER TABLE usuarios ADD UNIQUE KEY uq_usuarios_usuario (usuario)');
    }
  }

  if (emailCol && emailCol.IS_NULLABLE === 'NO') {
    await connection.query('ALTER TABLE usuarios MODIFY COLUMN email VARCHAR(255) NULL');
  }
}

/**
 * Parche idempotente: agrega usuarios.empleado_id para vincular una cuenta de
 * rol "trabajador" con su registro de empleado (portal del trabajador).
 */
async function migrarColumnaEmpleadoId(connection: mysql.Connection, dbName: string) {
  const [columnas]: any = await connection.query(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'usuarios' AND COLUMN_NAME = 'empleado_id'`,
    [dbName],
  );
  if (columnas.length) return;

  await connection.query(
    'ALTER TABLE usuarios ADD COLUMN empleado_id INT NULL AFTER empresa_id',
  );
  await connection.query(
    'ALTER TABLE usuarios ADD CONSTRAINT fk_usuarios_empleado FOREIGN KEY (empleado_id) REFERENCES empleados(id)',
  );
  await connection.query('ALTER TABLE usuarios ADD UNIQUE KEY uq_usuarios_empleado (empleado_id)');
}

/**
 * Parche idempotente: agrega empleados.foto_path para la foto de perfil del empleado.
 */
async function migrarColumnaFotoPath(connection: mysql.Connection, dbName: string) {
  const [columnas]: any = await connection.query(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'empleados' AND COLUMN_NAME = 'foto_path'`,
    [dbName],
  );
  if (columnas.length) return;

  await connection.query('ALTER TABLE empleados ADD COLUMN foto_path VARCHAR(500) NULL AFTER telefono');
}

migrate().catch((err) => {
  console.error('Error al migrar:', err);
  process.exit(1);
});
