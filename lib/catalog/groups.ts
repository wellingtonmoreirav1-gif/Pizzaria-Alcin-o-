/**
 * Grupos do cardápio com página própria (/pizzas, /lanches, /petiscos, /pratos, pedido passo a
 * passo) e um catálogo na página inicial. As categorias de cada grupo seguem a ordem do cardápio.
 */
export interface MenuGroup {
  key: 'pizzas' | 'lanches' | 'petiscos' | 'pratos';
  path: string;
  title: string;
  description: string;
  slugs: string[];
}

export const MENU_GROUPS: MenuGroup[] = [
  {
    key: 'pizzas',
    path: '/pizzas',
    title: 'Pizzas',
    description: 'Tradicionais, especiais, premium e doces. Escolha o tamanho e os sabores de cada pizza.',
    slugs: ['pizzas-tradicionais', 'pizzas-especiais', 'pizzas-premium', 'pizzas-doces'],
  },
  {
    key: 'lanches',
    path: '/lanches',
    title: 'Lanches',
    description: 'Lanches tradicionais, especiais e Beirute, feitos na chapa.',
    slugs: ['lanches-tradicionais', 'lanches-especiais', 'beirute'],
  },
  {
    key: 'petiscos',
    path: '/petiscos',
    title: 'Petiscos da casa',
    description: 'Para dividir com a turma.',
    slugs: ['petiscos'],
  },
  {
    key: 'pratos',
    path: '/pratos',
    title: 'Pratos',
    description: 'Pratos da casa e lasanhas.',
    slugs: ['pratos-da-casa', 'lasanhas'],
  },
];

export const menuGroup = (key: MenuGroup['key']) => MENU_GROUPS.find((g) => g.key === key)!;
export const groupOfCategory = (slug: string) => MENU_GROUPS.find((g) => g.slugs.includes(slug)) ?? null;
/**
 * Bebidas não aparecem no cardápio nem na página inicial: são oferecidas no carrinho
 * ("Vai uma bebida gelada?") e logo depois de adicionar um lanche ou uma pizza.
 */
export const DRINK_CATEGORY = 'bebidas';
export const HOME_HIDDEN_CATEGORIES = [DRINK_CATEGORY];
export const MENU_HIDDEN_CATEGORIES = [DRINK_CATEGORY];
