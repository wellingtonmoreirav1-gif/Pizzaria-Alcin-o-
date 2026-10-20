# Pendências e checklist de publicação

## Informações que ainda precisam ser fornecidas

Tudo abaixo é preenchido **pelo painel**, sem mexer no código.

| Informação | Onde cadastrar | Situação |
|---|---|---|
| Logo oficial | Configurações → Logo oficial | pendente |
| Foto principal da página inicial | Configurações → Foto principal | pendente |
| Lista completa de produtos | Cardápio | pendente (o cardápio será enviado) |
| Categorias definitivas | Categorias | criadas as do briefing; revisar |
| Sabores, tamanhos, preços, bordas, adicionais | Cardápio → produto | pendente |
| Regra de preço de pizza com 2+ sabores (por tamanho) | Cardápio → pizza → tamanhos | pendente (definir com a equipe) |
| Combos | Cardápio (tipo Combo) | pendente |
| Fotos dos produtos | Cardápio → produto (ver LOGO-E-IMAGENS.md) | pendente |
| Taxas de entrega / bairros atendidos | Entrega e pagamento | pendente (opcional; senão a taxa é sempre confirmada pela equipe) |
| Horários por dia da semana | Horários | hoje todos os dias ativos com 10h30 (almoço até encerrar) e 18h30–23h |
| Formas de pagamento por modalidade | Entrega e pagamento | configuradas com as formas informadas; revisar |
| Política de cancelamento | Configurações | pendente |
| E-mail para pedidos de privacidade | Configurações | pendente |
| Número no endereço / coordenadas do restaurante | Configurações | não informado (opcional) |
| Instagram e outros contatos | Configurações | opcional |
| Revisão jurídica dos textos de privacidade e termos | `/privacidade`, `/termos` | pendente |

## Verificação final antes de divulgar

Marque somente depois de conferir no **site publicado**.

- [ ] Site acessível pelo domínio com HTTPS (cadeado)
- [ ] Logo correta no cabeçalho e rodapé
- [ ] Dados de exemplo removidos (sem “[EXEMPLO]”; painel sem aviso de demonstração)
- [ ] Produtos cadastrados e publicados
- [ ] Imagens corretas e fiéis aos produtos (sem foto trocada)
- [ ] Preços revisados (inclusive por tamanho, bordas, adicionais e regra de pizza meio a meio)
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
