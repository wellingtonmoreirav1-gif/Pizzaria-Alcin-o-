import type { Metadata } from 'next';
import { ToastProvider } from '@/components/ui/toast';

export const metadata: Metadata = { title: { default: 'Painel', template: '%s · Painel Alcinão' }, robots: { index: false, follow: false } };

export default function AdminRootLayout({ children }: LayoutProps<'/admin'>) {
  return (
    <ToastProvider>
      <div className="min-h-screen bg-mist">{children}</div>
    </ToastProvider>
  );
}
