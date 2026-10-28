import { useEffect, useState } from 'react';
import { ShareError, sharePublicHouse } from '../../services/share';
import { Icon, PixelButton } from './PixelButton';

export function ShareButton({ disabled = false, published = true, houseId, shareUrl }: { disabled?: boolean; published?: boolean; houseId?: string; shareUrl?: string }) {
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 3000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const share = async () => {
    if (disabled) {
      setNotice('Compartilhamento indisponível.');
      return;
    }
    if (!published) {
      setNotice('Publique o cantinho antes de compartilhá-lo.');
      return;
    }
    try {
      const result = await sharePublicHouse(houseId, shareUrl);
      if (result === 'shared') setNotice('Compartilhado!');
      if (result === 'copied') setNotice('Link copiado!');
    } catch (cause) {
      setNotice(cause instanceof ShareError || cause instanceof Error ? cause.message : 'Não foi possível criar o link.');
    }
  };

  return (
    <div className="relative">
      <PixelButton
        variant="dark"
        size="icon"
        disabled={disabled}
        onClick={() => void share()}
        aria-label={disabled ? 'Compartilhamento indisponível' : 'Compartilhar cantinho'}
      >
        <Icon name="share" />
      </PixelButton>
      {notice && <span role="status" className="absolute top-full right-0 z-20 mt-2 whitespace-nowrap rounded-md bg-paper px-2.5 py-1.5 text-xs font-semibold text-ink shadow-lg">{notice}</span>}
    </div>
  );
}
