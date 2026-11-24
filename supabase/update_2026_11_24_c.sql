-- עדכון למסד נתונים קיים: קבצים מצורפים להודעות והודעה מודגשת בדף הבית (24.11.2026, עדכון 3)
alter table posts add column if not exists featured        boolean not null default false;
alter table posts add column if not exists attachment_path text;
alter table posts add column if not exists attachment_name text;

drop policy if exists post_files_read on storage.objects;
drop policy if exists docs_write      on storage.objects;
-- קבצים מצורפים להודעות: גלויים למי שרואה את ההודעה (כולל אורחים בהודעות שבדף הבית)
create policy post_files_read on storage.objects for select to anon, authenticated using (
  bucket_id = 'documents'
  and name like 'posts/%'
  and exists (select 1 from public.posts p where p.attachment_path = storage.objects.name)
);
create policy docs_write on storage.objects for insert to authenticated with check (
  bucket_id = 'documents' and (
    public.is_admin()
    or (name like 'posts/' || auth.uid()::text || '/%' and public.my_role() in ('tenant','lawyer'))
  )
);
