# Regras de preço

Implementadas em `lib/pricing/index.ts` (mesmo código no navegador e no servidor). O servidor sempre recalcula a partir do banco; nenhum valor enviado pelo navegador é aceito como verdade. Valores são somados em **centavos inteiros**.

## Produto simples (bebidas, almoço, churrasco, porções, sobremesas)

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
