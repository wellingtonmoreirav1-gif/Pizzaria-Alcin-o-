# LGPD — dados pessoais

Os textos públicos ficam em `/privacidade` e `/termos` e **devem ser revisados pelo responsável pelo estabelecimento** (de preferência com apoio jurídico) antes da publicação.

## O que é coletado

| Dado | Quando | Finalidade | Retenção |
|---|---|---|---|
| Nome e telefone | todo pedido | identificar e contatar sobre o pedido | enquanto necessário para histórico/obrigações; anonimizável |
| Endereço e referência | só entrega | entregar | idem |
| Coordenadas do mapa | só entrega, por ação do cliente | ajudar o entregador | apagadas automaticamente após o prazo (padrão 90 dias) depois do pedido encerrado |
| Hash do IP | todo pedido | limitar abusos | apagado após 2 dias |
| E-mail, senha (hash), endereços, favoritos | só quem cria conta | conveniência | até a exclusão da conta |

Não há rastreamento contínuo, localização em segundo plano, cookies de publicidade nem venda de dados.

## Minimização

- O pedido pede só nome e telefone (e endereço na entrega).
- A localização é opcional, pedida apenas quando o cliente toca no botão, uma única vez, e explicada na tela.
- Cadastro é opcional.

## Atendimento aos titulares

| Pedido do titular | Como atender |
|---|---|
| Acesso / confirmação | Painel → **Clientes** → buscar pelo telefone (lista os pedidos). Cliente com conta vê tudo em **Minha conta**. |
| Correção | Cliente com conta edita em **Minha conta**. Pedidos já feitos guardam a “fotografia” do momento; anote a correção no atendimento. |
| Exclusão (com conta) | O próprio cliente usa **Minha conta → Excluir minha conta**: apaga conta, perfil, endereços e favoritos e anonimiza os pedidos (mantém itens e valores). |
| Exclusão (sem conta) | Administrador: **Clientes → Pedido de exclusão de dados** (anonimiza pelo telefone). |
| Portabilidade / informação | Exportar os pedidos do telefone a partir da consulta e enviar ao titular por canal seguro. |

Obrigações legais de guarda (por exemplo, fiscais/contábeis) podem exigir manter registros de venda: por isso a exclusão **anonimiza** em vez de apagar o pedido.

## Rotina de limpeza

`public.purge_expired_personal_data()` apaga coordenadas e hashes de IP vencidos. Agende no Supabase com `pg_cron` (README → Etapa A, passo 7). Para rodar manualmente: `select public.purge_expired_personal_data();` no SQL Editor.

## Segurança

Veja a seção “Segurança” em [ARQUITETURA.md](ARQUITETURA.md#segurança). Em caso de incidente, a LGPD exige avaliar e comunicar a ANPD e os titulares quando houver risco relevante.
