import dotenv from 'dotenv';
import { pool } from '../config/db';
import { hashPassword } from '../services/authService';

dotenv.config();

async function seed() {
  const [empresas]: any = await pool.query('SELECT id FROM empresas ORDER BY id LIMIT 1');
  if (!empresas.length) {
    throw new Error('No hay empresas registradas. Corre "npm run migrate" primero.');
  }
  const empresaId = empresas[0].id;

  const usuario = process.env.SEED_ADMIN_USUARIO || 'admin';
  const email = process.env.SEED_ADMIN_EMAIL || null;
  const password = process.env.SEED_ADMIN_PASSWORD || 'cambiar123';

  const [existentes]: any = await pool.query('SELECT id FROM usuarios WHERE usuario = ?', [usuario]);
  if (existentes.length) {
    console.log(`El usuario admin "${usuario}" ya existe. Nada que hacer.`);
    await pool.end();
    return;
  }

  const passwordHash = await hashPassword(password);
  await pool.query('INSERT INTO usuarios SET ?', [
    {
      empresa_id: empresaId,
      nombre_completo: 'Administrador',
      usuario,
      email,
      password_hash: passwordHash,
      rol: 'super_admin',
      must_change_password: 1,
    },
  ]);

  console.log(`Usuario admin creado: ${usuario} / ${password} (deberá cambiar la contraseña en producción).`);
  await pool.end();
}

seed().catch((err) => {
  console.error('Error al hacer seed:', err);
  process.exit(1);
});
