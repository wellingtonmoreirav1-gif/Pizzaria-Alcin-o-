/**
 * Grupos do cardápio com página própria (/pizzas, /lanches, /petiscos, /pratos) e um bloco
 * "Pedir …" na página inicial, com foto à direita. Cada página mostra as categorias do grupo
 * separadas, na ordem do cardápio.
 */
export interface MenuGroup {
  key: 'pizzas' | 'lanches' | 'petiscos' | 'pratos';
  path: string;
  title: string;
  description: string;
  /** Texto do bloco da página inicial (é o próprio botão). */
  cta: string;
  /** Linha curta embaixo do botão. */
  line: string;
  image: string;
  imageAlt: string;
  slugs: string[];
}

export const MENU_GROUPS: MenuGroup[] = [
  {
    key: 'pizzas',
    path: '/pizzas',
    title: 'Pizzas',
    description: 'Tradicionais, especiais, premium e doces. Escolha o tamanho e os sabores de cada pizza.',
    cta: 'Pedir pizzas',
    line: 'Tradicionais · Especiais · Premium · Doces',
    image: '/destaques/pizza-pepperoni.webp',
    imageAlt: 'Pizza de pepperoni com queijo puxando ao tirar uma fatia',
    slugs: ['pizzas-tradicionais', 'pizzas-especiais', 'pizzas-premium', 'pizzas-doces'],
  },
  {
    key: 'lanches',
    path: '/lanches',
    title: 'Lanches',
    description: 'Lanches tradicionais, especiais e Beirute, feitos na chapa.',
    cta: 'Pedir lanches',
    line: 'Tradicionais · Especiais · Beirute',
    image: '/destaques/lanches.webp',
    imageAlt: 'Hambúrguer com bacon, queijo derretido, alface, tomate e cebola roxa',
    slugs: ['lanches-tradicionais', 'lanches-especiais', 'beirute'],
  },
  {
    key: 'petiscos',
    path: '/petiscos',
    title: 'Petiscos da casa',
    description: 'Para dividir com a turma.',
    cta: 'Pedir petiscos da casa',
    line: 'Batata frita, isca de frango e calabresa',
    image: '/destaques/petiscos.webp',
    imageAlt: 'Tábua com batata frita, iscas de frango empanadas, queijo derretido e bacon',
    slugs: ['petiscos'],
  },
  {
    key: 'pratos',
    path: '/pratos',
    title: 'Pratos',
    description: 'Pratos da casa e lasanhas.',
    cta: 'Pedir pratos',
    line: 'Pratos da casa · Lasanhas',
    image: '/destaques/pratos.webp',
    imageAlt: 'Prato com bife acebolado, arroz, feijão, batata frita e salada',
    slugs: ['pratos-da-casa', 'lasanhas'],
  },
];

export const menuGroup = (key: MenuGroup['key']) => MENU_GROUPS.find((g) => g.key === key)!;
export const groupOfCategory = (slug: string) => MENU_GROUPS.find((g) => g.slugs.includes(slug)) ?? null;
/** Categoria que não entra nos blocos da página inicial (o restaurante decide depois o que fazer com ela). */
export const HOME_HIDDEN_CATEGORIES = ['bebidas'];
