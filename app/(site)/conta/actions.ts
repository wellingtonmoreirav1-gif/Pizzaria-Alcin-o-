'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createSessionClient } from '@/lib/supabase/server';
import { getSessionUser } from '@/lib/auth/session';
import { addressSchema, phoneSchema } from '@/lib/validation/checkout';

export type ActionResult = { ok: boolean; message: string };

const profileSchema = z.object({
  fullName: z.string().trim().min(2, 'Informe seu nome.').max(120),
  phone: z.union([z.literal(''), phoneSchema]),
});

export async function updateProfile(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, message: 'Entre na sua conta.' };
  const parsed = profileSchema.safeParse({ fullName: form.get('fullName'), phone: form.get('phone') ?? '' });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };
  const supabase = await createSessionClient();
  const { error } = await supabase
    .from('profiles')
    .update({ full_name: parsed.data.fullName, phone: parsed.data.phone || null })
    .eq('id', user.id);
  if (error) return { ok: false, message: 'Não foi possível salvar.' };
  revalidatePath('/conta');
  return { ok: true, message: 'Dados atualizados.' };
}

export async function addAddress(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, message: 'Entre na sua conta.' };
  const parsed = addressSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? 'Endereço inválido.' };
  const a = parsed.data;
  const supabase = await createSessionClient();
  const { error } = await supabase.from('customer_addresses').insert({
    user_id: user.id,
    label: (form.get('label') as string | null)?.trim().slice(0, 40) || null,
    street: a.street,
    number: a.number,
    neighborhood: a.neighborhood,
    complement: a.complement,
    reference: a.reference,
    city: a.city,
    state: a.state,
    postal_code: a.postalCode,
  });
  if (error) return { ok: false, message: 'Não foi possível salvar o endereço.' };
  revalidatePath('/conta');
  return { ok: true, message: 'Endereço salvo.' };
}

export async function deleteAddress(id: string): Promise<void> {
  const user = await getSessionUser();
  if (!user || !z.uuid().safeParse(id).success) return;
  const supabase = await createSessionClient();
  await supabase.from('customer_addresses').delete().eq('id', id);
  revalidatePath('/conta');
}

export async function signOut(): Promise<void> {
  const supabase = await createSessionClient();
  await supabase.auth.signOut();
  revalidatePath('/conta');
}
