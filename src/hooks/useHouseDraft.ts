import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { defaultAppearance } from '../data/houseConfig';
import { countDifferences, loadDraft, loadPublished, publish as publishDoc, saveDraft as saveDraftDoc } from '../services/houseStore';
import type { HouseDocument } from '../types/house';

const HISTORY_LIMIT = 80;

export type DraftStatus = 'loading' | 'saved' | 'unsaved' | 'saving' | 'publishing';

/**
 * Estado de edição do Backoffice: rascunho em memória, histórico para
 * desfazer, salvar rascunho, restaurar padrão e publicar.
 */
export function useHouseDraft(houseId = '00000000-0000-0000-0000-000000000001') {
  const [doc, setDoc] = useState<HouseDocument | null>(null);
  const [savedJson, setSavedJson] = useState('');
  const [published, setPublished] = useState<HouseDocument | null>(null);
  const historyRef = useRef<HouseDocument[]>([]);
  const [historySize, setHistorySize] = useState(0);
  const docRef = useRef<HouseDocument | null>(null);
  const [busy, setBusy] = useState<'saving' | 'publishing' | null>(null);
  const [lastAction, setLastAction] = useState<string | null>(null);
  const coalesce = useRef<{ key: string; at: number } | null>(null);

  useEffect(() => {
    let alive = true;
    setDoc(null);
    setSavedJson('');
    setPublished(null);
    historyRef.current = [];
    setHistorySize(0);
    Promise.all([loadDraft(houseId), loadPublished(houseId)]).then(([d, p]) => {
      if (!alive) return;
      docRef.current = d;
      setDoc(d);
      setSavedJson(JSON.stringify(d));
      setPublished(p);
    });
    return () => {
      alive = false;
    };
  }, [houseId]);

  /**
   * Aplica uma alteração ao rascunho. `coalesceKey` agrupa alterações seguidas
   * (como digitar um nome) num único passo de "desfazer".
   */
  const commit = (next: HouseDocument) => {
    docRef.current = next;
    setDoc(next);
  };

  const update = useCallback((mutate: (draft: HouseDocument) => void, coalesceKey?: string) => {
    const current = docRef.current;
    if (!current) return;
    const next = structuredClone(current);
    mutate(next);
    const now = Date.now();
    const sameBurst = !!coalesceKey && coalesce.current?.key === coalesceKey && now - coalesce.current.at < 1200;
    coalesce.current = coalesceKey ? { key: coalesceKey, at: now } : null;
    if (!sameBurst) {
      historyRef.current = [...historyRef.current.slice(-HISTORY_LIMIT + 1), current];
      setHistorySize(historyRef.current.length);
    }
    commit(next);
  }, []);

  const undo = useCallback(() => {
    const h = historyRef.current;
    if (h.length === 0) return;
    const prev = h[h.length - 1];
    historyRef.current = h.slice(0, -1);
    setHistorySize(historyRef.current.length);
    coalesce.current = null;
    commit(prev);
    setLastAction('Alteração desfeita');
  }, []);

  const saveDraft = useCallback(async () => {
    if (!doc) return;
    setBusy('saving');
    const saved = await saveDraftDoc(doc, houseId);
    commit(saved);
    setSavedJson(JSON.stringify(saved));
    setBusy(null);
    setLastAction('Rascunho salvo');
  }, [doc, houseId]);

  const publish = useCallback(async () => {
    if (!doc) return;
    setBusy('publishing');
    const saved = await publishDoc(doc, houseId);
    commit(saved);
    setSavedJson(JSON.stringify(saved));
    setPublished(saved);
    setBusy(null);
    setLastAction('Alterações publicadas');
  }, [doc, houseId]);

  /** Volta só a APARÊNCIA ao padrão. Conteúdos (fotos, cartas...) ficam intactos. */
  const resetAppearance = useCallback(() => {
    update((d) => {
      d.appearance = structuredClone(defaultAppearance);
    });
    setLastAction('Aparência restaurada para o padrão');
  }, [update]);

  const clearLastAction = useCallback(() => setLastAction(null), []);

  const dirty = doc ? JSON.stringify(doc) !== savedJson : false;
  const pending = useMemo(() => (doc && published ? countDifferences(doc, published) : 0), [doc, published]);

  return {
    houseId,
    doc,
    published,
    update,
    undo,
    canUndo: historySize > 0,
    saveDraft,
    publish,
    resetAppearance,
    dirty,
    pending,
    busy,
    lastAction,
    clearLastAction,
  };
}

export type HouseDraft = ReturnType<typeof useHouseDraft>;
