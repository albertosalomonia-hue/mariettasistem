import { useEffect, useState } from 'react';
import { apiArchivos } from '../api/archivosClient';

interface AuthImageProps {
  src: string | null | undefined;
  alt: string;
  className?: string;
  fallback: React.ReactNode;
}

export function AuthImage({ src, alt, className, fallback }: AuthImageProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setUrl(null);
    setFailed(false);
    if (!src) return;

    let objectUrl: string | null = null;
    let cancelled = false;

    apiArchivos
      .get(src, { responseType: 'blob' })
      .then((res) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(res.data as Blob);
        setUrl(objectUrl);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src]);

  if (!src || failed || !url) {
    return <>{fallback}</>;
  }

  return <img src={url} alt={alt} className={className} />;
}
