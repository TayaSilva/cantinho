import { useEffect, useMemo, useState } from 'react';
import type { HouseDocument } from '../../types/house';
import type { PublicationLimitDetails } from '../../services/houseStore';
import { AdminIcon, Button, cx } from './controls';

type Selection = { photos: string[]; videos: string[]; audios: string[]; letters: string[]; chestTexts: string[]; characters: string[]; pet: string[]; radio: string[]; tv: string[] };

export function PublicationLimitModal({ open, doc, details, onClose, onLearnMore, onPublish }: {
  open: boolean;
  doc: HouseDocument | null;
  details: PublicationLimitDetails | null;
  onClose: () => void;
  onLearnMore: () => void;
  onPublish: (candidate: HouseDocument) => Promise<void>;
}) {
  const [selection, setSelection] = useState<Selection>({ photos: [], videos: [], audios: [], letters: [], chestTexts: [], characters: [], pet: [], radio: [], tv: [] });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open || !doc) return;
    setSelection({
      photos: doc.content.photos.map((item) => item.id),
      videos: doc.content.videos.map((item) => item.id),
      audios: doc.content.playlist.tracks.map((item) => item.id),
      letters: doc.content.letters.map((item) => item.id),
      chestTexts: doc.content.chestMessages.map((item) => item.id),
      characters: doc.appearance.characters.flatMap((item, index) => item.enabled !== false ? [String(index)] : []),
      pet: doc.appearance.pet.enabled ? ['pet'] : [],
      radio: doc.appearance.furniture.radio.visible ? ['radio'] : [],
      tv: doc.appearance.furniture.tv.visible ? ['tv'] : [],
    });
    setBusy(false);
  }, [open, doc]);

  const candidate = useMemo(() => {
    if (!doc) return null;
    const next = structuredClone(doc);
    next.content.photos = next.content.photos.filter((item) => selection.photos.includes(item.id));
    next.content.videos = next.content.videos.filter((item) => selection.videos.includes(item.id));
    next.content.playlist.tracks = next.content.playlist.tracks.filter((item) => selection.audios.includes(item.id));
    next.content.letters = next.content.letters.filter((item) => selection.letters.includes(item.id));
    next.content.chestMessages = next.content.chestMessages.filter((item) => selection.chestTexts.includes(item.id));
    next.appearance.characters.forEach((item, index) => { item.enabled = index === 0 || selection.characters.includes(String(index)); });
    next.appearance.pet.enabled = selection.pet.includes('pet');
    next.appearance.furniture.radio.visible = selection.radio.includes('radio');
    next.appearance.furniture.tv.visible = selection.tv.includes('tv');
    return next;
  }, [doc, selection]);

  if (!open || !doc || !details) return null;
  const itemGroups = [
    { key: 'photos' as const, label: 'Fotos', items: doc.content.photos.map((item, index) => ({ id: item.id, label: item.caption || `Foto ${index + 1}` })) },
    { key: 'videos' as const, label: 'Vídeos', items: doc.content.videos.map((item, index) => ({ id: item.id, label: item.title || `Vídeo ${index + 1}` })) },
    { key: 'audios' as const, label: 'Áudios', items: doc.content.playlist.tracks.map((item, index) => ({ id: item.id, label: item.title || `Áudio ${index + 1}` })) },
    { key: 'letters' as const, label: 'Cartas', items: doc.content.letters.map((item, index) => ({ id: item.id, label: item.title || `Carta ${index + 1}` })) },
    { key: 'chestTexts' as const, label: 'Textos do baú', items: doc.content.chestMessages.map((item, index) => ({ id: item.id, label: item.text || `Mensagem ${index + 1}` })) },
  ].filter((group) => group.items.length > 0);
  const appearanceGroups = [
    { key: 'characters' as const, label: 'Personagens', items: doc.appearance.characters.map((item, index) => ({ id: String(index), label: `${index === 0 ? 'Personagem 1' : `Personagem ${index + 1}`} · ${item.name || 'sem nome'}` })) },
    { key: 'pet' as const, label: 'Pet', items: [{ id: 'pet', label: doc.appearance.pet.name || 'Animalzinho' }] },
    { key: 'radio' as const, label: 'Rádio', items: [{ id: 'radio', label: 'Rádio do cantinho' }] },
    { key: 'tv' as const, label: 'TV', items: [{ id: 'tv', label: 'TV do cantinho' }] },
  ];

  const toggle = (key: keyof Selection, id: string) => setSelection((current) => ({ ...current, [key]: current[key].includes(id) ? current[key].filter((value) => value !== id) : [...current[key], id] }));
  const issueLabel = details.issues.map((item) => `${item.label}: ${item.used} de ${item.limit}`).join(' · ');
  const publish = async () => {
    if (!candidate || busy) return;
    setBusy(true);
    try {
      await onPublish(candidate);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="publication-limit-title">
      <div className="absolute inset-0 bg-stone-900/40" onClick={onClose} aria-hidden="true" />
      <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col gap-5 overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <div>
          <h2 id="publication-limit-title" className="text-lg font-semibold text-stone-900">Ajuste o rascunho antes de publicar</h2>
          <p className="mt-1 text-sm leading-relaxed text-stone-600">O plano Free permite {issueLabel || 'menos recursos nesta publicação'}. Escolha manualmente o que continua no cantinho publicado.</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          {details.issues.map((item) => (
            <div key={item.key} className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900">
              <span className="font-semibold">{item.label}</span><br />{item.used} usados · {item.limit} permitidos
            </div>
          ))}
        </div>
        <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-700">
          Armazenamento desta publicação: <b>{formatMb(details.storage.projectedBytes)}</b> de <b>{formatMb(details.storage.limitBytes)}</b> permitidos.
        </div>
        {itemGroups.length > 0 && (
          <div className="flex flex-col gap-4">
            <p className="text-sm font-semibold text-stone-900">O que deseja manter?</p>
            {itemGroups.map((group) => (
              <fieldset key={group.key} className="rounded-xl border border-stone-200 p-3">
                <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-stone-500">{group.label} · {selection[group.key].length} selecionado(s)</legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  {group.items.map((item) => {
                    const checked = selection[group.key].includes(item.id);
                    return (
                      <label key={item.id} className={cx('flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm', checked ? 'bg-white' : 'bg-stone-100 text-stone-500')}>
                        <input type="checkbox" checked={checked} onChange={() => toggle(group.key, item.id)} />
                        <span className="truncate">{item.label}</span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            ))}
          </div>
        )}
        <div className="flex flex-col gap-4">
          <p className="text-sm font-semibold text-stone-900">Recursos de aparência</p>
          {appearanceGroups.map((group) => (
            <fieldset key={group.key} className="rounded-xl border border-stone-200 p-3">
              <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-stone-500">{group.label} · {selection[group.key].length} selecionado(s)</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {group.items.map((item) => {
                  const checked = selection[group.key].includes(item.id);
                  const required = group.key === 'characters' && item.id === '0';
                  return (
                    <label key={item.id} className={cx('flex items-center gap-2 rounded-lg px-2 py-2 text-sm', required ? 'cursor-not-allowed bg-stone-100 text-stone-500' : checked ? 'cursor-pointer bg-white' : 'cursor-pointer bg-stone-100 text-stone-500')}>
                      <input type="checkbox" checked={checked || required} disabled={required} onChange={() => toggle(group.key, item.id)} />
                      <span className="truncate">{item.label}{required ? ' · obrigatório' : ''}</span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          ))}
        </div>
        <p className="text-xs leading-relaxed text-stone-500">Nada é apagado do rascunho. O servidor valida novamente os limites no momento da publicação.</p>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button type="button" className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl px-2 text-sm font-semibold text-mansao-deep hover:bg-mansao-soft/60" onClick={onLearnMore}>
            <AdminIcon name="crown" className="size-4" /> Conhecer Mini Mansão
          </button>
          <div className="flex gap-2">
            <Button onClick={onClose}>Cancelar</Button>
            <Button variant="primary" onClick={() => void publish()} disabled={busy}>{busy ? 'Validando…' : 'Publicar seleção'}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatMb(bytes: number) {
  return `${(bytes / (1024 * 1024)).toFixed(bytes >= 1024 * 1024 * 10 ? 0 : 1)} MB`;
}
