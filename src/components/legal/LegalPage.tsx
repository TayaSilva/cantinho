import { useEffect, useMemo, useRef } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';
import { PRIVACY_MD, TERMS_MD } from '../../data/legal';
import { navigate } from '../../hooks/useRoute';

/**
 * Página de Privacidade e Termos: uma tela só, com duas abas.
 * Cada aba tem o seu endereço (/privacidade e /termos), então os links
 * diretos continuam funcionando e o botão "voltar" do navegador troca de aba.
 */

type TabId = 'privacidade' | 'termos';

const TABS: { id: TabId; label: string; title: string; md: string }[] = [
  { id: 'privacidade', label: 'Privacidade', title: 'Política de Privacidade', md: PRIVACY_MD },
  { id: 'termos', label: 'Termos de uso', title: 'Termos de Uso', md: TERMS_MD },
];

export function isLegalPath(path: string): boolean {
  return path === '/privacidade' || path === '/termos';
}

export function LegalPage({ path }: { path: string }) {
  const active: TabId = path === '/termos' ? 'termos' : 'privacidade';
  const tab = TABS.find((t) => t.id === active)!;
  const doc = useMemo(() => parse(tab.md), [tab.md]);
  const tabRefs = useRef<Record<TabId, HTMLButtonElement | null>>({ privacidade: null, termos: null });

  useEffect(() => {
    document.title = `${tab.title} · Cantinho`;
  }, [tab.title]);

  // link direto para uma seção (/privacidade#9-exclusao-da-conta)
  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (id) document.getElementById(id)?.scrollIntoView();
  }, [active]);

  const go = (id: TabId, focus = false) => {
    if (id !== active) navigate(`/${id}`);
    if (focus) tabRefs.current[id]?.focus();
  };
  const onTabKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    const i = TABS.findIndex((t) => t.id === active);
    let next = -1;
    if (e.key === 'ArrowRight') next = (i + 1) % TABS.length;
    if (e.key === 'ArrowLeft') next = (i - 1 + TABS.length) % TABS.length;
    if (e.key === 'Home') next = 0;
    if (e.key === 'End') next = TABS.length - 1;
    if (next >= 0) {
      e.preventDefault();
      go(TABS[next].id, true);
    }
  };

  return (
    <div className="min-h-dvh bg-wall font-sans text-ink">
      {/* topo */}
      <header className="border-b-[3px] border-ink bg-paper">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <a href="/" onClick={(e) => (e.preventDefault(), navigate('/'))} className="flex items-center gap-2 font-pixel text-xl font-semibold text-ink no-underline">
            <PixelHeart />
            Cantinho
          </a>
          <a
            href="/"
            onClick={(e) => (e.preventDefault(), navigate('/'))}
            className="border-[3px] border-ink bg-highlight px-3 py-1.5 font-pixel text-sm font-semibold text-ink no-underline shadow-[0_3px_0_var(--color-ink)] transition-transform hover:-translate-y-px active:translate-y-[2px] active:shadow-none"
          >
            Voltar ao cantinho
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-16 pt-8 sm:px-6">
        <p className="m-0 font-pixel text-base text-plum">Um cantinho especial para você.</p>
        <h1 className="mb-6 mt-1 font-pixel text-3xl font-semibold leading-tight sm:text-4xl">Privacidade e termos</h1>

        {/* abas */}
        <div role="tablist" aria-label="Documentos" className="flex gap-2">
          {TABS.map((t) => {
            const selected = t.id === active;
            return (
              <button
                key={t.id}
                ref={(el) => {
                  tabRefs.current[t.id] = el;
                }}
                type="button"
                role="tab"
                id={`tab-${t.id}`}
                aria-selected={selected}
                aria-controls={`painel-${t.id}`}
                tabIndex={selected ? 0 : -1}
                onClick={() => go(t.id)}
                onKeyDown={onTabKey}
                className={`relative -mb-[3px] border-[3px] border-ink px-4 py-2 font-pixel text-base font-semibold outline-none focus-visible:ring-4 focus-visible:ring-rug/50 sm:px-5 ${
                  selected ? 'z-10 border-b-paper bg-paper text-ink' : 'bg-wall-2 text-muted hover:bg-highlight hover:text-ink'
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {/* documento */}
        <div
          role="tabpanel"
          id={`painel-${active}`}
          aria-labelledby={`tab-${active}`}
          tabIndex={0}
          className="grid gap-8 border-[3px] border-ink bg-paper p-5 shadow-[6px_6px_0_rgba(70,53,63,.18)] outline-none sm:p-8 lg:grid-cols-[220px_1fr]"
        >
          {/* índice */}
          <nav aria-label={`Seções: ${tab.title}`} className="hidden lg:block">
            <div className="sticky top-6">
              <p className="mb-2 mt-0 font-pixel text-sm font-semibold uppercase tracking-wide text-muted">Nesta página</p>
              <ol className="m-0 list-none space-y-1 p-0">
                {doc.sections.map((s) => (
                  <li key={s.id}>
                    <a href={`#${s.id}`} className="block border-l-[3px] border-transparent py-0.5 pl-2 text-sm leading-snug text-muted no-underline hover:border-rug hover:text-ink">
                      {s.title}
                    </a>
                  </li>
                ))}
              </ol>
            </div>
          </nav>

          <article className="min-w-0 max-w-[68ch]">
            <h2 className="m-0 font-pixel text-2xl font-semibold sm:text-3xl">{tab.title}</h2>
            {doc.updated && <p className="mb-6 mt-2 inline-block border-2 border-ink bg-highlight px-2 py-0.5 font-pixel text-sm">{doc.updated}</p>}
            <div>{doc.blocks}</div>
          </article>
        </div>

        <p className="mt-6 text-center text-sm text-muted">
          Dúvidas? Escreva para{' '}
          <a href="mailto:taianens1d@gmail.com" className="font-semibold text-plum">
            taianens1d@gmail.com
          </a>
          .
        </p>
      </main>
    </div>
  );
}

function PixelHeart() {
  return (
    <svg width="20" height="20" viewBox="0 0 12 12" shapeRendering="crispEdges" aria-hidden="true">
      <path d="M1 3h1v-1h3v1h2v-1h3v1h1v3h-1v1h-1v1h-1v1h-1v1h-2v-1h-1v-1h-1v-1h-1v-1h-1z" fill="#C98190" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Markdown simples → React                                            */
/* ------------------------------------------------------------------ */

function slug(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Negrito, links, e-mails e lembretes [Inserir ...] dentro de uma linha. */
function inline(text: string, key: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*)|(https?:\/\/[^\s)]+[^\s).,;])|([\w.+-]+@[\w-]+\.[\w.]+[\w])|(\[[^\]]+\])/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const k = `${key}-${i++}`;
    if (m[1]) out.push(<strong key={k}>{inline(m[1].slice(2, -2), k)}</strong>);
    else if (m[2])
      out.push(
        <a key={k} href={m[2]} className="font-semibold text-plum underline decoration-2 underline-offset-2">
          {m[2].replace(/^https?:\/\//, '').replace(/\/$/, '')}
        </a>,
      );
    else if (m[3])
      out.push(
        <a key={k} href={`mailto:${m[3]}`} className="font-semibold text-plum underline decoration-2 underline-offset-2">
          {m[3]}
        </a>,
      );
    else if (m[4])
      out.push(
        <mark key={k} className="bg-highlight px-1 text-ink outline outline-2 outline-dashed outline-rug" title="Preencher antes de publicar">
          {m[4]}
        </mark>,
      );
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

function parse(md: string): { updated?: string; sections: { id: string; title: string }[]; blocks: ReactNode[] } {
  const lines = md.split('\n');
  const blocks: ReactNode[] = [];
  const sections: { id: string; title: string }[] = [];
  let updated: string | undefined;
  let para: string[] = [];
  let list: string[] = [];
  let n = 0;

  const flush = () => {
    if (para.length) {
      const text = para.join(' ');
      blocks.push(
        <p key={`p${n++}`} className="my-3 leading-relaxed">
          {inline(text, `p${n}`)}
        </p>,
      );
      para = [];
    }
    if (list.length) {
      const items = list;
      blocks.push(
        <ul key={`ul${n++}`} className="my-3 list-none space-y-1.5 pl-0">
          {items.map((it, j) => (
            <li key={j} className="relative pl-5 leading-relaxed">
              <span aria-hidden="true" className="absolute left-0.5 top-[0.6em] size-2 bg-rug" />
              {inline(it, `li${n}-${j}`)}
            </li>
          ))}
        </ul>,
      );
      list = [];
    }
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      flush();
      continue;
    }
    if (line.startsWith('# ')) continue; // o título vem da aba
    const up = /^\*\*(Última atualização:[^*]+)\*\*$/.exec(line);
    if (up) {
      updated = up[1];
      continue;
    }
    const strong = /^\*\*([^*]+)\*\*$/.exec(line);
    if (strong) {
      // linha toda em negrito = pequeno subtítulo (ex.: "Dados de cadastro")
      flush();
      blocks.push(
        <p key={`s${n++}`} className="mb-1 mt-5 font-bold">
          {inline(strong[1], `s${n}`)}
        </p>,
      );
      continue;
    }
    if (line.startsWith('## ')) {
      flush();
      const title = line.slice(3);
      const id = slug(title);
      sections.push({ id, title });
      blocks.push(
        <h3 key={`h${n++}`} id={id} className="mb-2 mt-9 scroll-mt-6 font-pixel text-xl font-semibold text-ink">
          {title}
        </h3>,
      );
      continue;
    }
    if (line === '---') {
      flush();
      blocks.push(<hr key={`hr${n++}`} className="my-8 h-[3px] border-0 bg-wall-2" />);
      continue;
    }
    if (line.startsWith('- ')) {
      if (para.length) flush();
      list.push(line.slice(2));
      continue;
    }
    if (list.length) flush();
    para.push(line);
  }
  flush();
  return { updated, sections, blocks };
}
