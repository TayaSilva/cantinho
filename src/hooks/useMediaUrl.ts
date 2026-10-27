import { useEffect, useState } from 'react';
import { resolvedMediaNow, resolveMedia } from '../services/mediaStore';

/** URL pronta para <img>/<video>/<audio>, inclusive de arquivos enviados no Backoffice. */
export function useMediaUrl(src: string | undefined, houseId?: string): string | undefined {
  const [url, setUrl] = useState<string | undefined>(() => resolvedMediaNow(src));
  useEffect(() => {
    let alive = true;
    setUrl(resolvedMediaNow(src));
    resolveMedia(src, houseId)
      .then((u) => {
        if (alive) setUrl(u);
      })
      .catch(() => {
        if (alive) setUrl(undefined);
      });
    return () => {
      alive = false;
    };
  }, [src, houseId]);
  return url;
}
