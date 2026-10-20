/** Códigos de tamanho usados no cardápio (pizzas e lasanhas) e nos valores das bordas. */
export const SIZE_CODES = ['P', 'M', 'G', 'GG', 'F'] as const;

export const SIZE_LABEL: Record<string, string> = {
  P: 'Pequena (P)',
  M: 'Média (M)',
  G: 'Grande (G)',
  GG: 'Gigante (GG)',
  F: 'Família (F)',
};

export const SIZE_CODE_PATTERN = /^[A-Z]{1,3}$/;
