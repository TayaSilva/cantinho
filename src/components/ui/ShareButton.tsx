import { useEffect, useState } from 'react';
import { sharePublicHouse } from '../../services/share';
import { Icon, PixelButton } from './PixelButton';

export function ShareButton() {
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 2200);
    return () => window.clearTimeout(timer);
  }, [notice]);

  return (
    <div className="relative">
      <PixelButton
        variant="dark"
        size="icon"
        onClick={async () => {
          const result = await sharePublicHouse();
          if (result === 'shared') setNotice('Compartilhado!');
          if (result === 'copied') setNotice('Link copiado!');
        }}
        aria-label="Compartilhar cantinho"
      >
        <Icon name="share" />
      </PixelButton>
      {notice && <span role="status" className="absolute top-full right-0 z-20 mt-2 whitespace-nowrap rounded-md bg-paper px-2.5 py-1.5 text-xs font-semibold text-ink shadow-lg">{notice}</span>}
    </div>
  );
}
