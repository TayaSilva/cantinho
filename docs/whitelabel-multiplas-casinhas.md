# Plano: múltiplos cantinhos por usuário

## Resumo

A estrutura do banco já permite que um usuário tenha várias casas, mas o frontend e as APIs ainda usam automaticamente a primeira casa encontrada. O objetivo é adicionar:

- seletor de cantinho no topo do painel;
- criação de novos cantinhos pelo próprio usuário;
- novas casas iniciando com o modelo padrão;
- persistência da casa selecionada;
- validação server-side de pertencimento;
- rascunhos, publicações, mídias e links separados por casa;
- nenhuma função serverless nova, mantendo o limite de 12 da Vercel Hobby.

## Seleção no painel

Adicionar um seletor no cabeçalho do `/admin` com:

- nome de cada casa disponível;
- casa atualmente selecionada;
- botão “Novo cantinho”;
- troca de casa sem sair da conta.

A casa selecionada será salva no `localStorage`. O identificador também será enviado nas chamadas de API e sempre validado pelo backend.

## Criação de casa

Usar o endpoint existente `/api/me/houses` com suporte a `POST`, evitando criar uma nova função Vercel.

Fluxo:

1. usuário clica em “Novo cantinho”;
2. informa o nome;
3. frontend envia o documento padrão;
4. backend cria `houses`, `house_members`, `draft` e `published`;
5. nova casa é selecionada automaticamente.

A casa começa com o modelo padrão atual, sem copiar mídias de outra casa.

## APIs multi-casa

Substituir o uso de `requireDefaultHouse()` por uma resolução que:

1. lê `house_id` da requisição;
2. valida o usuário pelo Supabase Auth;
3. verifica se ele pertence à casa;
4. verifica o papel necessário;
5. executa a operação somente após essas validações.

Rotas existentes passarão a aceitar `house_id`:

```text
GET  /api/house/draft?house_id=...
PUT  /api/house/draft?house_id=...
POST /api/house/publish?house_id=...
POST /api/house/bootstrap?house_id=...
POST /api/media/complete?house_id=...
GET  /api/media/:id?house_id=...
DELETE /api/media/:id?house_id=...
POST /api/houses/share-links?house_id=...
POST /api/houses/invitations?house_id=...
POST /api/houses/texts?house_id=...
```

O backend nunca confiará apenas no `house_id` recebido: sempre confirmará a associação em `house_members`.

## Frontend e estado

Atualizar:

- `useHouseDraft` para receber `houseId`;
- `houseStore` para incluir `house_id` nas chamadas;
- `mediaStore` para enviar arquivos à pasta da casa selecionada;
- compartilhamento para criar o link da casa selecionada;
- preview e publicação para usarem somente a casa ativa;
- carregamento de documentos ao trocar de casa.

Ao trocar de casa:

- limpar o documento atual da memória;
- carregar o rascunho da nova casa;
- recalcular o status de publicação;
- invalidar URLs e caches de mídia da casa anterior;
- impedir que dados da casa anterior apareçam temporariamente.

## Segurança e isolamento

Manter e reforçar:

- RLS por `house_id`;
- dono editando e publicando apenas suas casas;
- convidado adicionando apenas cartas, datas e mensagens da casa autorizada;
- mídias armazenadas dentro do diretório da casa;
- links compartilhados específicos e revogáveis;
- tokens públicos sem acesso a outras casas;
- validação de casa em exclusão e geração de links;
- nenhum `service_role_key` no frontend;
- testes contra troca manual de `house_id`.

## Banco de dados

As tabelas existentes já suportam múltiplas casas:

- `houses`;
- `house_members`;
- `house_documents`;
- `media`;
- `house_share_links`;
- `house_invitations`.

Será adicionada apenas a validação necessária para impedir que o usuário opere sobre uma casa à qual não pertence.

## Testes e critérios de aceite

- usuário com duas casas consegue alternar entre elas;
- cada casa mostra seu próprio rascunho;
- publicar uma casa não altera a outra;
- upload em uma casa não aparece na outra;
- cada casa gera um link público diferente;
- revogar o link de uma casa não revoga os outros;
- criar uma casa gera documentos padrão;
- usuário não acessa outra casa alterando o `house_id`;
- convidado não troca para casas onde não é membro;
- mídias antigas continuam funcionando;
- typecheck, build e funções Vercel passam;
- o projeto permanece dentro do limite de 12 funções serverless.

## Premissas

- uma conta pode possuir várias casas;
- novas casas são criadas pelo botão do painel;
- novas casas usam o modelo padrão;
- uma casa pode continuar tendo convidados;
- a seleção é persistida no navegador;
- não haverá cobrança nesta etapa;
- será usada uma única aplicação Vercel e um único projeto Supabase.
