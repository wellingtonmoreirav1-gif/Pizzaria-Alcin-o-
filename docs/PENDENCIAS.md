# Pendências e checklist de publicação

## Informações que ainda precisam ser fornecidas

Tudo abaixo é preenchido **pelo painel**, sem mexer no código.

| Informação | Onde cadastrar | Situação |
|---|---|---|
| Logo oficial | Configurações → Logo oficial | **pendente** — não há arquivo de logo no projeto; o site usa o nome “Alcinão” em texto até a logo ser enviada |
| Foto principal da página inicial | Configurações → Foto principal | pendente |
| Cardápio oficial | Cardápio | **cadastrado** (40 produtos em 12 categorias — migration `20261020000200_official_menu.sql`) |
| **Preços das pizzas especiais e premium** | **Conferência de preços** | **a confirmar** (ver abaixo) |
| **Valor dos molhos** | **Conferência de preços** ou Bordas e molhos | **a definir** (grátis ou pago) |
| Pizza meio a meio (2+ sabores) | Cardápio → pizza → tamanhos | não informado: hoje todas as pizzas são de 1 sabor |
| Bebidas, sobremesas, almoço, churrasco, combos | Cardápio | não informados no cardápio oficial (categorias antigas ficaram ocultas) |
| Fotos dos produtos | Cardápio → produto (ver LOGO-E-IMAGENS.md) | pendente — hoje há **ilustrações provisórias** identificadas como tal |
| Taxas de entrega / bairros atendidos | Entrega e pagamento | pendente (opcional; senão a taxa é sempre confirmada pela equipe) |
| Horários por dia da semana | Horários | hoje todos os dias ativos com 10h30 (almoço até encerrar) e 18h30–23h |
| Formas de pagamento por modalidade | Entrega e pagamento | configuradas com as formas informadas; revisar |
| Política de cancelamento | Configurações | pendente |
| E-mail para pedidos de privacidade | Configurações | pendente |
| Número no endereço / coordenadas do restaurante | Configurações | não informado (opcional) |
| Instagram e outros contatos | Configurações | opcional |
| Revisão jurídica dos textos de privacidade e termos | `/privacidade`, `/termos` | pendente |

## Preços que precisam ser confirmados

Esses itens **aparecem no site**, com o aviso “Preço em conferência” ou “Valor a definir”, e **não podem ser pedidos** (nem pela tela nem pela API) até alguém com papel de gerente/administrador confirmar em **Painel → Conferência de preços**. Quem confirmou e quando fica gravado pelo banco e na Auditoria.

| Item | Valor cadastrado (referência) | Situação |
|---|---|---|
| 8 pizzas especiais (Frango com Catupiry, Calabresa com Catupiry, Carne de Sol, Carne de Sol com Queijo Coalho, Quatro Queijos, Frango com Cheddar, Pepperoni, Costela) | P 30,00 · M 45,00 · G 55,00 · GG 65,00 · F 80,00 | a confirmar |
| 2 pizzas premium (Camarão com Catupiry, Camarão aos Quatro Queijos) | P 30,00 · M 45,00 · G 55,00 · GG 65,00 · F 80,00 | a confirmar |
| Molhos: maionese verde, de alho, de bacon, de calabresa | nenhum valor | a definir (0,00 = grátis) |

Confirmados conforme o cardápio enviado: pizzas tradicionais e doces (25/39/50/60/75), bordas por tamanho, lanches, Beirute, petiscos, pratos da casa e lasanhas.

Produtos **novos** criados pelo painel também entram “em conferência” até a confirmação.

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
