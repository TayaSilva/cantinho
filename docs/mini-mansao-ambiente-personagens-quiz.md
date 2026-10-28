# SPEC — Mini Mansão: Ambiente, Personagens e Quiz

## Objetivo
Ampliar a experiência de personalização da Mini Mansão, tornando-a visualmente maior e com mais recursos que o Cantinho Grátis.

Preservar a arquitetura, a identidade visual e as funcionalidades existentes.

## 1. Ambiente da Mini Mansão

- Criar uma versão ampliada do cenário isométrico atual.
- Manter a mesma direção artística, perspectiva, iluminação e estilo pixel art.
- Aumentar a área útil do piso para acomodar os móveis adicionais.
- Preservar proporcionalmente os personagens e os móveis existentes.
- Ajustar posicionamento de objetos, colisões, camadas e áreas clicáveis.
- Garantir que o cenário inteiro possa ser visualizado em desktop e mobile.
- Não aplicar apenas zoom ou CSS scale para simular uma mansão maior.
- Manter o Cantinho Grátis com seu tamanho atual.

## 2. Novos móveis

Criar espaço para adicionar à Mini Mansão:
- Computador interativo.
- Mesa para computador.
- Novas opções de estantes.
- Novas opções de sofá.
- Poltrona.
- Plantas e decorações.
- Tapetes adicionais.
- Outros móveis compatíveis com o cenário ampliado.

Não remover os móveis já existentes.

## 3. Personagens

- Manter até 2 personagens no Grátis e até 4 na Mini Mansão.
- Adicionar novas opções de cabelos e penteados.
- Adicionar novas opções de roupas.
- Remover a opção de roupa "Jardineira" do catálogo de roupas e das opções selecionáveis.
- Caso existam personagens já usando jardineira, definir migração visual segura para uma roupa padrão antes de remover o recurso.
- Preservar a escolha de tons de pele em ambos os planos.
- Manter proporções, sprites e poses consistentes.

## 4. Animalzinho

- O plano Grátis não possui pet.
- A Mini Mansão permite 1 pet.
- Não criar múltiplos pets simultâneos.
- Preservar as opções existentes de personalização do animalzinho.

## 5. Papéis de parede

Cantinho Grátis:
- Preservar as cores lisas básicas.

Mini Mansão:
- Cores lisas.
- Estampa de corações.
- Estampa floral.
- Estrelas.
- Nuvens.
- Bolinhas.
- Xadrez.
- Outras estampas futuras.

As estampas devem seguir a perspectiva das paredes isométricas e manter boa legibilidade do cenário.

Criar uma separação visual entre "Cores" e "Estampas" no painel Ambiente.

## 6. Novo recurso: Quiz

Adicionar uma nova aba "Quiz" ao editor da Mini Mansão, com ícone de computador.

### Editor do proprietário

Permitir:
- Definir título do quiz.
- Escrever uma descrição.
- Adicionar até 10 perguntas.
- Criar de 2 a 4 alternativas por pergunta.
- Selecionar uma resposta correta.
- Reordenar perguntas.
- Editar e remover perguntas.
- Personalizar a mensagem de conclusão.
- Pré-visualizar a experiência.

### Experiência do visitante

- O computador aparece no cenário da Mini Mansão.
- Ao clicar no computador, abrir o quiz em um modal responsivo.
- Exibir uma pergunta por vez.
- Mostrar indicador de progresso.
- Permitir escolher uma alternativa e avançar.
- Ao concluir, exibir quantidade de acertos e mensagem personalizada.
- Oferecer opção de jogar novamente.
- Não exigir login do visitante.

### Estados de interface

- Quiz não configurado.
- Quiz em edição.
- Quiz pronto para publicar.
- Quiz publicado.
- Quiz sem perguntas disponíveis.
- Quiz finalizado.

Não exibir quiz vazio para visitantes.

## 7. Recursos Premium e bloqueios

- Identificar quais personalizações são exclusivas da Mini Mansão.
- Exibir ícone de coroa discreto nas opções Premium.
- Ao tentar selecionar um recurso bloqueado, abrir modal de upgrade.
- Não remover funcionalidades existentes de cantinhos antigos apenas por mudança de catálogo.
- Preservar o comportamento de usuários que já possuam recursos anteriormente liberados.

## 8. Responsividade

Desktop:
- Editor com pré-visualização central e painel de configurações lateral.
- Área maior de pré-visualização para a Mini Mansão.

Mobile:
- Permitir visualizar o cenário completo sem cortar móveis ou personagens.
- Oferecer zoom ou navegação quando necessário.
- Manter interações acessíveis por toque.
- Editor de quiz em formulário vertical.
- Modal de quiz adaptado à largura da tela.

## 9. Escopo desta etapa

Trabalhar inicialmente na estrutura visual e nos componentes de front-end.

Não implementar checkout, cobrança ou envio de e-mails.

Preparar a separação entre as funcionalidades dos planos sem comprometer os dados existentes.

## Critérios de aceite

- Mini Mansão é visualmente maior que o Cantinho Grátis.
- Novos móveis cabem adequadamente no ambiente.
- Jardineira não aparece mais como opção de roupa.
- Existem novas opções de cabelo, roupas e papéis de parede.
- Mini Mansão permite somente um pet.
- Computador aparece como móvel Premium.
- O proprietário consegue configurar e pré-visualizar o quiz.
- O visitante consegue responder perguntas e visualizar o resultado.
- O layout funciona em desktop e mobile.
- As funcionalidades já existentes continuam operando.
