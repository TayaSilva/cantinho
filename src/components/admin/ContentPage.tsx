import { useEffect, useId, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { HouseDraft } from '../../hooks/useHouseDraft';
import { useMediaUrl } from '../../hooks/useMediaUrl';
import { navigate } from '../../hooks/useRoute';
import { houseAdminPath } from '../../services/houses';
import { mediaApiUrl, putMedia } from '../../services/mediaStore';
import { acceptFor, checkFile, limitLabel, UPLOAD_RULES, type MediaKind } from '../../services/uploadRules';
import type { HouseContent, HouseDocument } from '../../types/house';
import { AdminIcon, Button, ConfirmDialog, cx, TextArea, TextField, Toggle } from './controls';

export type ContentSection = 'textos' | 'fotos' | 'videos' | 'musicas' | 'cartas' | 'datas' | 'mensagens';

const SECTIONS: { id: ContentSection; label: string; icon: 'text' | 'image' | 'video' | 'music' | 'letter' | 'calendar' | 'gift'; count?: (c: HouseContent) => number }[] = [
  { id: 'textos', label: 'Textos da casa', icon: 'text' },
  { id: 'fotos', label: 'Fotos', icon: 'image', count: (c) => c.photos.length },
  { id: 'videos', label: 'Vídeos', icon: 'video', count: (c) => c.videos.length },
  { id: 'musicas', label: 'Músicas', icon: 'music', count: (c) => c.playlist.tracks.length },
  { id: 'cartas', label: 'Cartas', icon: 'letter', count: (c) => c.letters.length },
  { id: 'datas', label: 'Datas especiais', icon: 'calendar', count: (c) => c.specialDates.length },
  { id: 'mensagens', label: 'Mensagens do baú', icon: 'gift', count: (c) => c.chestMessages.length },
];

const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

function move<T>(list: T[], index: number, dir: -1 | 1): void {
  const to = index + dir;
  if (to < 0 || to >= list.length) return;
  const [item] = list.splice(index, 1);
  list.splice(to, 0, item);
}

/**
 * /admin/conteudos — fotos, vídeos, músicas, cartas, datas, mensagens e textos.
 * Mudar a aparência da casa nunca mexe nestes conteúdos (e vice-versa).
 */
export function ContentPage({ draft, section }: { draft: HouseDraft; section: ContentSection }) {
  const doc = draft.doc;
  if (!doc) return null;
  const content = doc.content;
  const edit = (fn: (c: HouseContent) => void, key?: string) => draft.update((d) => fn(d.content), key);

  return (
    <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
      <aside className="shrink-0 border-b border-stone-200 bg-white lg:w-[232px] lg:border-r lg:border-b-0">
        <p className="hidden px-6 pt-5 pb-2 text-xs font-semibold tracking-[.06em] text-stone-500 uppercase lg:block">Conteúdos</p>
        <nav aria-label="Tipos de conteúdo" className="flex gap-1 overflow-x-auto px-3 py-2 lg:flex-col lg:gap-0.5 lg:py-0">
          {SECTIONS.map((s) => {
            const active = s.id === section;
            return (
              <a
                key={s.id}
                href={houseAdminPath(draft.houseId, `/conteudos/${s.id}`)}
                aria-current={active ? 'page' : undefined}
                onClick={(e) => {
                  e.preventDefault();
                  navigate(houseAdminPath(draft.houseId, `/conteudos/${s.id}`));
                }}
                className={cx('flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm no-underline focus-visible:outline-2 focus-visible:outline-rose-500', active ? 'bg-rose-50 font-semibold text-rose-900' : 'text-stone-700 hover:bg-stone-50')}
              >
                <AdminIcon name={s.icon} />
                <span className="flex-1">{s.label}</span>
                {s.count && <span className={cx('text-xs', active ? '' : 'text-stone-500')}>{s.count(content)}</span>}
              </a>
            );
          })}
        </nav>
      </aside>

      <main className="min-h-0 min-w-0 flex-1 overflow-y-auto px-4 py-6 sm:px-8 lg:py-7">
        <div className="mx-auto flex max-w-5xl flex-col gap-6">
          {section === 'textos' && <TextsSection doc={doc} edit={edit} />}
          {section === 'fotos' && <PhotosSection content={content} edit={edit} houseId={draft.houseId} />}
          {section === 'videos' && <VideosSection content={content} edit={edit} houseId={draft.houseId} />}
          {section === 'musicas' && <TracksSection content={content} edit={edit} houseId={draft.houseId} />}
          {section === 'cartas' && <LettersSection content={content} edit={edit} />}
          {section === 'datas' && <DatesSection content={content} edit={edit} />}
          {section === 'mensagens' && <MessagesSection content={content} edit={edit} />}
        </div>
      </main>
    </div>
  );
}

type Edit = (fn: (c: HouseContent) => void, key?: string) => void;

/* ---------------- peças comuns ---------------- */

function Header({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-[22px] font-bold text-stone-900">{title}</h1>
        <p className="text-sm text-stone-600">{description}</p>
      </div>
      {action}
    </div>
  );
}

type UploadProblem = { name: string; message: string };

type Upload = { kind: MediaKind; busy: boolean; pick: () => void; start: (files: File[]) => void; elements: ReactNode };

/**
 * Envio de arquivos de um tipo: confere formato e tamanho antes de subir, envia os
 * válidos e, se algo falhar, abre um modal explicando o motivo com a opção de
 * escolher outro arquivo. Nenhum código HTTP chega à tela.
 */
function useUpload<T>(kind: MediaKind, make: (file: File) => Promise<T>, commit: (items: T[]) => void, multiple = true): Upload {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<{ problems: UploadProblem[]; sent: number } | null>(null);

  const start = async (files: File[]) => {
    if (!files.length || busy) return;
    setBusy(true);
    const problems: UploadProblem[] = [];
    const valid = files.filter((file) => {
      const message = checkFile(file, kind);
      if (message) problems.push({ name: file.name, message });
      return !message;
    });
    const results = await Promise.allSettled(valid.map(make));
    const items: T[] = [];
    results.forEach((result, i) => {
      if (result.status === 'fulfilled') items.push(result.value);
      else problems.push({ name: valid[i].name, message: result.reason instanceof Error ? result.reason.message : 'Não foi possível enviar o arquivo. Tente de novo.' });
    });
    if (items.length) commit(items);
    if (problems.length) setReport({ problems, sent: items.length });
    setBusy(false);
  };

  const pick = () => inputRef.current?.click();
  const rule = UPLOAD_RULES[kind];
  const single = report?.problems.length === 1;

  const elements = (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={acceptFor(kind)}
        multiple={multiple}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          e.target.value = '';
          void start(files);
        }}
      />
      <ConfirmDialog
        open={Boolean(report)}
        title={single ? 'Não foi possível enviar este arquivo' : 'Alguns arquivos não foram enviados'}
        confirmLabel="Escolher outro arquivo"
        cancelLabel="Fechar"
        onCancel={() => setReport(null)}
        onConfirm={() => {
          setReport(null);
          pick();
        }}
        body={
          <div className="flex flex-col gap-3">
            <ul className="flex max-h-60 flex-col gap-2.5 overflow-y-auto">
              {report?.problems.map((problem, i) => (
                <li key={`${problem.name}-${i}`} className="rounded-lg bg-red-50 p-3">
                  <p className="truncate font-semibold text-red-900">{problem.name}</p>
                  <p className="text-red-800">{problem.message}</p>
                </li>
              ))}
            </ul>
            {Boolean(report?.sent) && <p>{report?.sent === 1 ? 'O outro arquivo foi enviado.' : `Os outros ${report?.sent} arquivos foram enviados.`}</p>}
            <p className="text-xs text-stone-500">Aceito para {rule.noun}: {limitLabel(kind)}.</p>
          </div>
        }
      />
    </>
  );

  return { kind, busy, pick, start: (files) => void start(files), elements };
}

