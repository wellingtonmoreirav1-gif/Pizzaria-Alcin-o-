-- =============================================================================
-- Alcinão — Armazenamento de imagens (Supabase Storage)
-- Bucket público "catalog": qualquer pessoa pode VER as imagens publicadas;
-- somente administrador e gerente podem enviar, substituir ou excluir.
-- Tamanho máximo 5 MB; apenas JPEG, PNG, WebP e AVIF.
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('catalog', 'catalog', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "public_images_read" on storage.objects for select to anon, authenticated
  using (bucket_id = 'catalog');

create policy "public_images_staff_insert" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'catalog'
    and public.is_catalog_manager()
    and (storage.foldername(name))[1] in ('products', 'categories', 'banners', 'brand', 'options')
    and storage.extension(name) in ('jpg', 'jpeg', 'png', 'webp', 'avif')
  );

create policy "public_images_staff_update" on storage.objects for update to authenticated
  using (bucket_id = 'catalog' and public.is_catalog_manager())
  with check (bucket_id = 'catalog' and public.is_catalog_manager());

create policy "public_images_staff_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'catalog' and public.is_catalog_manager());
