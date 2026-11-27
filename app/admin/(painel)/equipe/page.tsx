import { connection } from 'next/server';
import { requireStaff, ROLE_LABEL, type AppRole } from '@/lib/auth/session';
import { createSessionClient } from '@/lib/supabase/server';
import { Card, PageHeader, SelectField, TextField } from '@/components/admin/fields';
import { ActionForm } from '@/components/admin/action-form';
import { removeRole, setRole } from './actions';

export const metadata = { title: 'Equipe' };

export default async function TeamPage() {
  const ctx = await requireStaff(['admin']);
  await connection();
  const supabase = await createSessionClient();
  const { data } = await supabase.rpc('admin_list_staff');
  return (
    <div className="space-y-6">
      <PageHeader
        title="Equipe e permissões"
        description="A pessoa cria a própria conta em /conta (com senha própria). Depois, o administrador libera o acesso aqui."
      />
      <Card title="Permissões por papel">
        <ul className="grid gap-2 text-sm md:grid-cols-3">
          <li className="rounded-xl bg-mist p-3">
            <strong>Administrador</strong>: tudo, inclusive equipe e auditoria.
          </li>
          <li className="rounded-xl bg-mist p-3">
            <strong>Gerente</strong>: cardápio, preços, horários, entrega, banners, relatórios, clientes, configurações e pedidos. Não gerencia a equipe.
          </li>
          <li className="rounded-xl bg-mist p-3">
            <strong>Atendente</strong>: pedidos, taxa de entrega (antes do aceite), operação do dia e itens esgotados. Sem relatórios financeiros, clientes ou
            configurações.
          </li>
        </ul>
      </Card>
      <Card title="Membros">
        <ul className="divide-y divide-line">
          {((data ?? []) as { user_id: string; email: string; role: AppRole }[]).map((m) => (
            <li key={m.user_id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
              <span>
                <strong>{m.email}</strong> · {ROLE_LABEL[m.role]}
                {m.user_id === ctx.user.id ? <span className="text-muted"> (você)</span> : null}
              </span>
              <ActionForm
                action={removeRole.bind(null, m.user_id)}
                submitLabel="Remover acesso"
                size="sm"
                variant="ghost"
                inline
                confirm={`Remover o acesso de ${m.email}?`}
              />
            </li>
          ))}
        </ul>
      </Card>
      <Card title="Liberar ou alterar acesso">
        <ActionForm action={setRole} submitLabel="Salvar acesso" resetOnSuccess>
          <div className="grid gap-3 md:grid-cols-3">
            <TextField label="E-mail da conta" name="email" type="email" required />
            <SelectField label="Papel" name="role" defaultValue="attendant">
              <option value="attendant">Atendente</option>
              <option value="manager">Gerente</option>
              <option value="admin">Administrador</option>
            </SelectField>
          </div>
        </ActionForm>
      </Card>
    </div>
  );
}
