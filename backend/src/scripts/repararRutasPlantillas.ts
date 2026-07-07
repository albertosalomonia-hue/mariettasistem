import { pool } from '../config/db';

// Corrige filas de `plantillas` cuyo archivo_path quedó como ruta absoluta de
// otra máquina (p. ej. generado durante desarrollo en Windows). Se queda solo
// con el nombre de archivo, que es lo que el código ahora resuelve contra
// TEMPLATES_DIR. No toca filas que ya sean solo un nombre de archivo.
async function main() {
  const [rows]: any = await pool.query('SELECT id, archivo_path FROM plantillas');

  let corregidas = 0;
  for (const row of rows) {
    const valor: string = row.archivo_path;
    const soloNombre = valor.split(/[\\/]/).pop()!;
    if (soloNombre !== valor) {
      await pool.query('UPDATE plantillas SET archivo_path = ? WHERE id = ?', [soloNombre, row.id]);
      console.log(`plantilla ${row.id}: "${valor}" -> "${soloNombre}"`);
      corregidas++;
    }
  }
  console.log(`Listo. ${corregidas} de ${rows.length} plantilla(s) corregidas.`);
}

main()
  .then(() => pool.end())
  .catch(async (err) => {
    console.error(err);
    await pool.end();
    process.exit(1);
  });
