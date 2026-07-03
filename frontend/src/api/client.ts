import axios from 'axios';

export const api = axios.create({
  baseURL: '/api',
});

export function apiErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { error?: string; detalle?: unknown } | undefined;
    if (data?.error) return data.error;
    return err.message;
  }
  return 'Error inesperado';
}
