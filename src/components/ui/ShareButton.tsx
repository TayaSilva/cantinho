import { sharePublicHouse } from '../../services/share';
import { errorMessage, notify } from './Notifications';
import { Icon, PixelButton } from './PixelButton';

export function ShareButton({ disabled = false, published = true, houseId, shareUrl }: { disabled?: boolean; published?: boolean; houseId?: string; shareUrl?: string }) {
  const share = async () => {
    if (disabled) {
      notify.info('Compartilhamento indisponível.');
      return;
    }
    if (!published) {
      notify.info('Publique o cantinho antes de compartilhá-lo.');
      return;
    }
    try {
      const result = await sharePublicHouse(houseId, shareUrl);
      if (result === 'shared') notify.success('Cantinho compartilhado!');
      if (result === 'copied') notify.success('Link copiado! É só colar onde quiser.');
    } catch (cause) {
      notify.error(errorMessage(cause, 'Não foi possível criar o link.'));
    }
  };

  return (
    <PixelButton
      variant="dark"
      size="icon"
      disabled={disabled}
      onClick={() => void share()}
      aria-label={disabled ? 'Compartilhamento indisponível' : 'Compartilhar cantinho'}
    >
      <Icon name="share" />
    </PixelButton>
  );
}
