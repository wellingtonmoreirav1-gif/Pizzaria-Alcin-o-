# Logo e imagens

## Logo oficial

O site **não cria uma logo**. Não há arquivo de logo no repositório; enquanto a logo oficial não é enviada, o cabeçalho mostra apenas o nome “Alcinão” em texto (fonte do site), sem símbolo inventado.

Para colocar a logo:

1. Prepare o arquivo em **PNG com fundo transparente** ou **WebP**, com pelo menos 400 px (até 5 MB). A logo redonda do Alcinão funciona bem; a proporção original é mantida.
2. Painel → **Fotos e logo** → *Logo oficial* → **Enviar** → **Salvar logo e foto principal** (também disponível em Configurações).
3. A logo passa a aparecer no cabeçalho, no rodapé, em destaque no topo da página inicial e nos dados estruturados do Google.

> **Fundo transparente:** o arquivo recebido tem fundo preto quadrado, que aparece como um quadrado sobre a arte do topo da página. Foi preparada uma versão com fundo transparente **do mesmo desenho** (só o preto fora do círculo foi removido). Ela foi entregue na conversa e **não está no repositório**, porque o envio é feito pela equipe no painel.

Para a imagem de compartilhamento (WhatsApp/redes), o arquivo `app/opengraph-image.tsx` gera uma arte só com texto; quando houver logo/foto oficial, pode-se trocar por um arquivo `app/opengraph-image.png` (1200×630).

## Capa (topo da página inicial)

- **Arte enviada pelo restaurante em 17/11/2026:** logo "Pizzaria Alcinão" (já com fundo transparente), personagem apontando para o logo e fundo preto texturizado.
- **Arquivos:** `public/hero/logo-alcinao.webp` (1200 px), `public/hero/personagem.webp` (recortado do fundo quadriculado que vinha desenhado na imagem) e `public/hero/fundo-preto.webp` (só o miolo da textura, sem o anel dourado da arte original).
- **Arrumação:** logo à esquerda e personagem à direita, apontando para ele; no celular ficam lado a lado, com os botões "Pedir agora" (desce até os catálogos) e "Falar no WhatsApp" embaixo.
- **Código:** `components/storefront/hero.tsx` e `hero-cover.tsx` (fundo e cabeçalho transparente por cima).
- **Cache:** os arquivos de `/hero` ficam guardados no aparelho por 7 dias (`next.config.ts`). Ao trocar uma imagem, use um nome de arquivo novo para todos verem na hora.
- A "foto principal" do painel não é usada na capa; uma frase própria em **Configurações → Chamada principal** aparece embaixo do logo.

## Fotos dos produtos

Nenhuma **foto** foi gerada ou inventada, e o site não chama serviços pagos de geração de imagens.

### Ilustrações provisórias do cardápio oficial

Cada um dos 46 produtos do cardápio oficial (40 + 6 bebidas) tem uma **ilustração vetorial provisória e única** (`public/images/products/<slug>.svg`), desenhada a partir dos ingredientes cadastrados (ex.: a pizza de calabresa mostra rodelas de calabresa; a de chocolate, massa escura com granulado). As bebidas usam embalagens genéricas, **sem marcas nem rótulos de fabricantes**. O site mostra sobre elas o aviso **“Imagem ilustrativa”** (o desenho não tem texto escrito) e o texto alternativo diz “Imagem ilustrativa provisória de … (foto oficial em breve)”. Elas não são fotos e não devem ser divulgadas como tal.

- São geradas por `node scripts/generate-menu-placeholders.mjs` (sem internet e sem custo; ~500 KB no total).
- **Para trocar pela foto real:** Painel → **Fotos e logo** — lista todos os produtos por categoria, com a situação de cada um (“Ilustração provisória”, “Foto enviada”, “Sem imagem”) e o filtro **Sem foto real**. Em cada produto: **Substituir** → escolha a foto → **Salvar foto**. O texto alternativo “imagem ilustrativa” é trocado automaticamente pelo nome do produto (ou pelo texto que você escrever). Também dá para trocar no editor do produto. Reaplicar as migrations **não** sobrescreve uma foto já enviada.
- Produto sem foto nem ilustração mostra uma arte neutra com “Foto em breve” — nunca a foto de outro produto.

