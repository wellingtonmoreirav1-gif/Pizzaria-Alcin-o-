import type { NextConfig } from 'next';

const supabaseHost = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').hostname;
  } catch {
    return null;
  }
})();

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  turbopack: {
    rules: {
      '*.css': {
        loaders: ['@tailwindcss/turbopack'],
        as: '*.css',
      },
    },
  },
  images: {
    remotePatterns: supabaseHost
      ? [
          { protocol: 'https', hostname: supabaseHost, pathname: '/storage/v1/object/public/**' },
          { protocol: 'http', hostname: supabaseHost, pathname: '/storage/v1/object/public/**' },
        ]
      : [],
    formats: ['image/avif', 'image/webp'],
  },
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      // Quadros da animação do topo: guardados no aparelho por uma semana (trocar o vídeo
      // = arquivos novos; quem já tem os antigos recebe os novos em até 7 dias, ou na hora
      // se os nomes mudarem).
      { source: '/hero/:path*', headers: [{ key: 'Cache-Control', value: 'public, max-age=604800, stale-while-revalidate=86400' }] },
      { source: '/destaques/:path*', headers: [{ key: 'Cache-Control', value: 'public, max-age=604800, stale-while-revalidate=86400' }] },
    ];
  },
};

export default nextConfig;
