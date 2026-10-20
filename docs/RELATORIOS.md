# Definição dos indicadores

Todos os números vêm do banco (funções `report_*` e `dashboard_today` em `supabase/migrations/20261019001000_reports.sql`), no fuso America/Fortaleza. Acesso: administrador e gerente (o atendente vê apenas contagens do dia).

| Indicador | Definição |
|---|---|
| **Pedidos registrados** | pedidos criados no período, exceto cancelados (inclui os em aberto) |
| **Valor registrado** | soma do total desses pedidos (pode incluir taxa ainda não confirmada = 0) |
| **Vendas concluídas** | pedidos com status *Concluído* |
| **Faturamento** | soma do total dos pedidos concluídos (itens após descontos + taxas de entrega) |
| **Itens a preço de tabela** | soma dos itens sem desconto, só concluídos |
| **Descontos** | soma dos descontos de promoções, só concluídos |
| **Taxas de entrega** | soma das taxas dos concluídos |
| **Ticket médio** | faturamento ÷ número de vendas concluídas |
| **Cancelados** | quantidade e valor dos pedidos cancelados (nunca entram em vendas) |
| **Produtos mais vendidos** | quantidade vendida em pedidos concluídos |
| **Categorias** | valor e quantidade de itens em pedidos concluídos |
| **Produtos sem vendas** | ativos no cardápio sem venda concluída no período |
| **Vendidos juntos** | pares de produtos presentes no mesmo pedido concluído (mínimo de 3 pedidos) |
| **Clientes recorrentes** | telefones com 2+ pedidos concluídos no período |
| **Modalidade / pagamento** | concluídos por modalidade e pela forma de pagamento **escolhida** pelo cliente |
| **Mais vendidos (site)** | ranking público só aparece com volume mínimo configurável (padrão 10 pedidos concluídos em 30 dias); abaixo disso, só os destaques escolhidos pela equipe |

**Faturamento não é lucro.** O sistema não conhece custos de insumos, mão de obra ou taxas de maquininha.

Exportação CSV (separador `;`, compatível com Excel em português): vendas por período, produtos, categorias, cancelamentos e clientes recorrentes (este último contém telefones; trate como dado pessoal).