### Destaque da semana (página inicial)

Logo depois do topo, uma faixa com a foto grande do lanche à direita e, à esquerda, "Destaque da semana: …" com o botão **Pedir agora** (abre o produto para pedir).
- Hoje: **X Frango Assado**, que abre o **X-Frango** do cardápio. Vídeo em loop (`public/destaques/x-frango-loop-v2.mp4` e `.webm`, 960×540, ≈1,1 MB, sem som, feito no Google Flow e enviado pelo restaurante em 26/10/2026; tocado para frente e para trás, para o loop não ter corte) com a imagem parada `x-frango-poster.webp` (1º quadro), que aparece na hora e fica no lugar do vídeo para quem pede menos movimento. O vídeo só baixa quando metade dele aparece na tela. Para trocar: mandar o vídeo novo (de preferência 16:9, fundo vermelho escuro).
- Para trocar o destaque: altere `WEEKLY_FEATURE` em `components/storefront/home-showcase.tsx` (nome, produto e foto) e coloque a nova foto em `public/destaques/`. Use foto horizontal com fundo escuro/vermelho, de preferência 1600 px de largura.

### Catálogos (página inicial)

- Logo depois do destaque da semana: Pizzas, Lanches, Petiscos da casa e Pratos, cada um com **só 2 produtos** (os marcados como destaque no painel vêm primeiro; depois, a ordem do cardápio) e o botão **"Ver tudo"**, que abre o catálogo inteiro (pedido passo a passo). Um atalho para cada catálogo fica no topo. Para mudar a quantidade: `HOME_PER_CATALOG` em `components/storefront/home-showcase.tsx`. Bebidas ficam no carrinho.
- As páginas /pizzas, /lanches, /petiscos e /pratos (pedido passo a passo) continuam no menu do topo.

### Nossa história (página inicial)

Logo abaixo dos blocos "Pedir …": linha do tempo que desce com a rolagem — "No início, a Alcinão era um restaurante de sucesso." → "Até que uma tragédia aconteceu…" com o vídeo "Das cinzas à inauguração" (capa por cima) → carrossel 3D com 3 vídeos → botão para o Instagram @pizzariaalcinao.
- Vídeos do Instagram do restaurante, comprimidos para 540×960 (≈13 MB no total) em `public/historia/` (`video-1.mp4` a `video-4.mp4`), com capa `capa-das-cinzas.webp` e quadros de prévia `video-2..4.webp`. Só baixam quando a pessoa dá play.
- Para recomprimir um vídeo novo: `ffmpeg -i entrada.mp4 -vf scale=540:960 -c:v libx264 -preset slow -crf 28 -pix_fmt yuv420p -c:a aac -b:a 96k -movflags +faststart public/historia/video-N.mp4`.
- Código: `components/storefront/story-timeline.tsx`.

### Fotos das categorias

- Desde 17/11/2026 a página inicial mostra os produtos direto, sem faixas de categoria; as fotos de **Painel → Fotos e logo → Fotos das categorias** ficam guardadas, mas não aparecem lá.

### Direção de arte (todo o cardápio)

- Fotografia gastronômica profissional e realista; ingredientes nítidos; queijo derretido natural; massa e borda realistas.
- Fundo escuro (pedra/carvão fosco) com toques discretos de vermelho e dourado, coerente com a identidade do site (fundo preto, cinza, dourado nos preços, vermelho nas ações).
- **Cores do site (18/11/2026):** a loja é **branca** (tokens claros em `app/globals.css`). Faixas escuras usam a classe `.on-dark`, que troca os tokens para a versão escura: capa, destaque da semana (vinho), faixa de ofertas, títulos das páginas de Pizzas/Cardápio, história, "Bom saber", chamada do WhatsApp e rodapé; o cabeçalho fica escuro sozinho enquanto está sobre a capa. Vermelho cheio só nas ações principais; botão "Escolher" dos cartões com contorno vermelho.
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