function UploadButton({ upload, label, variant = 'primary' }: { upload: Upload; label: string; variant?: 'primary' | 'secondary' }) {
  return (
    <Button variant={variant} onClick={upload.pick} disabled={upload.busy}>
      <AdminIcon name="upload" className="size-4" />
      {upload.busy ? 'Enviando…' : label}
    </Button>
  );
}

/** Área para soltar ou clicar; mostra os formatos e o tamanho máximo aceitos. */
function DropZone({ upload, label }: { upload: Upload; label: string }) {
  const [over, setOver] = useState(false);
  return (
    <button
      type="button"
      onClick={upload.pick}
      disabled={upload.busy}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        upload.start(Array.from(e.dataTransfer.files));
      }}
      className={cx('flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-[1.5px] border-dashed bg-white p-5 text-center text-sm text-stone-600 disabled:cursor-wait', over ? 'border-rose-400 bg-rose-50' : 'border-stone-300 hover:border-stone-400')}
    >
      <span className="flex items-center gap-2.5">
        <AdminIcon name="upload" className="size-5" />
        {upload.busy ? 'Enviando…' : label}
      </span>
      <span className="text-xs text-stone-500">{limitLabel(upload.kind)}</span>
    </button>
  );
}

function RowActions({ index, total, onMove, onRemove, label }: { index: number; total: number; onMove: (dir: -1 | 1) => void; onRemove: () => void; label: string }) {
  return (
    <div className="flex items-center gap-1">
      <button type="button" aria-label={`Subir ${label}`} disabled={index === 0} onClick={() => onMove(-1)} className="flex size-8 cursor-pointer items-center justify-center rounded-lg text-stone-600 hover:bg-stone-100 disabled:opacity-30">
        <AdminIcon name="up" className="size-4" />
      </button>
      <button type="button" aria-label={`Descer ${label}`} disabled={index === total - 1} onClick={() => onMove(1)} className="flex size-8 cursor-pointer items-center justify-center rounded-lg text-stone-600 hover:bg-stone-100 disabled:opacity-30">
        <AdminIcon name="down" className="size-4" />
      </button>
      <button type="button" aria-label={`Remover ${label}`} onClick={onRemove} className="flex size-8 cursor-pointer items-center justify-center rounded-lg text-red-600 hover:bg-red-50">
        <AdminIcon name="trash" className="size-4" />
      </button>
    </div>
  );
}

