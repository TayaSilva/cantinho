import { useCallback, useId, useState } from 'react';
import { PLANS } from '../../data/plans';
import { AdminIcon, Button, cx } from '../admin/controls';
import { mansaoButton, Sheet } from './PlanParts';

export type PremiumFeature = 'videos' | 'pet' | 'characters' | 'photos' | 'audios' | 'letters' | 'chestTexts' | 'storage' | 'customization' | 'radio' | 'tv' | 'quiz';

const limits = PLANS.mansao.limits;

export const PREMIUM_FEATURES: Record<PremiumFeature, { label: string; title: string; body: string }> = {
  videos: { label: 'Vídeos', title: 'Vídeos fazem parte da Mini Mansão', body: `Guarde até ${limits.videos} vídeos e assista a eles na TV do cantinho.` },
  pet: { label: 'Pet', title: 'Que tal um pet no cantinho?', body: `Na Mini Mansão você adiciona ${limits.pets} animalzinho, com nome, aparência e acessórios.` },
  characters: { label: 'Personagens', title: 'Mais gente no cantinho', body: `A Mini Mansão permite até ${limits.characters} personagens na sala.` },
  photos: { label: 'Fotos', title: 'Mais espaço para fotos', body: `Guarde até ${limits.photos} fotos no porta-retratos.` },
  audios: { label: 'Áudios', title: 'Mais músicas no rádio', body: `Monte uma playlist com até ${limits.audios} áudios.` },
  letters: { label: 'Cartas', title: 'Mais cartas na estante', body: `Escreva até ${limits.letters} cartas no livro do cantinho.` },
  chestTexts: { label: 'Textos do baú', title: 'Mais mensagens no baú', body: `Guarde até ${limits.chestTexts} mensagens surpresa no baú.` },
  storage: { label: 'Armazenamento', title: 'O espaço do cantinho acabou', body: `A Mini Mansão tem ${limits.storageMb} MB para todas as memórias.` },
  customization: { label: 'Personalização', title: 'Personalização completa', body: 'Use todos os modelos, cores e decorações para deixar o cantinho com a cara de vocês.' },
  radio: { label: 'Rádio', title: 'O rádio faz parte da Mini Mansão', body: `Monte uma playlist com até ${limits.audios} áudios e deixe a trilha do cantinho tocando.` },
  tv: { label: 'TV', title: 'A TV faz parte da Mini Mansão', body: `Assista até ${limits.videos} vídeos na TV do cantinho.` },
  quiz: { label: 'Quiz', title: 'Um quiz só de vocês', body: 'Crie perguntas, alternativas e uma mensagem final para transformar suas lembranças em uma brincadeira.' },
};

/**
 * Convite para a Mini Mansão quando alguém do plano grátis tenta usar um recurso
 * Premium. O editor chama este convite antes de permitir uma alteração bloqueada.
 */
export function PremiumFeatureModal({ feature, onClose, onLearnMore }: { feature: PremiumFeature | null; onClose: () => void; onLearnMore: () => void }) {
  const titleId = useId();
  const copy = feature ? PREMIUM_FEATURES[feature] : null;
  return (
    <Sheet open={Boolean(copy)} onClose={onClose} labelledBy={titleId}>
      {copy && (
        <div className="flex flex-col items-center gap-4 py-2 text-center">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-mansao-soft text-mansao-deep">
            <AdminIcon name="crown" className="size-7" />
          </span>
          <div className="flex flex-col gap-1.5">
            <h2 id={titleId} className="text-lg font-semibold text-balance">{copy.title}</h2>
            <p className="leading-relaxed text-stone-600">{copy.body}</p>
          </div>
          <div className="flex w-full flex-col gap-2">
            <button type="button" className={cx(mansaoButton, 'w-full')} onClick={onLearnMore}>
              <AdminIcon name="crown" className="size-[18px]" />
              Conhecer Mini Mansão
            </button>
            <Button size="lg" variant="ghost" onClick={onClose} className="w-full">Agora não</Button>
          </div>
        </div>
      )}
    </Sheet>
  );
}

/**
 * `prompt('videos')` abre o convite; quem usar renderiza `element` uma vez na tela.
 */
export function usePremiumPrompt(onLearnMore: () => void) {
  const [feature, setFeature] = useState<PremiumFeature | null>(null);
  const prompt = useCallback((next: PremiumFeature) => setFeature(next), []);
  const element = (
    <PremiumFeatureModal
      feature={feature}
      onClose={() => setFeature(null)}
      onLearnMore={() => {
        setFeature(null);
        onLearnMore();
      }}
    />
  );
  return { prompt, element };
}
