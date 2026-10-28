import { dbFetch } from './supabase.mjs';

export const MB = 1024 * 1024;

export const PLAN_DEFAULTS = {
  free: {
    priceCents: 0,
    durationDays: 30,
    storageLimitBytes: 20 * MB,
    maxPhotos: 5,
    maxVideos: 0,
    maxAudios: 1,
    maxLetters: 1,
    maxChestTexts: 1,
    maxCharacters: 2,
    allowPet: false,
    allowRadio: false,
    allowTv: false,
  },
  mansao: {
    priceCents: 1490,
    durationDays: 182,
    storageLimitBytes: 100 * MB,
    maxPhotos: 20,
    maxVideos: 2,
    maxAudios: 5,
    maxLetters: 10,
    maxChestTexts: 10,
    maxCharacters: 4,
    allowPet: true,
    allowRadio: true,
    allowTv: true,
  },
};

const number = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;

function rowValue(row, key, fallback) {
  return row && row[key] !== null && row[key] !== undefined ? row[key] : fallback;
}

function legacyValue(row, key, fallback = 0) {
  return row ? number(row[key], fallback) : fallback;
}

export function documentUsage(document) {
  const appearance = document?.appearance || {};
  const content = document?.content || {};
  const characters = Array.isArray(appearance.characters)
    ? appearance.characters.reduce((count, character) => count + (character && character.enabled !== false ? 1 : 0), 0)
    : 0;
  const tracks = Array.isArray(content.playlist?.tracks) ? content.playlist.tracks : [];
  const chestMessages = Array.isArray(content.chestMessages) ? content.chestMessages.filter((item) => typeof item?.text === 'string' && item.text.trim()) : [];
  return {
    photos: Array.isArray(content.photos) ? content.photos.length : 0,
    videos: Array.isArray(content.videos) ? content.videos.length : 0,
    audios: tracks.length,
    letters: Array.isArray(content.letters) ? content.letters.length : 0,
    chestTexts: chestMessages.length,
    characters,
    pet: appearance.pet?.enabled ? 1 : 0,
    radio: appearance.furniture?.radio ? (appearance.furniture.radio.visible === false ? 0 : 1) : 0,
    tv: appearance.furniture?.tv ? (appearance.furniture.tv.visible === false ? 0 : 1) : 0,
  };
}

export function mediaIds(document) {
  const ids = new Set();
  const visit = (value) => {
    if (typeof value === 'string' && value.startsWith('media:')) {
      const id = value.slice(6).split('@')[0];
      if (id) ids.add(id);
      return;
    }
    if (Array.isArray(value)) value.forEach(visit);
    else if (value && typeof value === 'object') Object.values(value).forEach(visit);
  };
  visit(document);
  return ids;
}

function limitsFromRows(planRow, definitionRow, legacyRow) {
  const planId = planRow?.plan_type === 'mansao' ? 'mansao' : 'free';
  const defaults = PLAN_DEFAULTS[planId];
  const definition = definitionRow || {};
  const legacy = legacyRow || {};
  const base = {
    storageLimitBytes: number(rowValue(definition, 'storage_limit_bytes', defaults.storageLimitBytes), defaults.storageLimitBytes),
    maxPhotos: number(rowValue(definition, 'max_photos', defaults.maxPhotos), defaults.maxPhotos),
    maxVideos: number(rowValue(definition, 'max_videos', defaults.maxVideos), defaults.maxVideos),
    maxAudios: number(rowValue(definition, 'max_audios', defaults.maxAudios), defaults.maxAudios),
    maxLetters: number(rowValue(definition, 'max_letters', defaults.maxLetters), defaults.maxLetters),
    maxChestTexts: number(rowValue(definition, 'max_chest_texts', defaults.maxChestTexts), defaults.maxChestTexts),
    maxCharacters: number(rowValue(definition, 'max_characters', defaults.maxCharacters), defaults.maxCharacters),
    allowPet: Boolean(rowValue(definition, 'allow_pet', defaults.allowPet)),
    allowRadio: Boolean(rowValue(definition, 'allow_radio', defaults.allowRadio)),
    allowTv: Boolean(rowValue(definition, 'allow_tv', defaults.allowTv)),
  };
  return {
    storageMb: Math.max(base.storageLimitBytes, legacyValue(legacy, 'preserved_storage_bytes')) / MB,
    photos: Math.max(base.maxPhotos, legacyValue(legacy, 'preserved_photos')),
    videos: Math.max(base.maxVideos, legacyValue(legacy, 'preserved_videos')),
    audios: Math.max(base.maxAudios, legacyValue(legacy, 'preserved_audios')),
    letters: Math.max(base.maxLetters, legacyValue(legacy, 'preserved_letters')),
    chestTexts: Math.max(base.maxChestTexts, legacyValue(legacy, 'preserved_chest_texts')),
    characters: Math.max(base.maxCharacters, legacyValue(legacy, 'preserved_characters', 2)),
    pets: base.allowPet || Boolean(legacy?.preserved_pet) ? 1 : 0,
    radio: base.allowRadio || Boolean(legacy?.preserved_radio),
    tv: base.allowTv || Boolean(legacy?.preserved_tv),
  };
}

