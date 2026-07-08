import fs from 'fs';
import path from 'path';
import { pool } from '../config/db';

const FOTOS_DIR = path.join(__dirname, '..', '..', 'storage', 'empleados');

// Mismo problema que plantillas/contratos: fotos subidas antes del fix de
// paths relativos quedaron con la ruta absoluta de la máquina de desarrollo
// en `foto_path`. Acá el archivo real sí sobrevive (foto.webp quedó
// versionado en git), así que alcanza con corregir el string en la BD —no
// hace falta regenerar nada.
async function main() {
  const [rows]: any = await pool.query('SELECT id, foto_path FROM empleados WHERE foto_path IS NOT NULL');

  let corregidas = 0;
  let saltadas = 0;
  for (const row of rows) {
    const valor: string = row.foto_path;
    const partes = valor.split(/[\\/]/).filter(Boolean);
    const relativo = partes.slice(-2).join('/'); // "<id>/foto.webp"
    if (relativo === valor) continue; // ya estaba bien

    const absoluto = path.join(FOTOS_DIR, relativo);
    if (!fs.existsSync(absoluto)) {
      console.log(`empleado ${row.id}: "${valor}" -> "${relativo}" (SALTEADO: no existe ${absoluto})`);
      saltadas++;
      continue;
    }

    await pool.query('UPDATE empleados SET foto_path = ? WHERE id = ?', [relativo, row.id]);
    console.log(`empleado ${row.id}: "${valor}" -> "${relativo}"`);
    corregidas++;
  }
  console.log(`Listo. ${corregidas} corregida(s), ${saltadas} salteada(s), de ${rows.length} fila(s) con foto.`);
}

main()
  .then(() => pool.end())
  .catch(async (err) => {
    console.error(err);
    await pool.end();
    process.exit(1);
  });
