import { apiErrorMessage } from '../api/client';

export function ApiErrorBanner({ error }: { error: unknown }) {
  return (
    <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-md px-4 py-3">
      No se pudo cargar la información desde el servidor: {apiErrorMessage(error)}
    </div>
  );
}
