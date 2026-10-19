/**
 * Direção de arte e prompts de fotografia gastronômica por produto.
 * Gera a "lista de produção de imagens" a partir do cardápio cadastrado — nunca
 * inventa ingredientes: usa somente nome, descrição e opções informadas.
 */
export interface PromptInput {
  name: string;
  slug: string;
  categorySlug: string;
  description: string | null;
  flavors?: string[];
}

export interface ImageBrief {
  product: string;
  visual: string;
  composition: string;
  framing: string;
  lighting: string;
  background: string;
  aspectRatio: string;
  prompt: string;
  fileName: string;
}

const STYLE =
  'professional food photography, realistic, appetizing, natural textures, sharp focus on the food, no text, no watermark, no logos, no people, no hands, no AI artifacts, no deformed food';
const BACKGROUND = 'dark charcoal stone surface with subtle warm red accents, matte black backdrop';

const BY_CATEGORY: Record<string, { composition: string; framing: string; lighting: string }> = {
  pizzas: {
    composition: 'whole pizza on a dark wooden peel or round board, one slice slightly pulled with naturally melted cheese strands',
    framing: '45-degree angle, pizza filling most of the frame',
    lighting: 'warm side light simulating a wood-fired oven glow, soft fill',
  },
  almoco: {
    composition: 'single generous plate, components clearly separated and identifiable',
    framing: 'top-down (90 degrees) or 30-degree angle',
    lighting: 'soft natural daylight from a window, gentle shadows',
  },
  churrasco: {
    composition: 'grilled meat on a board or skewer with visible grill marks and juicy texture',
    framing: '30-degree close-up',
    lighting: 'warm low-key light with subtle smoke in the background',
  },
  combos: {
    composition: 'all included items arranged together, each one clearly visible',
    framing: '45-degree angle, wide enough to show every item',
    lighting: 'warm studio light',
  },
  bebidas: {
    composition: 'drink with condensation droplets, ice only if the drink is served with ice',
    framing: 'eye-level, slight low angle',
    lighting: 'backlight to make the liquid glow, soft fill',
  },
  porcoes: {
    composition: 'portion served in a bowl or board, golden and crispy textures visible',
    framing: '45-degree angle',
    lighting: 'warm studio light',
  },
  sobremesas: {
    composition: 'single dessert portion on a small plate, texture in focus',
    framing: '30-degree close-up, shallow depth of field',
    lighting: 'soft diffused light',
  },
};

export function buildImageBrief(input: PromptInput): ImageBrief {
  const style = BY_CATEGORY[input.categorySlug] ?? BY_CATEGORY.combos!;
  const details = [input.description, input.flavors?.length ? `toppings: ${input.flavors.join(', ')}` : null].filter(Boolean).join('; ');
  const visual = `${input.name}${details ? ` — ${details}` : ''}`;
  const prompt = [
    `${input.name}${details ? ` (${details})` : ''}.`,
    `Show ONLY the ingredients described, nothing extra.`,
    `${style.composition}. ${style.framing}. ${style.lighting}. Background: ${BACKGROUND}.`,
    `${STYLE}. Aspect ratio 4:3.`,
  ].join(' ');
  return {
    product: input.name,
    visual,
    composition: style.composition,
    framing: style.framing,
    lighting: style.lighting,
    background: BACKGROUND,
    aspectRatio: '4:3 (1600x1200 px)',
    prompt,
    fileName: `${input.slug}.webp`,
  };
}

export function toCsv(rows: Record<string, string | number | null>[]): string {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0] ?? {});
  const escape = (v: string | number | null) => {
    let s = v === null || v === undefined ? '' : String(v);
    // Evita fórmulas maliciosas ao abrir no Excel/Sheets.
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return /[",;\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return '﻿' + [headers.join(';'), ...rows.map((r) => headers.map((h) => escape(r[h] ?? null)).join(';'))].join('\r\n');
}
