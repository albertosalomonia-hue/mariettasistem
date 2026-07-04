import { useRef, useState } from 'react';

interface SignaturePadProps {
  onSave: (blob: Blob) => void;
  saving?: boolean;
}

function posicionDesdeEvento(
  canvas: HTMLCanvasElement,
  e: React.MouseEvent | React.TouchEvent,
): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  const punto = 'touches' in e ? e.touches[0] : e;
  return {
    x: ((punto.clientX - rect.left) / rect.width) * canvas.width,
    y: ((punto.clientY - rect.top) / rect.height) * canvas.height,
  };
}

export function SignaturePad({ onSave, saving }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dibujando = useRef(false);
  const [vacio, setVacio] = useState(true);

  const iniciar = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    dibujando.current = true;
    const { x, y } = posicionDesdeEvento(canvas, e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const dibujar = (e: React.MouseEvent | React.TouchEvent) => {
    if (!dibujando.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    e.preventDefault();
    const { x, y } = posicionDesdeEvento(canvas, e);
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#1f2937';
    ctx.lineTo(x, y);
    ctx.stroke();
    setVacio(false);
  };

  const terminar = () => {
    dibujando.current = false;
  };

  const borrar = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    setVacio(true);
  };

  const guardar = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (blob) onSave(blob);
    }, 'image/png');
  };

  return (
    <div className="space-y-3">
      <div className="border border-gray-300 rounded-lg bg-gray-50 touch-none">
        <canvas
          ref={canvasRef}
          width={500}
          height={200}
          className="w-full h-48 cursor-crosshair touch-none"
          onMouseDown={iniciar}
          onMouseMove={dibujar}
          onMouseUp={terminar}
          onMouseLeave={terminar}
          onTouchStart={iniciar}
          onTouchMove={dibujar}
          onTouchEnd={terminar}
        />
      </div>
      <div className="flex justify-between gap-2">
        <button
          type="button"
          onClick={borrar}
          className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900"
        >
          Borrar
        </button>
        <button
          type="button"
          disabled={vacio || saving}
          onClick={guardar}
          className="px-4 py-2 rounded-md bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
        >
          {saving ? 'Firmando...' : 'Confirmar firma'}
        </button>
      </div>
    </div>
  );
}
