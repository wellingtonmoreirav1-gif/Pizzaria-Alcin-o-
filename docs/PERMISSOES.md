# Permissões por papel

A permissão é conferida em três camadas: o `proxy.ts` (redirecionamento para o login), o servidor (`requireStaff` em cada página/ação/rota) e o banco (RLS e funções SQL). Esconder um link nunca é a única proteção.

| Área | Administrador | Gerente | Atendente | Cliente | Visitante |
|---|:-:|:-:|:-:|:-:|:-:|
| Ver e montar pedidos no site | ✔ | ✔ | ✔ | ✔ | ✔ |
| Ver os próprios pedidos/endereços/favoritos | ✔ | ✔ | ✔ | ✔ | — (link com token) |
| Painel: pedidos (status, taxa antes do aceite, cancelar) | ✔ | ✔ | ✔ | — | — |
| Alterar taxa de pedido **já aceito** (com justificativa) | ✔ | ✔ | — | — | — |
| Operação do dia (pausar, encerrar almoço, esgotados) | ✔ | ✔ | ✔ | — | — |
| Cardápio, categorias, promoções, banners | ✔ | ✔ | — | — | — |
| Horários, entrega/pagamento, configurações | ✔ | ✔ | — | — | — |
| Relatórios e valores de vendas | ✔ | ✔ | — | — | — |
| Clientes (histórico por telefone, recorrentes) | ✔ | ✔ | — | — | — |
| Moderar avaliações | ✔ | ✔ | — | — | — |
| Auditoria | ✔ | ✔ | — | — | — |
| Equipe (dar/remover papéis) | ✔ | — | — | — | — |
| Anonimizar pedidos por telefone (LGPD) | ✔ | — | — | — | — |

Observações:

- O atendente vê nome, telefone e endereço **dos pedidos**, pois precisa deles para atender; não acessa a lista de clientes nem relatórios.
- Nenhum papel do painel vê credenciais técnicas: chaves ficam somente nas variáveis de ambiente da Vercel.
- Não é possível remover o último administrador.
- O primeiro administrador só pode ser criado pela função `bootstrap_first_admin` no SQL Editor do Supabase.
