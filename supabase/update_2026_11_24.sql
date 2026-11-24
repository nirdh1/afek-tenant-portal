-- עדכון למסד נתונים קיים (24.11.2026)
-- 1. כל שדות ההרשמה חובה
alter table registration_requests
  alter column email   set not null,
  alter column phone   set not null,
  alter column address set not null;

-- 2. סטטוס לבקשות הרשמה (ממתינה / אושרה / נדחתה)
alter table registration_requests
  add column if not exists status text not null default 'pending'
  check (status in ('pending','approved','rejected'));
update registration_requests set status = 'approved' where handled and status = 'pending';

-- 3. טלפון ושם מטופס ההרשמה עוברים לפרופיל בכניסה הראשונה
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  inv invites;
  req registration_requests;
begin
  select * into inv from invites where email = lower(new.email);
  -- פרטים מטופס ההרשמה, אם הדייר נרשם דרך האתר
  select * into req from registration_requests where lower(email) = lower(new.email)
    order by created_at desc limit 1;
  insert into profiles (id, email, phone, full_name, role, apartment_id)
  values (new.id, lower(new.email), coalesce(inv.phone, req.phone), coalesce(inv.full_name, req.full_name),
          coalesce(inv.role, 'pending'), inv.apartment_id);
  return new;
end $$;

-- השלמת טלפון ושם לפרופילים שכבר נוצרו בלי טלפון
update profiles p set
  phone = coalesce(p.phone, r.phone),
  full_name = coalesce(p.full_name, r.full_name)
from (select distinct on (lower(email)) lower(email) as email, phone, full_name
      from registration_requests order by lower(email), created_at desc) r
where r.email = p.email and (p.phone is null or p.full_name is null);

-- 4. סוג מסמך חדש: אוגדן דיירים
alter table documents drop constraint if exists documents_category_check;
alter table documents add constraint documents_category_check
  check (category in ('binder','nesach','agreement','sale_contract','presentation','measurement','other'));

-- 5. הודעות של דיירים מתפרסמות לכולם רק אחרי אישור המנהל
alter table posts   add column if not exists approved boolean not null default false;
alter table replies add column if not exists approved boolean not null default false;
-- הודעות קיימות של הנציגות ועורכי הדין נחשבות מאושרות
update posts   set approved = true where author_id in (select id from profiles where role in ('admin','lawyer'));
update replies set approved = true where author_id in (select id from profiles where role in ('admin','lawyer'));

create or replace function stamp_author() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.author_id := auth.uid();
  new.author_label := user_label(auth.uid());
  new.approved := is_staff();   -- הודעות של הנציגות ועורכי הדין מאושרות אוטומטית
  return new;
end $$;

drop policy if exists post_public on posts;
drop policy if exists post_read   on posts;
drop policy if exists post_insert on posts;
drop policy if exists post_admin  on posts;
drop policy if exists post_del    on posts;
drop policy if exists rep_read    on replies;
drop policy if exists rep_insert  on replies;
drop policy if exists rep_admin   on replies;

-- הודעות: דייר רואה את ההודעות שלו ואת מה שהמנהל אישר לפרסום.
-- עורך דין רואה הודעות שנשלחו אליו ואת המאושרות. המנהל רואה הכול.
create or replace function can_see_post(p posts) returns boolean
language sql stable security definer set search_path = public as $$
  select is_admin()
    or p.author_id = auth.uid()
    or (p.visibility = 'public' and p.approved and my_role() in ('tenant','lawyer'))
    or (my_role() = 'lawyer' and p.to_lawyers)
$$;

create policy post_public on posts for select to anon using (is_announcement and visibility = 'public' and approved);
create policy post_read   on posts for select to authenticated using (can_see_post(posts));
create policy post_insert on posts for insert to authenticated with check (
  is_staff()
  or (my_role() = 'tenant' and category in ('lawyers','general') and not is_announcement)
);
create policy post_admin on posts for update using (is_admin()) with check (is_admin());
create policy post_del   on posts for delete using (is_admin());

create policy rep_read on replies for select to authenticated using (
  exists (
    select 1 from posts p where p.id = post_id and can_see_post(p)
      and (
        is_admin()
        or p.author_id = auth.uid()
        or replies.author_id = auth.uid()
        or (my_role() = 'lawyer' and p.to_lawyers)
        or (replies.visibility = 'public' and replies.approved)
      )
  )
);
create policy rep_insert on replies for insert to authenticated with check (
  exists (
    select 1 from posts p where p.id = post_id and can_see_post(p)
      and (is_staff() or p.author_id = auth.uid())
  )
);
create policy rep_admin on replies for update using (is_admin()) with check (is_admin());
