# Pendências e checklist de publicação

## Informações que ainda precisam ser fornecidas

Tudo abaixo é preenchido **pelo painel**, sem mexer no código.

| Informação | Onde cadastrar | Situação |
|---|---|---|
| Logo oficial | **Painel → Fotos e logo** | **upload manual pela equipe** — arquivo recebido em 21/10/2026; não foi colocado no código. Envie de preferência a versão com fundo transparente (PNG) |
| Foto principal da página inicial | Painel → Fotos e logo | upload manual pela equipe (opcional) |
| Fotos dos produtos | **Painel → Fotos e logo** (lista de todos os produtos, com filtro “Sem foto real”) | **upload manual pela equipe** — até lá aparecem **ilustrações provisórias** identificadas como tal |
| Cardápio oficial | Cardápio | **cadastrado** (40 produtos em 12 categorias + 6 bebidas) |
| Preços das pizzas especiais e premium | — | **confirmados** em 21/10/2026: P 30,00 · M 45,00 · G 55,00 · GG 65,00 · F 80,00 |
| Molhos | — | **confirmados como grátis** (R$ 0,00) em 21/10/2026 |
| **Preços das bebidas** | **Conferência de preços** | **a definir** (ver abaixo) |
| **Marcas/tamanhos de cerveja** | Cardápio → Cerveja → Tamanhos/variantes | **não informados** |
| Pizza meio a meio (2 sabores) | — | **definido** em 21/10/2026: só G, GG e F, vale o sabor mais caro, pode misturar tipos (ver REGRAS-DE-PRECO.md). Em aberto: permitir metade doce + metade salgada? (hoje permite) |
| Sobremesas, almoço, churrasco, combos | Cardápio | não informados (categorias antigas ficaram ocultas, não apagadas) |
| Taxas de entrega / bairros atendidos | Entrega e pagamento | pendente (opcional; senão a taxa é sempre confirmada pela equipe) |
| Horários por dia da semana | Horários | hoje todos os dias ativos com 10h30 (almoço até encerrar) e 18h30–23h |
| Formas de pagamento por modalidade | Entrega e pagamento | configuradas com as formas informadas; revisar |
| Política de cancelamento | Configurações | pendente |
| E-mail para pedidos de privacidade | Configurações | pendente |
| Número no endereço / coordenadas do restaurante | Configurações | não informado (opcional) |
| Instagram e outros contatos | Configurações | opcional |
| Revisão jurídica dos textos de privacidade e termos | `/privacidade`, `/termos` | pendente |

### Página inicial (decisões em aberto)

- [ ] **Bebidas:** ficam fora do cardápio e são oferecidas no carrinho ("Vai uma bebida gelada?") e logo depois de adicionar um lanche ou uma pizza. Só aparecem as que têm preço cadastrado (Painel → Conferência de preços).
- [ ] **Telefone para ligação:** só há o número de WhatsApp cadastrado. Se ele também atende ligações, dá para incluir um botão "Ligar".
- [ ] **Primeiro destaque:** hoje é o lanche "Alcinão — Especial da Casa" (marcado como destaque no cadastro). Para abrir com uma pizza, ajustar em Painel → Cardápio.
- [ ] **Churrasco:** a vitrine "Pratos da casa" mostra os pratos na chapa. Itens de churrasco de verdade (ex.: espetinhos) precisam ser cadastrados para aparecer.

## Preços que precisam ser confirmados

Esses itens **aparecem no site** com “Preço a definir” e **não podem ser pedidos** (nem pela tela nem pela API) até alguém com papel de gerente/administrador informar o valor em **Painel → Conferência de preços** → **Salvar e confirmar valores**. Valor 0,00 não é aceito para produto (evita liberar um item de graça por engano). Quem confirmou e quando fica gravado pelo banco e na Auditoria.

| Bebida | Tamanhos cadastrados | Situação |
|---|---|---|
| Coca-Cola | Lata · 600 ml · 1 litro · 2 litros | sem preço (não havia preço antigo no banco) |
| Fanta Laranja | Lata · 600 ml · 1 litro · 2 litros | sem preço — **tamanhos supostos iguais aos da Coca-Cola**; remova no editor do produto o que não for vendido |
| Cajuína | Lata · 600 ml · 1 litro · 2 litros | sem preço — **tamanhos supostos iguais aos da Coca-Cola**; ajuste no editor |
| Cerveja | nenhum (marcas não informadas) | cadastre as marcas como tamanhos/variantes (ex.: “Lata 350 ml”) e confirme os preços |
| H2OH! 500 ml | — | sem preço |
| Água mineral 500 ml | — | sem preço |

Já confirmados: todas as pizzas (tradicionais, doces, especiais e premium), bordas por tamanho, lanches, Beirute, petiscos, pratos da casa, lasanhas e molhos (grátis).

Produtos **novos** criados pelo painel também entram “em conferência” até a confirmação.

## Dados de exemplo

A limpeza dos itens “[EXEMPLO]” foi autorizada em 21/10/2026 e está na migration `20261021000200_remove_demo.sql` (mesmo conteúdo de `supabase/remove-demo.sql`): ao aplicar as migrations no Supabase, os produtos de demonstração são removidos (ou arquivados, se algum pedido os usou). Só afeta itens marcados como demonstração. **Não rode `seed-demo.sql` no banco de produção.**

## Verificação final antes de divulgar

Marque somente depois de conferir no **site publicado**.

- [ ] Site acessível pelo domínio com HTTPS (cadeado)
- [ ] Logo correta no cabeçalho e rodapé
- [ ] Dados de exemplo removidos (sem “[EXEMPLO]”; painel sem aviso de demonstração)
- [ ] Produtos cadastrados e publicados
- [ ] Imagens corretas e fiéis aos produtos (sem foto trocada)
- [ ] Preços revisados (inclusive por tamanho, bordas, adicionais e regra de pizza meio a meio)
- [ ] **Conferência de preços** vazia (painel sem o aviso “preço(s) aguardando conferência”)
- [ ] Horários configurados e status “aberto/fechado” correto no celular
- [ ] Encerrar almoço e pausar pedidos testados
- [ ] WhatsApp correto: fazer um pedido de teste e conferir que abre o número **(83) 99921-6691** com a mensagem completa
- [ ] Mapa funcionando e localização **opcional** (testar aceitar e recusar no celular)
- [ ] Taxas/bairros configurados (ou equipe treinada para confirmar a taxa)
- [ ] Login administrativo seguro (senha forte; somente pessoas autorizadas em Equipe)
- [ ] Pedido de teste registrado, avançado até “Concluído” e depois cancelado/anonimizado se necessário
- [ ] Relatórios mostrando o pedido de teste
- [ ] Envio de imagem pelo painel funcionando (Storage)
- [ ] E-mail de confirmação de conta e de recuperação de senha chegando
- [ ] Política de privacidade e termos revisados e publicados
- [ ] Testes automatizados executados (`npm test`, `npm run test:db`, `npm run test:e2e`)
- [ ] Rotina `pg_cron` de limpeza agendada
- [ ] Backup configurado (Supabase Pro) ou rotina de `pg_dump` documentada e testada
- [ ] Alertas de uso/gastos ativados na Vercel e no Supabase
