import type { Metadata } from 'next';
import { NewPasswordForm } from '@/components/account/new-password-form';

export const metadata: Metadata = { title: 'Nova senha', robots: { index: false } };

export default function NewPasswordPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <NewPasswordForm />
    </div>
  );
}
