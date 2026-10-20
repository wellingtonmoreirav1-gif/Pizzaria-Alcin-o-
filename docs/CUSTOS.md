# Custos, limites e backups

> Valores levantados em **outubro de 2026** em fontes públicas (algumas de terceiros). Preços e limites mudam: **confira nas páginas oficiais** (vercel.com/pricing, supabase.com/pricing, registro.br) antes de contratar. Nenhum serviço foi contratado por este projeto.

## Resumo

| Item | Opção econômica | Observações |
|---|---|---|
| Hospedagem do site (Vercel) | Hobby (grátis) **não pode** ser usado comercialmente pelos termos atuais | **Pro ≈ US$ 20/mês** (1 assento), com cota mensal de uso inclusa |
| Banco, login, imagens (Supabase) | Free: ~500 MB de banco, 50 mil usuários/mês, até 2 projetos ativos | Projeto Free **pausa após 1 semana sem atividade** e não oferece backups automáticos para baixar. **Pro ≈ US$ 25/mês**: 8 GB, backups diários, sem pausa |
| Domínio `.com.br` | ≈ R$ 40/ano (Registro.br) | exige CPF ou CNPJ |
| WhatsApp (link wa.me) | grátis | API oficial (Business Platform) só com necessidade comprovada; cobra por conversa |
| Mapas | OpenStreetMap público: grátis, **sem garantia e só para baixo volume** | para produção, provedor com plano gratuito por chave (ex.: MapTiler, Stadia Maps), configurado em `NEXT_PUBLIC_MAP_TILE_URL` |
| Fotos | depende (fotógrafo ou ferramenta de IA paga) | — |
| E-mails de login | Supabase envia poucos e-mails/hora no padrão | SMTP próprio (ex.: provedores com plano gratuito) quando necessário |

**Estimativa realista inicial:** cerca de US$ 45/mês (Vercel Pro + Supabase Pro) + R$ 40/ano de domínio. Uma alternativa mais barata no início é Vercel Pro + Supabase Free, aceitando o risco de pausa e fazendo **backup manual semanal** (abaixo).

### Alternativas à Vercel

O sistema usa recursos padrão do Next.js e pode ser migrado para outra hospedagem que suporte Next.js 16 (ex.: Netlify, Cloudflare via OpenNext, um servidor Node próprio). Antes de escolher, confira se o plano permite uso comercial e se suporta os recursos usados (Server Actions, proxy, cache). A mudança exige apenas configurar as mesmas variáveis de ambiente.

## O que acontece quando um limite é atingido

| Situação | Efeito | O que o site faz |
|---|---|---|
| Supabase Free pausado por inatividade | API do banco para | Cardápio mostra aviso de indisponibilidade; pedidos são recusados com mensagem clara e o carrinho fica salvo. Reative no painel do Supabase. |
| Banco cheio no Free | gravações podem ser bloqueadas | registro do pedido falha com “Não conseguimos registrar seu pedido agora” (carrinho mantido). Pedidos já gravados continuam preservados. |
| Cota da Vercel excedida | no Pro, cobrança por uso adicional (ou bloqueio, se houver limite de gasto) | — |
| Provedor de mapa indisponível | mapa sem imagens | o cliente continua com o endereço digitado (o mapa é opcional) |
| WhatsApp não abre | — | pedido já registrado; botão “Copiar mensagem” |

Recomenda-se configurar **alerta de gastos/uso** nos painéis da Vercel e do Supabase.

## Backup e recuperação

- **Supabase Pro:** backups diários automáticos (restauração pelo painel). *Point-in-time recovery* é um adicional pago.
- **Supabase Free ou cópia extra:** semanalmente, com a *connection string* do projeto (Project Settings → Database):
  ```bash
  pg_dump "postgresql://postgres:SENHA@HOST:5432/postgres" --schema=public --no-owner -Fc -f alcinao-$(date +%F).dump
  ```
  Guarde o arquivo em local seguro (contém dados pessoais). Para restaurar em um projeto novo: aplique as migrations e rode `pg_restore --data-only -d "<nova connection string>" arquivo.dump`.
- **Imagens:** ficam no Storage (bucket `catalog`); baixe periodicamente pelo painel do Supabase se quiser cópia.
- **Código:** fica no GitHub; qualquer versão anterior pode ser publicada de novo na Vercel (*Deployments → Promote/Redeploy*).
