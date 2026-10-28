# Pagamentos da Mini Mansão — Mercado Pago (Checkout Pro / Orders API)

Plano Mini Mansão: **R$ 14,90**, pagamento único, **6 meses** de validade,
renovação manual (sem cobrança recorrente).

## Fluxo

1. A pessoa dona do cantinho clica em contratar/renovar em **Meu plano**.
2. `POST /api/payments/checkout?house_id=…` (sessão Supabase obrigatória, só o dono):
   - o servidor lê o preço em `plan_definitions` (o corpo da requisição é ignorado);
   - grava um pedido em `payment_orders` (`creating`), com no máximo um pedido aberto por cantinho;
   - cria a order em `POST https://api.mercadopago.com/v1/orders` (`type: online`,
     `processing_mode: manual`, `external_reference` = id do pedido, `X-Idempotency-Key` = id do pedido);
   - guarda o id da order e a `checkout_url` e devolve o link.
3. O navegador vai para a `checkout_url` (só domínios do Mercado Pago são aceitos).
   Pix, crédito e débito aparecem conforme a conta Mercado Pago.
4. O Mercado Pago chama `POST /api/payments/webhook`. O servidor:
   - valida `x-signature` (HMAC-SHA256 de `id:<data.id>;request-id:<x-request-id>;ts:<ts>;`);
   - ignora o conteúdo da notificação e consulta `GET /v1/orders/{id}`;
   - confere `external_reference`, id da order, moeda (BRL) e valor (R$ 14,90);
   - chama `sync_payment_order` no banco, que é idempotente e não deixa estados regredirem.
5. O retorno (`/admin/cantinho/:id/plano?pedido=…`) mostra o estado consultando
   `GET /api/payments/order?id=…`, que também confere a order no Mercado Pago.
   **Parâmetros da URL de retorno nunca liberam nada.**

### Ativação (`apply_mansao_payment`, numa única transação)

| Situação no momento da confirmação | Nova validade |
|---|---|
| Free (upgrade) | agora + 6 meses |
| Mini Mansão ativa (renovação antecipada) | vencimento atual + 6 meses |
| Mini Mansão vencida / exclusão programada | agora + 6 meses (exclusão cancelada) |
| Cantinho excluído ou suspenso | nada é aplicado; pedido vai para `needs_review` |

Cada pedido é aplicado no máximo uma vez (`applied_at`), com pedido, cantinho e plano travados (`FOR UPDATE`).

### Reembolso e contestação

- `refunded` ou `charged_back`: remove os 6 meses daquele pedido (`revoke_mansao_payment`).
  Se a validade cair no passado, o plano fica `expired` e segue o fluxo normal de vencimento.
  Nada é excluído.
- Reembolso parcial ou disputa em andamento (`in_mediation`): `needs_review`, sem mexer na validade.
  > Política a confirmar com o negócio: hoje a revisão desses casos é manual.

## Endpoints

| Método | Rota | Acesso |
|---|---|---|
| POST | `/api/payments/checkout?house_id=` | dono do cantinho |
| GET | `/api/payments/order?id=` | dono do cantinho do pedido |
| GET | `/api/payments/history?house_id=` | dono do cantinho |
| GET | `/api/houses/plan?house_id=` | membros (histórico só para o dono) |
| POST | `/api/payments/webhook` | Mercado Pago (assinatura obrigatória) |

As quatro rotas de pagamento ficam numa única função (`api/payments/[action].mjs`)
para caber no limite de 12 funções do plano Hobby da Vercel.

## Variáveis de ambiente (Vercel → Settings → Environment Variables)

| Variável | Onde obter | Observação |
|---|---|---|
| `MERCADO_PAGO_ACCESS_TOKEN` | Suas integrações → aplicação → Credenciais | Use a credencial **de teste** nesta etapa |
| `MERCADO_PAGO_WEBHOOK_SECRET` | Suas integrações → aplicação → Webhooks → Assinatura secreta | Necessária para aceitar notificações |
| `APP_ORIGIN` | — | `https://www.cantinho.dev.br` (usada nas URLs de retorno e no CORS) |
| `MERCADO_PAGO_ENV` | — | `test` (padrão). Cobrança real só com `production` |

Nenhuma delas pode ter prefixo `VITE_`. Não coloque valores reais em arquivos versionados.

Proteção contra cobrança real acidental: com `MERCADO_PAGO_ENV=production`, um token
`TEST-…` é recusado; sem `production`, o ambiente é tratado como teste. Notificações
com `live_mode: true` num ambiente de teste ficam registradas em `payment_events`.

## Banco (Supabase)

Aplicar no SQL Editor, depois das anteriores:

- `supabase/migrations/20261028_0004_pagamentos_mini_mansao.sql`

Cria `payment_orders`, `payment_events`, a coluna `house_plans.last_payment_order_id`
e as funções `sync_payment_order`, `apply_mansao_payment` e `revoke_mansao_payment`.
É idempotente e não altera nem exclui cantinhos existentes. `anon` e `authenticated`
não têm grants nas tabelas novas nem nas funções; só `service_role` executa a sincronização.

## Configuração manual no painel do Mercado Pago

1. **Suas integrações → Criar aplicação** (produto: Checkout Pro, integração via Orders).
2. **Credenciais de teste**: copie o Access Token para `MERCADO_PAGO_ACCESS_TOKEN` na Vercel.
3. **Webhooks → Configurar notificações**
   - URL (modo teste): `https://www.cantinho.dev.br/api/payments/webhook`
   - Evento: **Order (Mercado Pago)**
   - Copie a **assinatura secreta** para `MERCADO_PAGO_WEBHOOK_SECRET`.
4. **Contas de teste**: crie um vendedor e um comprador de teste e use os cartões
   de teste da documentação para simular aprovado, recusado e pendente.
5. Use **Simular notificação** no painel para conferir que o endpoint responde 200.

Para produção (etapa futura): credenciais de produção, URL de produção do webhook,
`MERCADO_PAGO_ENV=production` e um novo deploy.

## Testes

```bash
npm test          # integração dos endpoints com Supabase/Mercado Pago simulados
npm run test:db   # aplica schema + migrations num Postgres descartável (Docker) e roda os cenários SQL
```

`test:db` cobre: Pix pendente → aprovado, webhook duplicado, evento fora de ordem,
dois pedidos simultâneos, renovação antecipada, renovação de vencido (com exclusão
programada), valor/moeda divergentes, recusado, cantinho excluído, reembolso,
contestação e bloqueio de escrita para `anon`/`authenticated`.
