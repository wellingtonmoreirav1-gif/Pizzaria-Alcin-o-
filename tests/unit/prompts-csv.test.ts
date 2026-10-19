import { describe, expect, it } from 'vitest';
import { buildImageBrief, toCsv } from '@/lib/images/prompts';

describe('lista de produção de imagens', () => {
  it('usa apenas dados cadastrados e a direção de arte da categoria', () => {
    const b = buildImageBrief({ name: 'Pizza Calabresa', slug: 'pizza-calabresa', categorySlug: 'pizzas', description: 'calabresa, cebola e mussarela' });
    expect(b.fileName).toBe('pizza-calabresa.webp');
    expect(b.prompt).toContain('Pizza Calabresa (calabresa, cebola e mussarela)');
    expect(b.prompt).toContain('Show ONLY the ingredients described');
    expect(b.prompt).toContain('no watermark');
    expect(b.composition).toContain('pizza');
  });
});

describe('CSV', () => {
  it('escapa separadores e neutraliza fórmulas', () => {
    const csv = toCsv([{ nome: 'A;B', valor: '=HYPERLINK("x")', n: 3 }]);
    expect(csv.startsWith('﻿nome;valor;n')).toBe(true);
    expect(csv).toContain('"A;B"');
    expect(csv).toContain(`"'=HYPERLINK(""x"")"`);
  });
});
