# Logo e imagens

## Logo oficial

O site **não cria uma logo**. Não há arquivo de logo no repositório; enquanto a logo oficial não é enviada, o cabeçalho mostra apenas o nome “Alcinão” em texto (fonte do site), sem símbolo inventado.

Para colocar a logo:

1. Prepare o arquivo em **PNG com fundo transparente** ou **WebP**, com pelo menos 400 px (até 5 MB). A logo redonda do Alcinão funciona bem; a proporção original é mantida.
2. Painel → **Fotos e logo** → *Logo oficial* → **Enviar** → **Salvar logo e foto principal** (também disponível em Configurações).
3. A logo passa a aparecer no cabeçalho, no rodapé, em destaque no topo da página inicial e nos dados estruturados do Google.

> **Fundo transparente:** o arquivo recebido tem fundo preto quadrado, que aparece como um quadrado sobre a arte do topo da página. Foi preparada uma versão com fundo transparente **do mesmo desenho** (só o preto fora do círculo foi removido). Ela foi entregue na conversa e **não está no repositório**, porque o envio é feito pela equipe no painel.

Para a imagem de compartilhamento (WhatsApp/redes), o arquivo `app/opengraph-image.tsx` gera uma arte só com texto; quando houver logo/foto oficial, pode-se trocar por um arquivo `app/opengraph-image.png` (1200×630).

## Fotos dos produtos

Nenhuma **foto** foi gerada ou inventada, e o site não chama serviços pagos de geração de imagens.

### Ilustrações provisórias do cardápio oficial

Cada um dos 46 produtos do cardápio oficial (40 + 6 bebidas) tem uma **ilustração vetorial provisória e única** (`public/images/products/<slug>.svg`), desenhada a partir dos ingredientes cadastrados (ex.: a pizza de calabresa mostra rodelas de calabresa; a de chocolate, massa escura com granulado). As bebidas usam embalagens genéricas, **sem marcas nem rótulos de fabricantes**. Todas trazem a legenda **“IMAGEM ILUSTRATIVA · FOTO OFICIAL EM BREVE”** e o texto alternativo diz “Imagem ilustrativa provisória de … (foto oficial em breve)”. Elas não são fotos e não devem ser divulgadas como tal.

- São geradas por `node scripts/generate-menu-placeholders.mjs` (sem internet e sem custo; ~500 KB no total).
- **Para trocar pela foto real:** Painel → **Fotos e logo** — lista todos os produtos por categoria, com a situação de cada um (“Ilustração provisória”, “Foto enviada”, “Sem imagem”) e o filtro **Sem foto real**. Em cada produto: **Substituir** → escolha a foto → **Salvar foto**. O texto alternativo “imagem ilustrativa” é trocado automaticamente pelo nome do produto (ou pelo texto que você escrever). Também dá para trocar no editor do produto. Reaplicar as migrations **não** sobrescreve uma foto já enviada.
- Produto sem foto nem ilustração mostra uma arte neutra com “Foto em breve” — nunca a foto de outro produto.

### Direção de arte (todo o cardápio)

- Fotografia gastronômica profissional e realista; ingredientes nítidos; queijo derretido natural; massa e borda realistas.
- Fundo escuro (pedra/carvão fosco) com toques discretos de vermelho e dourado, coerente com a identidade do site (fundo preto, cinza, dourado nos preços, vermelho nas ações).
- Luz quente lateral (pizzas, churrasco) ou luz natural suave (almoço, sobremesas).
- Proporção **4:3** (1600×1200 px), produto ocupando o quadro.
- Sem marca d’água, sem texto, sem mãos/pessoas, sem ingredientes que o produto não tem.

### Lista de produção de imagens

Depois de cadastrar o cardápio, baixe em **Painel → Cardápio → Lista de fotos (CSV)**. Para cada produto (e cada sabor de pizza) a planilha traz: nome, descrição visual, composição, enquadramento, iluminação, fundo, proporção, **prompt** pronto e nome de arquivo sugerido. O mesmo briefing aparece na página de edição de cada produto.

Os prompts usam somente nome, descrição e ingredientes cadastrados; por isso, **descreva bem os ingredientes** no cadastro antes de gerar as fotos.

### Como produzir e enviar

1. Opção A — fotógrafo: use a lista como roteiro da sessão (mais fiel ao produto real).
2. Opção B — ferramenta de geração de imagens (ex.: geradores com licença de uso comercial): cole o prompt, gere algumas variações e **escolha só imagens fiéis ao produto real**, sem deformações.
3. Envie pelo painel: **Cardápio → produto → Foto principal → Enviar → Salvar produto**. O painel reduz a foto para no máximo 1600 px em WebP e guarda no Supabase Storage (bucket `catalog`, pasta `products/`).
4. Preencha o **texto alternativo** (ex.: “Pizza de calabresa com cebola em rodelas”).
5. Antes de publicar, revise todas as fotos contra os produtos reais (checklist em [PENDENCIAS.md](PENDENCIAS.md)).

Também é possível colocar arquivos em `public/images/products/` e usar o caminho `/images/products/arquivo.webp`, mas isso exige novo deploy; o envio pelo painel é o recomendado.
