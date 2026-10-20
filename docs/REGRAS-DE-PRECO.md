# Regras de preço

Implementadas em `lib/pricing/index.ts` (mesmo código no navegador e no servidor). O servidor sempre recalcula a partir do banco; nenhum valor enviado pelo navegador é aceito como verdade. Valores são somados em **centavos inteiros**.

## Produto simples (lanches, petiscos, pratos da casa, lasanhas, bebidas…)

- **Sem tamanhos:** preço = `Preço (R$)` do produto.
- **Com tamanhos/variantes:** o cliente escolhe um; preço = preço do tamanho.
- **Opções** (grupos “Escolhas” e “Adicionais”): cada opção soma seu preço (ou o preço específico daquele tamanho, se cadastrado). O grupo define mínimo e máximo de escolhas.

## Pizza

Cada **tamanho** define:

| Campo | Significado |
|---|---|
| Preço-base | preço da pizza inteira de um sabor “comum” naquele tamanho |
| Máx. de sabores | quantos sabores cabem (1 = inteira, 2 = meio a meio…) |
| Regra para 2+ sabores | **Preço do sabor mais caro**, **Média dos sabores** ou **Preço fixo do tamanho** |
| Permite misturar tipos | se desmarcado, não deixa misturar sabores com “tipo” diferente (ex.: doce + salgada) |

Cada **sabor** pode ter, por tamanho, um **preço específico** (ex.: sabor especial mais caro) e pode ser **não oferecido** em algum tamanho. Sem preço específico, vale o preço-base do tamanho.

Cálculo do preço da pizza:

- **Mais caro:** maior preço entre os sabores escolhidos.
- **Média:** soma ÷ quantidade, arredondada ao centavo (meio centavo para cima).
- **Fixo:** preço-base do tamanho, independentemente dos sabores.

Depois somam-se a **borda** (uma, opcional ou obrigatória conforme o grupo; preço por tamanho) e os **adicionais** (preço por tamanho, se cadastrado).

> Nenhuma regra é presumida: cada tamanho de cada pizza usa a regra escolhida no painel. Se o restaurante usar outra fórmula (ex.: preço específico para uma combinação), ela precisa ser definida antes de ser implementada.

Combinações inválidas são bloqueadas na tela e recusadas no servidor: sabor indisponível ou não oferecido no tamanho, sabores acima do limite, mistura de tipos proibida, mais de uma borda, grupo obrigatório sem escolha.

## Cardápio oficial: tamanhos, bordas e molhos

- **Código de tamanho** (`P`, `M`, `G`, `GG`, `F`) em cada tamanho (`product_variants.size_code`). As pizzas usam Pequena (P), Média (M), Grande (G), Gigante (GG) e Família (F); as lasanhas, Pequena (P), Média (M) e Grande (G). Nas pizzas do cardápio oficial cada tamanho tem **1 sabor** e **preço fixo**.
- **Grupos compartilhados** (`option_groups.shared_key`), cadastrados uma única vez em **Painel → Bordas e molhos** e ligados aos produtos (`product_shared_groups`):
  - **Borda recheada** (opcional, no máximo 1) — ligada às 20 pizzas. O valor depende do **código do tamanho** (`option_value_size_prices`):

    | Borda | P | M | G | GG | F |
    |---|---|---|---|---|---|
    | Requeijão | 4,00 | 6,00 | 8,00 | 8,00 | 10,00 |
    | Catupiry Original | 8,00 | 10,00 | 16,00 | 18,00 | 20,00 |
    | Cream Cheese | 8,00 | 10,00 | 16,00 | 18,00 | 20,00 |
    | Quatro Queijos | 8,00 | 10,00 | 16,00 | 18,00 | 20,00 |
    | Cheddar | 4,00 | 6,00 | 8,00 | 8,00 | 10,00 |

    Exemplo: Pizza Grande tradicional (50,00) + Catupiry (16,00) = **66,00** por pizza; 2 unidades = **132,00**.
  - **Molhos** (opcional, até 4) — ligados a lanches, Beirute e petiscos. **Grátis** (definido pelo restaurante). Uma opção sem valor definido fica visível, porém **não selecionável** (“Valor a definir pelo restaurante”) até o administrador informar o valor (0,00 = grátis).
- **Prioridade do valor de uma opção:** valor cadastrado para aquele tamanho específico do produto (`option_value_variant_prices`) → valor pelo código do tamanho (`option_value_size_prices`) → valor padrão da opção. Um tamanho **sem código** usa o valor padrão — por isso, ao criar uma pizza nova, preencha o “Código do tamanho”.

## Conferência de preços

- `products.price_confirmed` e `option_values.price_confirmed`. Quando falso, o item aparece com “Preço em conferência”/“Valor a definir” e o cálculo recusa o pedido (`PRICE_NOT_CONFIRMED`, `OPTION_PRICE_PENDING`), na tela **e no servidor**.
- Confirmação em **Painel → Conferência de preços** (é possível corrigir os valores e confirmar no mesmo passo), no editor do produto ou em Bordas e molhos. Somente gerente/administrador.
- Quem confirmou e quando (`price_confirmed_by`, `price_confirmed_at`) são preenchidos **pelo banco** (gatilho), não pelo navegador; toda alteração também vai para a Auditoria.
- Produtos novos criados pelo painel começam “em conferência”.
- Item **sem valor cadastrado** (ex.: bebidas novas) mostra “Preço a definir” — nunca “R$ 0,00” — e não entra nos dados do Google. Ao confirmar, valor zero é recusado; a confirmação em lote só vale para itens que já têm valor em todos os tamanhos.
- Reaplicar as migrations do cardápio **nunca desfaz** uma conferência nem troca um valor conferido pelo valor de referência.
- Definições do restaurante em 21/10/2026: pizzas especiais e premium confirmadas (30/45/55/65/80) e molhos grátis (`20261021000100_menu_confirmations_and_drinks.sql`).

## Combo

Preço = `Preço (R$)` do combo (definido pela equipe; não se presume desconto) + opções do combo, se houver. O combo fica indisponível se qualquer item incluído estiver esgotado ou inativo, e só vale dentro do período de validade, se informado.

## Promoções

- Uma promoção aponta para um produto (todos os tamanhos) ou para um tamanho específico, com preço promocional e período opcional.
- Só é aplicada se estiver ativa, dentro do período **e** se o preço promocional for **menor** que o preço normal. Assim o site nunca mostra “promoção” sem desconto real.
- Em pizzas, o preço promocional substitui o preço da pizza (sabores); borda e adicionais continuam sendo somados.
- O desconto por item é gravado no pedido (`unit_discount`) e aparece nos relatórios.

## Valores gravados no pedido

| Campo | Significado |
|---|---|
| `gross_subtotal` | itens a preço de tabela |
| `discount_total` | descontos de promoções |
| `items_subtotal` | itens após descontos |
| `delivery_fee` | taxa de entrega (vazia enquanto “a confirmar”) |
| `total` | `items_subtotal + delivery_fee` |
| `total_is_final` | verdadeiro para retirada/consumo no local, ou entrega com taxa confirmada |

Cada item guarda nome, tamanho, opções e preços **do momento da compra**, para o histórico continuar correto mesmo se o produto mudar.
