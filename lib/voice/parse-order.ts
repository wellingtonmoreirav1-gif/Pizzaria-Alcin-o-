import type { CatalogProduct, CatalogVariant } from '@/types/catalog';

/**
 * Lê um pedido falado (já transcrito) e encontra os produtos do cardápio, com quantidade
 * e tamanho. Ex.: "quero uma pizza grande de calabresa e duas coca lata".
 * Não inventa nada: o que não reconhecer volta em `unmatched` para o cliente ver.
 */
export interface VoiceItem {
  productId: string;
  /** Tamanho escolhido; null quando o produto tem um só (ou quando falta escolher). */
  variantId: string | null;
  quantity: number;
  /** O produto tem vários tamanhos e o cliente não disse qual. */
  needsSize: boolean;
}

export interface VoiceParse {
  items: VoiceItem[];
  /** Trechos que não viraram produto (ex.: "refrigerante", sem dizer qual). */
  unmatched: string[];
}

const NUMBERS: Record<string, number> = {
  um: 1, uma: 1, dois: 2, duas: 2, tres: 3, quatro: 4, cinco: 5, seis: 6, sete: 7, oito: 8, nove: 9, dez: 10,
};
/** Palavras ignoradas na comparação (artigos, preposições, pedidos de cortesia). */
const STOP = new Set(['de', 'da', 'do', 'das', 'dos', 'com', 'e', 'a', 'o', 'as', 'os', 'no', 'na', 'em', 'pra', 'para', 'por']);
const FILLER = new Set([
  'quero', 'queria', 'gostaria', 'eu', 'me', 'manda', 'mande', 'traz', 'traga', 'favor', 'tambem', 'mais', 'pizza', 'pizzas', 'lanche', 'lanches',
  'tamanho', 'ai', 'ok', 'entao', 'bom', 'boa', 'noite', 'tarde', 'dia', 'ola', 'oi', 'pedido', 'meu', 'minha', 'vou', 'querer', 'pode', 'ser', 'so', 'isso', 'obrigado', 'obrigada',
]);
/** Grafias comuns que o reconhecimento de voz devolve. */
const ALIASES: [RegExp, string][] = [
  [/\b(mussarela|muzarela|muzzarela|mozarela|mozzarela)\b/g, 'mucarela'],
  [/\bxis\b/g, 'x'],
  [/\bcoca cola\b/g, 'coca'],
  [/\b4 queijos\b/g, 'quatro queijos'],
  [/\bh2o\b/g, 'h2oh'],
];
/** Tamanhos de pizza e lasanha (pelo código) ditos por extenso. */
const SIZE_WORDS: Record<string, string> = { pequena: 'P', pequeno: 'P', broto: 'P', media: 'M', medio: 'M', grande: 'G', gigante: 'GG', familia: 'F' };

export function normalizeSpeech(text: string): string {
  let s = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  for (const [re, to] of ALIASES) s = s.replace(re, to);
  return s;
}

const tokensOf = (s: string) => normalizeSpeech(s).split(' ').filter((t) => t && !STOP.has(t));

/** Chaves de busca de um produto: o nome, sem "pizza" na frente, e a 1ª palavra quando for única. */
function keysFor(p: CatalogProduct, firstWordCount: Map<string, number>): string[][] {
  const full = tokensOf(p.name);
  const keys = [full];
  if (full[0] === 'pizza' && full.length > 1) keys.push(full.slice(1));
  const first = full[0] ?? '';
  if (full.length > 1 && first !== 'pizza' && first !== 'x' && first.length >= 4 && firstWordCount.get(first) === 1) keys.push([first]);
  // "H2OH! 500 ml", "Água mineral 500 ml": também sem a medida.
  const noMeasure = full.filter((t) => !/^\d+$/.test(t) && t !== 'ml' && t !== 'litro' && t !== 'litros');
  if (noMeasure.length && noMeasure.length !== full.length) keys.push(noMeasure);
  return keys;
}

/** Tamanho dito na frase que existe neste produto (código P/M/G… ou nome da variante, ex.: "lata"). */
function sizeIn(words: string[], variants: CatalogVariant[]): CatalogVariant | null {
  const text = ` ${words.join(' ')} `;
  // Variantes sem código (bebidas): "lata", "600 ml", "1 litro", "2 litros".
  for (const v of [...variants].sort((a, b) => b.name.length - a.name.length)) {
    if (v.sizeCode) continue;
    const name = normalizeSpeech(v.name).replace(/\bml\b/g, '').trim();
    const spoken = name.replace(/^1 /, '(?:1|um) ').replace(/^2 /, '(?:2|dois) ').replace(/^600$/, '(?:600|seiscentos)');
    if (new RegExp(`\\s${spoken}s?\\s`).test(text)) return v;
  }
  for (let i = 0; i < words.length; i++) {
    const w = words[i]!;
    const code = SIZE_WORDS[w] ?? (words[i - 1] === 'tamanho' ? w.toUpperCase() : null);
    if (!code) continue;
    const v = variants.find((x) => x.sizeCode === code);
    if (v) return v;
  }
  return null;
}