function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <article className={cx('rounded-xl border border-stone-200 bg-white', className)}>{children}</article>;
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-xl border border-dashed border-stone-300 bg-white p-8 text-center text-sm text-stone-500">{children}</p>;
}

function MediaImage({ src, alt, className }: { src: string | undefined; alt: string; className?: string }) {
  const url = useMediaUrl(src);
  const [fallback, setFallback] = useState(false);
  useEffect(() => setFallback(false), [src]);
  const fallbackUrl = src ? mediaApiUrl(src) : undefined;
  return url ? <img src={fallback ? fallbackUrl : url} alt={alt} className={className} onError={() => fallbackUrl && !fallback && setFallback(true)} /> : <div className={cx('bg-stone-100', className)} />;
}

const fileTitle = (f: File) => f.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ');

/* ---------------- Textos ---------------- */

function TextsSection({ doc, edit }: { doc: HouseDocument; edit: Edit }) {
  const c = doc.content;
  const [n1, n2, n3, n4] = doc.appearance.characters.map((ch) => ch.name || 'Personagem');
  return (
    <>
      <Header title="Textos da casa" description="Nome, tela de entrada e as frases que aparecem nos balões." />
      <Card className="flex flex-col gap-5 p-5 sm:p-6">
        <h2 className="text-sm font-semibold text-stone-900">Entrada</h2>
        <TextField label="Nome da casa" value={c.houseName} onChange={(v) => edit((x) => void (x.houseName = v), 'houseName')} />
        <TextField label="Título de boas-vindas" value={c.welcome.title} onChange={(v) => edit((x) => void (x.welcome.title = v), 'w.title')} />
        <TextArea label="Descrição" rows={2} value={c.welcome.description} onChange={(v) => edit((x) => void (x.welcome.description = v), 'w.desc')} />
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField label="Texto do botão" value={c.welcome.button} onChange={(v) => edit((x) => void (x.welcome.button = v), 'w.button')} />
          <TextField label="Aviso abaixo do botão" value={c.welcome.note} onChange={(v) => edit((x) => void (x.welcome.note = v), 'w.note')} />
        </div>
        <TextField label="Dica no rodapé da casa" value={c.hint} onChange={(v) => edit((x) => void (x.hint = v), 'hint')} />
      </Card>
      <Card className="flex flex-col gap-5 p-5 sm:p-6">
        <h2 className="text-sm font-semibold text-stone-900">Balões de fala</h2>
        <TextField label={`Frase de ${n1}`} value={c.phrases.character1} onChange={(v) => edit((x) => void (x.phrases.character1 = v), 'p1')} />
        <TextField label={`Frase de ${n2}`} value={c.phrases.character2} onChange={(v) => edit((x) => void (x.phrases.character2 = v), 'p2')} />
        <TextField label={`Frase de ${n3}`} value={c.phrases.character3} onChange={(v) => edit((x) => void (x.phrases.character3 = v), 'p3')} />
        <TextField label={`Frase de ${n4}`} value={c.phrases.character4} onChange={(v) => edit((x) => void (x.phrases.character4 = v), 'p4')} />
        <TextField label="Frase do animalzinho" value={c.phrases.pet} hint="Use {nome} para mostrar o nome do animal." onChange={(v) => edit((x) => void (x.phrases.pet = v), 'pp')} />
      </Card>
      <Card className="flex flex-col gap-5 p-5 sm:p-6">
        <h2 className="text-sm font-semibold text-stone-900">Rádio</h2>
        <TextField label="Nome da playlist" value={c.playlist.name} onChange={(v) => edit((x) => void (x.playlist.name = v), 'pl')} />
        <Toggle label="Continuar tocando ao fechar o rádio" checked={c.playlist.keepPlayingOnClose} onChange={(v) => edit((x) => void (x.playlist.keepPlayingOnClose = v))} />
      </Card>
      <Card className="flex flex-col gap-5 p-5 sm:p-6">
        <div>
          <h2 className="text-sm font-semibold text-stone-900">Contador de dias</h2>
          <p className="mt-1 text-xs leading-relaxed text-stone-500">Edita o bloco destacado no topo do Calendário: o número de dias é calculado automaticamente a partir da data.</p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField label="Data inicial" type="date" value={c.togetherSince.date} hint="A data usada para calcular o total." onChange={(v) => edit((x) => void (x.togetherSince.date = v), 'ts.date')} />
          <TextField label="Texto depois do número" value={c.togetherSince.label} hint="Ex.: “dias juntos” ou “dias de amizade”." onChange={(v) => edit((x) => void (x.togetherSince.label = v), 'ts.label')} />
        </div>
      </Card>
    </>
  );
}

