import axios from 'axios';

// Rutas que dependen de Word COM (generación/firma de contratos) o de disco local
// (fotos de empleados, subida de plantillas) siguen sirviéndose desde el servidor
// Express en Windows, no desde las funciones serverless. En local, sin la variable
// de entorno definida, cae de vuelta al mismo "/api" relativo (proxy de Vite a :4100),
// igual que el cliente principal.
export const apiArchivos = axios.create({
  baseURL: import.meta.env.VITE_ARCHIVOS_API_URL || '/api',
});
