import type { MetadataRoute } from 'next';

/** Nome e ícone quando o cliente salva o site na tela inicial do celular. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Pizzaria e Churrascaria Alcinão',
    short_name: 'Alcinão',
    description: 'Peça pizzas, lanches, petiscos e pratos da casa em São Bento (PB).',
    start_url: '/',
    display: 'standalone',
    background_color: '#0f0b0b',
    theme_color: '#0f0b0b',
    lang: 'pt-BR',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  };
}