/* ---------------- Fotos ---------------- */

function PhotosSection({ content, edit, houseId }: { content: HouseContent; edit: Edit; houseId?: string }) {
  const upload = useUpload(
    'image',
    async (f) => ({ id: newId('p'), src: await putMedia(f, houseId), caption: fileTitle(f), alt: '' }),
    (items) => edit((c) => void c.photos.push(...items)),
  );
  return (
    <>
      <Header title="Fotos do quadro" description="Aparecem na galeria quando o visitante clica no quadro, nesta ordem." action={<UploadButton upload={upload} label="Enviar fotos" />} />
      <DropZone upload={upload} label="Solte as imagens aqui ou clique para escolher" />
      {upload.elements}
      {content.photos.length === 0 ? (
        <Empty>Nenhuma foto ainda. O quadro continua na casa e mostra um aviso até você enviar.</Empty>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {content.photos.map((p, i) => (
            <Card key={p.id} className="flex flex-col overflow-hidden">
              <MediaImage src={p.src} alt={p.alt || p.caption || `Foto ${i + 1}`} className="pixelated aspect-[3/2] w-full object-cover" />
              <div className="flex flex-col gap-3 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-stone-500">Foto {i + 1}</span>
                  <RowActions label={`foto ${i + 1}`} index={i} total={content.photos.length} onMove={(d) => edit((c) => move(c.photos, i, d))} onRemove={() => edit((c) => void c.photos.splice(i, 1))} />
                </div>
                <TextField label="Legenda" value={p.caption ?? ''} onChange={(v) => edit((c) => void (c.photos[i].caption = v), `pc-${p.id}`)} />
                <TextArea label="Descrição da imagem" rows={2} hint="Lida por leitores de tela." value={p.alt} onChange={(v) => edit((c) => void (c.photos[i].alt = v), `pa-${p.id}`)} />
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}

/* ---------------- Vídeos ---------------- */

function VideosSection({ content, edit, houseId }: { content: HouseContent; edit: Edit; houseId?: string }) {
  const upload = useUpload(
    'video',
    async (f) => ({ id: newId('v'), src: await putMedia(f, houseId), title: fileTitle(f), description: '' }),
    (items) => edit((c) => void c.videos.push(...items)),
  );
  return (
    <>
      <Header title="Vídeos da TV" description="Cada vídeo vira um canal na TV. Nada toca sozinho." action={<UploadButton upload={upload} label="Enviar vídeos" />} />
      <DropZone upload={upload} label="Solte os vídeos aqui ou clique para escolher" />
      {upload.elements}
      {content.videos.length === 0 ? (
        <Empty>Nenhum vídeo ainda.</Empty>
      ) : (
        <div className="flex flex-col gap-4">
          {content.videos.map((v, i) => (
            <Card key={v.id} className="flex flex-col gap-4 p-4 sm:flex-row">
              <div className="sm:w-56">
                <MediaImage src={v.poster} alt="" className="pixelated aspect-[16/10] w-full rounded-lg object-cover" />
                <PosterUpload hasPoster={Boolean(v.poster)} houseId={houseId} onPoster={(ref) => edit((c) => void (c.videos[i].poster = ref))} />
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-stone-500">Canal {i + 1}</span>
                  <RowActions label={`vídeo ${i + 1}`} index={i} total={content.videos.length} onMove={(d) => edit((c) => move(c.videos, i, d))} onRemove={() => edit((c) => void c.videos.splice(i, 1))} />
                </div>
                <TextField label="Título" value={v.title} onChange={(val) => edit((c) => void (c.videos[i].title = val), `vt-${v.id}`)} />
                <TextField label="Descrição" value={v.description ?? ''} onChange={(val) => edit((c) => void (c.videos[i].description = val), `vd-${v.id}`)} />
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}

function PosterUpload({ hasPoster, houseId, onPoster }: { hasPoster: boolean; houseId?: string; onPoster: (ref: string) => void }) {
  const upload = useUpload('image', (f) => putMedia(f, houseId), ([ref]) => onPoster(ref), false);
  return (
    <div className="mt-2 flex flex-col gap-1">
      <UploadButton upload={upload} variant="secondary" label={hasPoster ? 'Trocar capa' : 'Enviar capa'} />
      <span className="text-xs text-stone-500">Imagem até {UPLOAD_RULES.image.maxMb} MB</span>
      {upload.elements}
    </div>
  );
}

/* ---------------- Músicas ---------------- */

function TrackPreview({ src }: { src: string }) {
  const url = useMediaUrl(src);
  return url ? <audio controls preload="none" src={url} className="h-9 w-full max-w-xs" /> : null;
}

function TracksSection({ content, edit, houseId }: { content: HouseContent; edit: Edit; houseId?: string }) {
  const tracks = content.playlist.tracks;
  const upload = useUpload(
    'audio',
    async (f) => ({ id: newId('t'), src: await putMedia(f, houseId), title: fileTitle(f), artist: '', license: '' }),
    (items) => edit((c) => void c.playlist.tracks.push(...items)),
  );
  return (
    <>
      <Header title="Músicas do rádio" description="Use músicas próprias ou com licença que permita o uso." action={<UploadButton upload={upload} label="Enviar músicas" />} />
      <DropZone upload={upload} label="Solte as músicas aqui ou clique para escolher" />
      {upload.elements}
      {tracks.length === 0 ? (
        <Empty>Nenhuma música ainda.</Empty>
      ) : (
        <div className="flex flex-col gap-3">
          {tracks.map((t, i) => (
            <Card key={t.id} className="flex flex-col gap-3 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs font-medium text-stone-500">Faixa {String(i + 1).padStart(2, '0')}</span>
                <div className="flex flex-1 items-center justify-end gap-3">
                  <TrackPreview src={t.src} />
                  <RowActions label={`faixa ${i + 1}`} index={i} total={tracks.length} onMove={(d) => edit((c) => move(c.playlist.tracks, i, d))} onRemove={() => edit((c) => void c.playlist.tracks.splice(i, 1))} />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <TextField label="Título" value={t.title} onChange={(v) => edit((c) => void (c.playlist.tracks[i].title = v), `tt-${t.id}`)} />
                <TextField label="Artista" value={t.artist} onChange={(v) => edit((c) => void (c.playlist.tracks[i].artist = v), `ta-${t.id}`)} />
                <TextField label="Licença / crédito" value={t.license} onChange={(v) => edit((c) => void (c.playlist.tracks[i].license = v), `tl-${t.id}`)} />
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}

/* ---------------- Cartas ---------------- */

function LettersSection({ content, edit }: { content: HouseContent; edit: Edit }) {
  const add = () => edit((c) => void c.letters.push({ id: newId('l'), title: 'Nova carta', date: '', author: '', body: '' }));
  return (
    <>
      <Header
        title="Cartas da estante"
        description="Cada carta vira uma página dupla no livro. A ordem aqui é a ordem das páginas."
        action={
          <Button variant="primary" onClick={add}>
            <AdminIcon name="plus" className="size-4" />
            Nova carta
          </Button>
        }
      />
      {content.letters.length === 0 ? (
        <Empty>Nenhuma carta ainda.</Empty>
      ) : (
        <div className="flex flex-col gap-4">
          {content.letters.map((l, i) => (
            <Card key={l.id} className="flex flex-col gap-4 p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-stone-500">Carta {i + 1}</span>
                <RowActions label={`carta ${i + 1}`} index={i} total={content.letters.length} onMove={(d) => edit((c) => move(c.letters, i, d))} onRemove={() => edit((c) => void c.letters.splice(i, 1))} />
              </div>
              <TextField label="Título" value={l.title} onChange={(v) => edit((c) => void (c.letters[i].title = v), `lt-${l.id}`)} />
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField label="Data ou subtítulo" placeholder="Ex.: 14 de fevereiro de 2024" value={l.date} onChange={(v) => edit((c) => void (c.letters[i].date = v), `ld-${l.id}`)} />
                <TextField label="Assinatura" value={l.author} onChange={(v) => edit((c) => void (c.letters[i].author = v), `la-${l.id}`)} />
              </div>
              <TextArea label="Texto" rows={6} value={l.body} onChange={(v) => edit((c) => void (c.letters[i].body = v), `lb-${l.id}`)} />
            </Card>
          ))}
        </div>
      )}
    </>
  );
}

/* ---------------- Datas ---------------- */

function DatesSection({ content, edit }: { content: HouseContent; edit: Edit }) {
  const add = () => edit((c) => void c.specialDates.push({ id: newId('d'), title: 'Nova data', date: new Date().toISOString().slice(0, 10), description: '' }));
  return (
    <>
      <Header
        title="Datas especiais"
        description="O calendário mostra tudo em ordem cronológica e calcula há quantos dias foi."
        action={
          <Button variant="primary" onClick={add}>
            <AdminIcon name="plus" className="size-4" />
            Nova data
          </Button>
        }
      />
      {content.specialDates.length === 0 ? (
        <Empty>Nenhuma data ainda.</Empty>
      ) : (
        <div className="flex flex-col gap-3">
          {content.specialDates.map((d, i) => (
            <Card key={d.id} className="grid gap-3 p-4 sm:grid-cols-[1fr_170px_auto] sm:items-end">
              <TextField label="Título" value={d.title} onChange={(v) => edit((c) => void (c.specialDates[i].title = v), `dt-${d.id}`)} />
              <TextField label="Data" type="date" value={d.date} onChange={(v) => edit((c) => void (c.specialDates[i].date = v), `dd-${d.id}`)} />
              <div className="pb-0.5">
                <RowActions label={d.title} index={i} total={content.specialDates.length} onMove={(dir) => edit((c) => move(c.specialDates, i, dir))} onRemove={() => edit((c) => void c.specialDates.splice(i, 1))} />
              </div>
              <div className="sm:col-span-3">
                <TextField label="Descrição" value={d.description} onChange={(v) => edit((c) => void (c.specialDates[i].description = v), `ds-${d.id}`)} />
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}

/* ---------------- Mensagens ---------------- */

function MessagesSection({ content, edit }: { content: HouseContent; edit: Edit }) {
  const id = useId();
  const add = () => edit((c) => void c.chestMessages.push({ id: newId('m'), text: '' }));
  return (
    <>
      <Header
        title="Mensagens do baú"
        description="Cada vez que o baú é aberto, uma delas é sorteada."
        action={
          <Button variant="primary" onClick={add}>
            <AdminIcon name="plus" className="size-4" />
            Nova mensagem
          </Button>
        }
      />
      {content.chestMessages.length === 0 ? (
        <Empty>Nenhuma mensagem ainda.</Empty>
      ) : (
        <ol className="flex flex-col gap-3">
          {content.chestMessages.map((m, i) => (
            <li key={m.id}>
              <Card className="flex items-start gap-3 p-4">
                <label htmlFor={`${id}-${m.id}`} className="pt-2 text-xs font-medium text-stone-500">
                  {i + 1}
                </label>
                <textarea
                  id={`${id}-${m.id}`}
                  rows={2}
                  value={m.text}
                  placeholder="Escreva uma lembrança ou um recado…"
                  onChange={(e) => edit((c) => void (c.chestMessages[i].text = e.target.value), `m-${m.id}`)}
                  className="min-w-0 flex-1 resize-y rounded-lg border border-stone-300 px-3 py-2 text-sm leading-relaxed focus:border-stone-500 focus:ring-2 focus:ring-rose-200 focus:outline-none"
                />
                <RowActions label={`mensagem ${i + 1}`} index={i} total={content.chestMessages.length} onMove={(d) => edit((c) => move(c.chestMessages, i, d))} onRemove={() => edit((c) => void c.chestMessages.splice(i, 1))} />
              </Card>
            </li>
          ))}
        </ol>
      )}
    </>
  );
}
