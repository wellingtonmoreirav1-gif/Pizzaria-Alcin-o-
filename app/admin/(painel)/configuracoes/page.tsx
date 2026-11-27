import { connection } from 'next/server';
import { requireStaff, PERMISSIONS } from '@/lib/auth/session';
import { createSessionClient } from '@/lib/supabase/server';
import { formatBrazilPhone } from '@/lib/phone';
import { Card, PageHeader, TextAreaField, TextField } from '@/components/admin/fields';
import { ActionForm } from '@/components/admin/action-form';
import { ImageUpload } from '@/components/admin/image-upload';
import { saveSettings } from './actions';

export const metadata = { title: 'Configurações' };

export default async function SettingsPage() {
  await requireStaff([...PERMISSIONS.settings]);
  await connection();
  const supabase = await createSessionClient();
  const { data: s } = await supabase.from('business_settings').select('*').eq('id', 1).single();
  if (!s) return <p>Configurações não encontradas. Rode o seed (supabase/seed.sql).</p>;
  return (
    <div className="space-y-6">
      <PageHeader
        title="Configurações"
        description="Dados públicos do restaurante, marca, textos e SEO. Credenciais técnicas NÃO ficam aqui (ficam nas variáveis de ambiente da Vercel)."
      />
      <ActionForm action={saveSettings} submitLabel="Salvar configurações">
        <Card title="Restaurante">
          <div className="grid gap-3 md:grid-cols-6">
            <TextField label="Nome comercial" name="businessName" required defaultValue={s.business_name} className="md:col-span-3" />
            <TextField
              label="WhatsApp que recebe os pedidos"
              name="whatsapp"
              required
              defaultValue={formatBrazilPhone(String(s.whatsapp_number).slice(2))}
              className="md:col-span-3"
              hint="Os links wa.me usam 55 + DDD + número automaticamente."
            />
            <TextField label="Endereço" name="addressLine" defaultValue={s.address_line ?? ''} className="md:col-span-3" />
            <TextField label="Cidade" name="city" defaultValue={s.city ?? ''} className="md:col-span-2" />
            <TextField label="UF" name="state" defaultValue={s.state ?? ''} maxLength={2} />
            <TextField label="Ponto de referência" name="referencePoint" defaultValue={s.reference_point ?? ''} className="md:col-span-6" />
            <TextField
              label="Latitude do restaurante"
              name="latitude"
              defaultValue={s.latitude ?? ''}
              className="md:col-span-2"
              hint="Opcional: centraliza o mapa do checkout."
            />
            <TextField label="Longitude do restaurante" name="longitude" defaultValue={s.longitude ?? ''} className="md:col-span-2" />
            <TextField
              label="Instagram"
              name="instagramUrl"
              defaultValue={s.instagram_url ?? ''}
              className="md:col-span-2"
              placeholder="https://instagram.com/..."
            />
          </div>
        </Card>
        <Card title="Marca e página inicial">
          <div className="grid gap-4 md:grid-cols-2">
            <ImageUpload name="logoUrl" folder="brand" defaultUrl={s.logo_url} label="Logo oficial" />
            {/* O topo usa a animação da pizza; a foto antiga fica guardada sem uso. */}
            <input type="hidden" name="heroImageUrl" value={s.hero_image_url ?? ''} />
            <TextField
              label="Chamada principal"
              name="heroTitle"
              defaultValue={s.hero_title ?? ''}
              hint="Vazio = letreiro padrão “Sabor irresistível no ALCINÃO”."
            />
            <TextField label="Texto de apoio" name="heroSubtitle" defaultValue={s.hero_subtitle ?? ''} />
            <TextField label="Texto promocional (opcional)" name="promoText" defaultValue={s.promo_text ?? ''} className="md:col-span-2" />
          </div>
        </Card>
        <Card title="SEO e vitrine">
          <div className="grid gap-3 md:grid-cols-4">
            <TextField label="Título para o Google" name="seoTitle" defaultValue={s.seo_title ?? ''} className="md:col-span-2" maxLength={70} />
            <TextField label="Descrição para o Google" name="seoDescription" defaultValue={s.seo_description ?? ''} className="md:col-span-2" maxLength={160} />
            <TextField label="“Mais vendidos”: período (dias)" name="bestDays" type="number" min={1} max={365} defaultValue={s.best_sellers_days} />
            <TextField
              label="Mínimo de pedidos concluídos para mostrar"
              name="bestMin"
              type="number"
              min={1}
              defaultValue={s.best_sellers_min_orders}
              hint="Abaixo disso, só os destaques escolhidos pela equipe."
            />
          </div>
        </Card>
        <Card title="Políticas e privacidade">
          <div className="grid gap-3 md:grid-cols-2">
            <TextAreaField
              label="Política de cancelamento (aparece nos Termos)"
              name="cancellationPolicy"
              defaultValue={s.cancellation_policy ?? ''}
              className="md:col-span-2"
            />
            <TextField label="E-mail para pedidos de privacidade (LGPD)" name="privacyEmail" type="email" defaultValue={s.privacy_contact_email ?? ''} />
            <TextField
              label="Guardar localização dos pedidos por (dias)"
              name="retentionDays"
              type="number"
              min={1}
              max={3650}
              defaultValue={s.location_retention_days}
              hint="Depois disso as coordenadas são apagadas (ver README → rotina de limpeza)."
            />
          </div>
        </Card>
      </ActionForm>
    </div>
  );
}
