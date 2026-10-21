import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import { Inter, Playfair_Display } from 'next/font/google';
import { SITE_URL } from '@/config/business';
import { getOperation } from '@/lib/catalog/queries';
import './globals.css';

// Títulos em Playfair Display (com itálico para destaques) e textos em Inter.
const playfair = Playfair_Display({ variable: '--font-playfair', subsets: ['latin'], style: ['normal', 'italic'] });
const inter = Inter({ variable: '--font-inter', subsets: ['latin'] });

export async function generateMetadata(): Promise<Metadata> {
  const { data } = await getOperation();
  const s = data.settings;
  const title = s.seoTitle ?? `${s.businessName} — Pizzas, lanches e pratos da casa em São Bento (PB)`;
  const description =
    s.seoDescription ??
    `Peça online na ${s.businessName}: pizzas, lanches, Beirute, petiscos, pratos da casa e lasanhas em São Bento, Paraíba. Monte seu pedido e envie pelo WhatsApp.`;
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: title, template: `%s | ${s.businessName.replace('Pizzaria e Churrascaria ', '')}` },
    description,
    applicationName: s.businessName,
    openGraph: { type: 'website', locale: 'pt_BR', siteName: s.businessName, title, description, url: SITE_URL },
    twitter: { card: 'summary_large_image', title, description },
    alternates: { canonical: '/' },
    formatDetection: { telephone: false },
  };
}

export const viewport: Viewport = {
  themeColor: '#0c0a09',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

/**
 * Altura real da tela, medida no navegador. Alguns navegadores embutidos em apps calculam
 * errado as unidades dvh/svh/vh do CSS e até window.innerHeight (tela "minúscula"). Por
 * isso a altura vem de um elemento fixo de cima a baixo (a área onde ficam as janelas),
 * e vale a maior das medidas (o elemento é posto e tirado na hora, sem afetar a página).
 * --app-h-stable: só muda com mudança grande (ex.: girar a tela), para o topo não pular
 * quando a barra do navegador some ao rolar; --app-bottom-gap: barra do app por cima
 * da página, quando o navegador informa.
 */
const VIEWPORT_SCRIPT = `(function(){var d=document.documentElement,s=0,w=0,p=document.createElement('div');p.style.cssText='position:fixed;top:0;bottom:0;left:0;width:0;visibility:hidden;pointer-events:none';function probe(){d.appendChild(p);var r=p.getBoundingClientRect().height;d.removeChild(p);return r}function f(){var v=window.visualViewport,ih=window.innerHeight,h=Math.max(ih,probe(),v?v.height:0),gap=v&&v.height<ih?Math.max(0,ih-v.height-v.offsetTop):0;if(!h)return;d.style.setProperty('--app-h',h+'px');d.style.setProperty('--app-bottom-gap',Math.round(gap)+'px');if(!s||window.innerWidth!==w||Math.abs(h-s)>150){s=h;w=window.innerWidth;d.style.setProperty('--app-h-stable',h+'px')}}f();addEventListener('resize',f);addEventListener('pageshow',f);addEventListener('load',f);if(window.visualViewport)visualViewport.addEventListener('resize',f)})()`;

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    // suppressHydrationWarning: o script abaixo grava as alturas no style do <html> antes do React.
    <html lang="pt-BR" className={`${playfair.variable} ${inter.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="flex min-h-full flex-col">
        <Script id="altura-da-tela" strategy="beforeInteractive">
          {VIEWPORT_SCRIPT}
        </Script>
        {children}
      </body>
    </html>
  );
}
