# Casinha Interativa em Pixel Art + Backoffice

React + Vite + TypeScript + Tailwind CSS 4.

## Rodar

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # gera dist/ para publicar
npm run typecheck  # checagem de tipos
```

## Backend local

O projeto agora inclui uma API local em Node e um banco SQLite. Ela persiste o
rascunho, a versão publicada e os arquivos enviados pelo Backoffice.

Requer Node 22.5 ou mais recente (a API usa `node:sqlite`). Em dois terminais:

```bash
npm run api        # http://127.0.0.1:3001
npm run dev        # http://localhost:5173
```

O primeiro carregamento inicializa o banco com o conteúdo padrão. O arquivo
`data/casinha.sqlite` e os uploads em `data/uploads/` são criados
automaticamente e ficam fora do Git.

Esta API local ainda não tem autenticação e deve ser protegida antes de ser
publicada na internet. Para produção, a mesma API pode ser ligada a PostgreSQL
e Storage (ou Supabase) sem alterar o contrato usado pelo frontend.

## Produção na Vercel + Supabase

Para publicar o Backoffice com banco e uploads persistentes:

1. Crie um projeto no Supabase.
2. Rode `supabase/schema.sql` no SQL Editor.
3. Crie um usuário em `Authentication > Users`.
4. Adicione o UUID desse usuário em `public.admin_users`:

```sql
insert into public.admin_users(user_id)
values ('UUID_DO_USUARIO');
```

5. Na Vercel, configure as variáveis de `.env.example`. A
`SUPABASE_SERVICE_ROLE_KEY` deve existir apenas nas variáveis do servidor e
nunca em uma variável `VITE_*`.
6. Faça um novo deploy. O frontend usa as funções em `api/`, o documento fica
no PostgreSQL e os arquivos são enviados diretamente ao Storage.

| Endereço | O que é |
|---|---|
| `/` | Casinha pública (mostra só a versão **publicada**) |
| `/?preview=draft` | Pré-visualização do rascunho (aberta pelo botão do Backoffice) |
| `/?periodo=noite` | Força um período na janela (`manha`, `tarde`, `noite`, `madrugada`) |
| `/admin/editor` | **Personalizar casinha** — editor visual |
| `/admin/conteudos/fotos` | Conteúdos: `textos`, `fotos`, `videos`, `musicas`, `cartas`, `datas`, `mensagens` |

Ao publicar o site, configure o servidor para devolver `index.html` em qualquer
rota (já incluídos `vercel.json` e `public/_redirects` para Vercel/Netlify).

## Backoffice

**Personalizar casinha (`/admin/editor`)** — menu de categorias, pré-visualização
clicável e painel de propriedades:

- **Ambiente:** cor das paredes, piso, modelo de janela, cortina e cor, janela
  dinâmica, tipo de luz e luminária.
- **Móveis:** sofá, almofadas, mesa, tapete, estante (+ capa e cor dos livros),
  TV, rádio, quadro, calendário, luminária, baú e plantas — modelo e visibilidade.
- **Personagem 1 e 2 (independentes):** nome, tom de pele, estilo e cor do cabelo,
  roupa e cor, acessório e expressão.
- **Animalzinho:** exibir sim/não, nome, tipo (gato, cachorro, coelho, hamster,
  pássaro), aparência por tipo, acessório (só combinações válidas) e animação.
- **Decorações:** luzinhas, bolinhas na parede, polaroid, itens na mesa, planta do canto.

Clique num objeto da prévia para editá-lo. Cada característica tem até 5 opções,
mostradas como amostras de cor ou miniaturas desenhadas com a própria arte.

**Conteúdos (`/admin/conteudos/*`)** — textos da casa e frases dos balões,
fotos, vídeos (com capa), músicas, cartas, datas especiais e mensagens do baú.
Envio de arquivos por botão ou arrastando, edição, reordenação e remoção.

**Rascunho e publicação** (vale para as duas áreas):
Desfazer (também Ctrl+Z) · Restaurar padrão (só a aparência, com confirmação) ·
Pré-visualizar · Salvar rascunho · Publicar (com confirmação). Os visitantes só
veem as mudanças depois de publicar. Ocultar um objeto não apaga o conteúdo dele.

## Onde fica cada coisa

```text
src/
├── assets/media/            mídias de exemplo (geradas para a demo, uso livre)
├── components/
│   ├── admin/               Backoffice
│   │   ├── AdminApp.tsx     layout, rascunho/publicação, rotas /admin
│   │   ├── EditorPage.tsx   editor visual
│   │   ├── ContentPage.tsx  gestão de conteúdos
│   │   ├── Thumbnails.tsx   miniaturas das opções
│   │   └── controls.tsx     amostras, miniaturas, interruptores, campos…
│   ├── house/               a casinha
│   │   ├── HouseScene.tsx   cena em camadas + áreas clicáveis (visitante/editor)
│   │   ├── Room.tsx         piso, paredes, luzinhas
│   │   ├── DynamicWindow.tsx janela, cortinas e céu por horário
│   │   ├── Furniture.tsx    móveis (5 modelos cada)
│   │   ├── Character.tsx    personagens
│   │   ├── Pet.tsx          animais
│   │   ├── iso.tsx          ferramentas de desenho isométrico
│   │   ├── HouseLayer.tsx / InteractiveObject.tsx
│   ├── modals/              rádio, TV, fotos, livro, calendário, baú
│   └── ui/                  botão pixelado, áudio
├── data/
│   ├── catalog.ts           CATÁLOGO de opções (= tabela asset_options)
│   ├── houseConfig.ts       posições fixas, áreas clicáveis, aparência padrão
│   └── mockContent.ts       conteúdo padrão
├── services/
│   ├── houseStore.ts        rascunho/publicado (localStorage)
│   └── mediaStore.ts        arquivos enviados (IndexedDB)
├── hooks/                   useHouseDraft, useHouseTime, useHouseModal, useMediaUrl, useRoute
└── types/house.ts
```

## Persistência (e como ligar um banco depois)

Nesta versão tudo fica **no navegador**: o rascunho e a versão publicada em
`localStorage`, e os arquivos enviados em IndexedDB. Ou seja, cada navegador tem a
sua casinha — ótimo para testar e demonstrar, mas para compartilhar com outra
pessoa é preciso um backend.

A aparência é um JSON versionado (`HouseAppearance`) com IDs estáveis do catálogo,
no formato do spec (`house_appearance`, `house_characters`, `house_pet`). Para usar
um banco, reescreva só `services/houseStore.ts` (loadDraft, saveDraft, loadPublished,
publish) e `services/mediaStore.ts` (upload e URL dos arquivos). Componentes e
editor não mudam.

## Adicionar ou trocar opções do catálogo

Cada opção em `data/catalog.ts` tem `id`, `elementType`, `name`, `sortOrder`,
`isActive` e os parâmetros de desenho em `value`. Para desativar uma opção sem
quebrar casinhas que já a usam, marque `isActive: false`. Se um ID salvo deixar de
existir, a casa usa a primeira opção do tipo — nada quebra.

Não há login nesta versão: proteja `/admin` no servidor (ou adicione autenticação)
antes de colocar no ar.
