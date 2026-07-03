import { api } from './client';

export async function descargarArchivo(url: string, nombreArchivo: string): Promise<void> {
  const { data } = await api.get(url, { responseType: 'blob' });
  const blobUrl = URL.createObjectURL(data as Blob);
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = nombreArchivo;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(blobUrl);
}
