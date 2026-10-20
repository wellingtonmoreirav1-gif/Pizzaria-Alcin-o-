import type { Metadata, Viewport } from 'next';
import { DM_Sans, Fraunces } from 'next/font/google';
import { SITE_URL } from '@/config/business';
import { getOperation } from '@/lib/catalog/queries';
import './globals.css';

const fraunces = Fraunces({ variable: '--font-fraunces', subsets: ['latin'], axes: ['SOFT', 'opsz'], style: ['normal', 'italic'] });
const dmSans = DM_Sans({ variable: '--font-dm-sans', subsets: ['latin'] });

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

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="pt-BR" className={`${fraunces.variable} ${dmSans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