export function parseVoiceOrder(text: string, products: CatalogProduct[]): VoiceParse {
  const firstWordCount = new Map<string, number>();
  for (const p of products) {
    const w = tokensOf(p.name)[0];
    if (w) firstWordCount.set(w, (firstWordCount.get(w) ?? 0) + 1);
  }
  const index: { tokens: string[]; product: CatalogProduct }[] = [];
  for (const p of products) for (const k of keysFor(p, firstWordCount)) index.push({ tokens: k, product: p });
  index.sort((a, b) => b.tokens.length - a.tokens.length);
  const vocab = new Set(index.flatMap((e) => e.tokens));

  // Tokens da fala (com "tamanho"/números para o contexto); plurais viram singular ("cocas" → "coca").
  const raw = normalizeSpeech(text).split(' ').filter(Boolean);
  const words = raw.map((t) => (!vocab.has(t) && t.endsWith('s') && vocab.has(t.slice(0, -1)) ? t.slice(0, -1) : t));
  const content = words.map((w, i) => ({ w, i })).filter(({ w }) => !STOP.has(w));

  const matches: { product: CatalogProduct; start: number; end: number }[] = [];
  for (let c = 0; c < content.length; ) {
    let found: { product: CatalogProduct; len: number } | null = null;
    for (const e of index) {
      if (e.tokens.length > content.length - c) continue;
      if (e.tokens.every((t, k) => content[c + k]!.w === t)) {
        // "x frango" (lanche) vs "frango" (pizza): a chave mais longa já venceu pela ordem.
        found = { product: e.product, len: e.tokens.length };
        break;
      }
    }
    if (found) {
      matches.push({ product: found.product, start: content[c]!.i, end: content[c + found.len - 1]!.i + 1 });
      c += found.len;
    } else c += 1;
  }

  const items: VoiceItem[] = [];
  const used = new Set<number>();
  matches.forEach((m, k) => {
    for (let i = m.start; i < m.end; i++) used.add(i);
    const from = k > 0 ? matches[k - 1]!.end : 0;
    const to = k < matches.length - 1 ? matches[k + 1]!.start : words.length;
    const before = words.slice(from, m.start);
    const after = words.slice(m.end, to);
    // Quantidade: o número mais perto, antes do produto.
    let quantity = 1;
    for (let i = before.length - 1; i >= 0; i--) {
      const w = before[i]!;
      const n = NUMBERS[w] ?? (/^\d+$/.test(w) && Number(w) < 100 ? Number(w) : null);
      // "dois litros", "600 ml": é tamanho, não quantidade.
      if (n && ['litro', 'litros', 'ml'].includes(before[i + 1] ?? '')) continue;
      if (n) {
        quantity = n;
        used.add(from + i);
        break;
      }
    }
    const variants = m.product.variants;
    // Tamanho: primeiro o que vem depois do produto; antes, só a partir da quantidade
    // ("uma grande de calabresa") — o que vem antes dela é do item anterior.
    let lastNumber = -1;
    before.forEach((w, i) => {
      if (w in NUMBERS || /^\d+$/.test(w)) lastNumber = i;
    });
    const size = variants.length > 1 ? (sizeIn(after, variants) ?? sizeIn(before.slice(Math.max(0, lastNumber)), variants)) : null;
    if (size) {
      // Marca as palavras do tamanho como entendidas.
      const sizeWords = new Set([...normalizeSpeech(size.name).split(' '), ...Object.keys(SIZE_WORDS).filter((w) => SIZE_WORDS[w] === size.sizeCode), 'tamanho', 'litros', 'litro', 'ml', 'um', 'dois', 'seiscentos']);
      for (let i = from; i < to; i++) if (sizeWords.has(words[i]!)) used.add(i);
    }
    const variantId = variants.length === 1 ? variants[0]!.id : (size?.id ?? null);
    const same = items.find((x) => x.productId === m.product.id && x.variantId === variantId);
    if (same) same.quantity += quantity;
    else items.push({ productId: m.product.id, variantId, quantity, needsSize: variants.length > 1 && !size });
  });

  // O que sobrou e não é número, tamanho nem palavra de ligação: mostra como "não entendi".
  const unmatched: string[] = [];
  let chunk: string[] = [];
  const flush = () => {
    if (chunk.length) unmatched.push(chunk.join(' '));
    chunk = [];
  };
  words.forEach((w, i) => {
    const ignorable = used.has(i) || STOP.has(w) || FILLER.has(w) || w in NUMBERS || /^\d+$/.test(w) || w in SIZE_WORDS || ['lata', 'litro', 'litros', 'ml', 'seiscentos'].includes(w);
    if (ignorable) flush();
    else chunk.push(w);
  });
  flush();

  return { items, unmatched };
}