export async function getHousePlan(houseId) {
  const [planResponse, definitionResponse, legacyResponse, mediaResponse] = await Promise.all([
    dbFetch(`house_plans?house_id=eq.${encodeURIComponent(houseId)}&select=plan_type,status,started_at,expires_at,deletion_at&limit=1`),
    dbFetch('plan_definitions?select=plan_type,storage_limit_bytes,max_photos,max_videos,max_audios,max_letters,max_chest_texts,max_characters,allow_pet,allow_radio,allow_tv'),
    dbFetch(`legacy_entitlements?house_id=eq.${encodeURIComponent(houseId)}&select=*&limit=1`),
    dbFetch(`media?house_id=eq.${encodeURIComponent(houseId)}&select=size_bytes`),
  ]);
  const planData = await planResponse.json().catch(() => []);
  const definitionData = await definitionResponse.json().catch(() => []);
  const legacyData = await legacyResponse.json().catch(() => []);
  const mediaData = await mediaResponse.json().catch(() => []);
  const plans = Array.isArray(planData) ? planData : [];
  const definitions = Array.isArray(definitionData) ? definitionData : [];
  const legacies = Array.isArray(legacyData) ? legacyData : [];
  const media = Array.isArray(mediaData) ? mediaData : [];
  const planRow = planResponse.ok && plans[0] ? plans[0] : { plan_type: 'free', status: 'active' };
  const planId = planRow.plan_type === 'mansao' ? 'mansao' : 'free';
  const definition = definitions.find((row) => row.plan_type === planId);
  const legacy = legacyResponse.ok && legacies[0] ? legacies[0] : null;
  const expiresAt = planRow.expires_at || null;
  const rawStatus = ['active', 'expired', 'deletion_scheduled'].includes(planRow.status) ? planRow.status : 'active';
  const status = rawStatus === 'active' && expiresAt && new Date(expiresAt) <= new Date() ? 'expired' : rawStatus;
  return {
    houseId,
    planId,
    status,
    startedAt: planRow.started_at || null,
    expiresAt,
    deletionAt: planRow.deletion_at || null,
    storageUsedBytes: mediaResponse.ok ? media.reduce((sum, row) => sum + number(row.size_bytes), 0) : null,
    limits: limitsFromRows(planRow, definition, legacy),
    legacyEntitlements: legacy ? {
      isLegacy: true,
      cutoffAt: legacy.cutoff_at || null,
      preservedStorageBytes: legacyValue(legacy, 'preserved_storage_bytes'),
      preservedPhotos: legacyValue(legacy, 'preserved_photos'),
      preservedVideos: legacyValue(legacy, 'preserved_videos'),
      preservedAudios: legacyValue(legacy, 'preserved_audios'),
      preservedLetters: legacyValue(legacy, 'preserved_letters'),
      preservedChestTexts: legacyValue(legacy, 'preserved_chest_texts'),
      preservedCharacters: legacyValue(legacy, 'preserved_characters', 2),
      preservedPet: Boolean(legacy.preserved_pet),
      preservedRadio: Boolean(legacy.preserved_radio),
      preservedTv: Boolean(legacy.preserved_tv),
    } : undefined,
    payments: [],
  };
}

function issue(key, label, used, limit) {
  return { key, label, used, limit };
}

export function validatePublication(document, plan, mediaRows) {
  const usage = documentUsage(document);
  const limits = plan.limits;
  const issues = [];
  if (usage.photos > limits.photos) issues.push(issue('photos', 'Fotos', usage.photos, limits.photos));
  if (usage.videos > limits.videos) issues.push(issue('videos', 'Vídeos', usage.videos, limits.videos));
  if (usage.audios > limits.audios) issues.push(issue('audios', 'Áudios', usage.audios, limits.audios));
  if (usage.letters > limits.letters) issues.push(issue('letters', 'Cartas', usage.letters, limits.letters));
  if (usage.chestTexts > limits.chestTexts) issues.push(issue('chestTexts', 'Textos do baú', usage.chestTexts, limits.chestTexts));
  if (usage.characters > limits.characters) issues.push(issue('characters', 'Personagens', usage.characters, limits.characters));
  if (usage.pet > limits.pets) issues.push(issue('pet', 'Pet', usage.pet, limits.pets));
  if (usage.radio && !limits.radio) issues.push(issue('radio', 'Rádio', 1, 0));
  if (usage.tv && !limits.tv) issues.push(issue('tv', 'TV', 1, 0));

  const rows = Array.isArray(mediaRows) ? mediaRows : [];
  const storedBytes = rows.reduce((sum, row) => sum + number(row.size_bytes), 0);
  const references = mediaIds(document);
  const projectedBytes = rows.reduce((sum, row) => sum + (references.has(row.id) ? number(row.size_bytes) : 0), 0);
  const limitBytes = limits.storageMb * MB;
  if (projectedBytes > limitBytes) issues.push(issue('storage', 'Armazenamento', projectedBytes, limitBytes));

  return {
    valid: issues.length === 0,
    issues,
    usage,
    limits,
    storage: { usedBytes: storedBytes, projectedBytes, limitBytes },
  };
}
