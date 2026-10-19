import { CheckboxField, SelectField, TextAreaField, TextField, centsInput, toLocalInput } from './fields';
import { ImageUpload } from './image-upload';

export interface ProductRowAdmin {
  id?: string;
  name?: string;
  slug?: string;
  category_id?: string;
  kind?: string;
  short_description?: string | null;
  description?: string | null;
  base_price?: number | string | null;
  tags?: string[];
  serves?: string | null;
  max_quantity?: number;
  shift_restriction?: string;
  available_from?: string | null;
  available_until?: string | null;
  is_active?: boolean;
  is_available?: boolean;
  is_featured?: boolean;
  featured_order?: number | null;
  sort_order?: number;
  image_url?: string | null;
  image_alt?: string | null;
}

/** Campos do produto (usados em "novo" e "editar"). */
export function ProductFields({ product, categories }: { product: ProductRowAdmin; categories: { id: string; name: string }[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-6">
      <TextField label="Nome" name="name" required defaultValue={product.name} className="md:col-span-3" maxLength={120} />
      <TextField label="Slug (endereço)" name="slug" defaultValue={product.slug} className="md:col-span-3" hint="Gerado a partir do nome se ficar vazio. Ex.: pizza-calabresa" />
      <SelectField label="Categoria" name="categoryId" defaultValue={product.category_id ?? ''} className="md:col-span-2" required>
        <option value="" disabled>Selecione…</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </SelectField>
      <SelectField label="Tipo" name="kind" defaultValue={product.kind ?? 'simple'} className="md:col-span-2" hint="Pizza: tamanhos + sabores com regra de preço. Combo: preço fixo com itens incluídos.">
        <option value="simple">Produto simples (com ou sem tamanhos/opções)</option>
        <option value="pizza">Pizza (montagem por sabores)</option>
        <option value="combo">Combo</option>
      </SelectField>
      <TextField label="Preço (R$)" name="basePrice" inputMode="decimal" defaultValue={centsInput(product.base_price ?? null)} className="md:col-span-2" hint="Para produtos SEM tamanhos e para combos. Com tamanhos, o preço fica em cada tamanho." />
      <TextField label="Descrição curta" name="shortDescription" defaultValue={product.short_description ?? ''} className="md:col-span-6" maxLength={200} hint="Aparece no cartão do produto (até 200 caracteres)." />
      <TextAreaField label="Descrição completa (ingredientes, acompanhamentos)" name="description" defaultValue={product.description ?? ''} className="md:col-span-6" maxLength={2000} />
      <TextField label="Características (separe por vírgula)" name="tags" defaultValue={(product.tags ?? []).join(', ')} className="md:col-span-3" hint="Usadas no filtro do cardápio. Ex.: vegetariano, picante" />
      <TextField label="Serve" name="serves" defaultValue={product.serves ?? ''} className="md:col-span-2" placeholder="Ex.: 2 pessoas" maxLength={60} />
      <TextField label="Qtd. máxima por item" name="maxQuantity" type="number" min={1} max={99} defaultValue={product.max_quantity ?? 30} className="md:col-span-1" />
      <SelectField label="Horário de oferta" name="shiftRestriction" defaultValue={product.shift_restriction ?? 'any'} className="md:col-span-2">
        <option value="any">Qualquer turno</option>
        <option value="lunch">Somente almoço</option>
        <option value="dinner">Somente noite</option>
      </SelectField>
      <TextField label="Disponível a partir de" name="availableFrom" type="datetime-local" defaultValue={toLocalInput(product.available_from ?? null)} className="md:col-span-2" hint="Opcional (ex.: combos com validade)." />
      <TextField label="Disponível até" name="availableUntil" type="datetime-local" defaultValue={toLocalInput(product.available_until ?? null)} className="md:col-span-2" />
      <div className="md:col-span-3">
        <ImageUpload name="imageUrl" folder="products" defaultUrl={product.image_url ?? null} label="Foto principal" />
      </div>
      <TextField label="Texto alternativo da foto" name="imageAlt" defaultValue={product.image_alt ?? ''} className="md:col-span-3" maxLength={200} hint="Descreva a foto para leitores de tela e SEO. Ex.: Pizza de calabresa com cebola fatiada." />
      <div className="grid gap-3 rounded-xl bg-mist p-4 md:col-span-6 md:grid-cols-4">
        <CheckboxField label="Publicado no site" name="isActive" defaultChecked={product.is_active ?? false} hint="Desmarcado = rascunho, só a equipe vê." />
        <CheckboxField label="Disponível (não esgotado)" name="isAvailable" defaultChecked={product.is_available ?? true} />
        <CheckboxField label="Destaque em “Em alta”" name="isFeatured" defaultChecked={product.is_featured ?? false} />
        <div className="grid grid-cols-2 gap-2">
          <TextField label="Ordem no destaque" name="featuredOrder" type="number" defaultValue={product.featured_order ?? ''} />
          <TextField label="Ordem no cardápio" name="sortOrder" type="number" defaultValue={product.sort_order ?? 0} />
        </div>
      </div>
    </div>
  );
}
