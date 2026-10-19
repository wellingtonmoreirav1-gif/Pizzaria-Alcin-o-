import { connection } from 'next/server';
import { requireStaff, PERMISSIONS, ROLE_LABEL, type AppRole } from '@/lib/auth/session';
import { createSessionClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/admin/fields';

export const metadata = { title: 'Auditoria' };

const TABLES: Record<string, string> = {
  products: 'Produto', product_variants: 'Tamanho', option_groups: 'Grupo de opções', option_values: 'Opção', option_value_variant_prices: 'Preço por tamanho',
  categories: 'Categoria', promotions: 'Promoção', business_settings: 'Configurações', business_hours: 'Horário', business_hour_exceptions: 'Exceção de horário',
  delivery_zones: 'Bairro', banners: 'Banner', user_roles: 'Permissão', reviews: 'Avaliação', combo_items: 'Item de combo', product_images: 'Imagem',
};

function diff(oldData: Record<string, unknown> | null, newData: Record<string, unknown> | null) {
  if (!oldData || !newData) return null;
  return Object.keys(newData)
    .filter((k) => k !== 'updated_at' && JSON.stringify(oldData[k]) !== JSON.stringify(newData[k]))
    .map((k) => `${k}: ${JSON.stringify(oldData[k])} → ${JSON.stringify(newData[k])}`)
    .slice(0, 6);
}

export default async function AuditPage() {
  await requireStaff([...PERMISSIONS.audit]);
  await connection();
  const supabase = await createSessionClient();
  const { data } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(200);
  return (
    <div>
      <PageHeader title="Auditoria" description="Últimas 200 alterações administrativas (catálogo, preços, horários, configurações, permissões). Mudanças de pedidos ficam no histórico de cada pedido." />
      <ul className="space-y-2">
        {(data ?? []).map((log) => {
          const changes = diff(log.old_data, log.new_data);
          const name = (log.new_data?.name ?? log.old_data?.name ?? log.new_data?.title ?? '') as string;
          return (
            <li key={log.id} className="rounded-xl border border-line bg-white p-3 text-sm">
              <p>
                <span className="text-muted">{new Date(log.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Fortaleza' })}</span> ·{' '}
                <strong>{log.action === 'insert' ? 'Criou' : log.action === 'update' ? 'Alterou' : 'Excluiu'}</strong> {TABLES[log.table_name] ?? log.table_name} {name ? `“${name}”` : ''}
                <span className="text-muted"> · {log.actor_role ? ROLE_LABEL[log.actor_role as AppRole] : 'sistema'}</span>
              </p>
              {changes?.length ? <p className="mt-1 break-all font-mono text-xs text-muted">{changes.join(' · ')}</p> : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
