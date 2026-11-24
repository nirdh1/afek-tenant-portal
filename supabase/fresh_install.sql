-- התקנה נקייה: מוחק את כל הטבלאות הישנות והקודמות בסכמה public ומתקין את המערכת מחדש.
-- זהירות: כל המידע בטבלאות האלה נמחק לצמיתות.

drop trigger if exists on_auth_user_created on auth.users;
drop policy if exists docs_read   on storage.objects;
drop policy if exists docs_write  on storage.objects;
drop policy if exists docs_delete on storage.objects;
drop policy if exists post_files_read on storage.objects;

drop table if exists
  public.staff_roles, public.announcements, public.events, public.documents, public.profiles,
  public.units, public.memberships,
  public.activity_log, public.registration_requests, public.project_status, public.meetings,
  public.replies, public.posts, public.invites, public.apartments, public.ownership_votes
  cascade;

drop function if exists public.can_see_post(public.posts) cascade;
drop function if exists public.my_coowners() cascade;
drop function if exists public.vote_owner(uuid, text, text) cascade;
drop function if exists public.handle_new_user() cascade;
drop function if exists public.stamp_author() cascade;
drop function if exists public.log_activity(text, text) cascade;
drop function if exists public.update_my_details(text, text, occupancy, text, text, date) cascade;
drop function if exists public.public_stats() cascade;
drop function if exists public.user_label(uuid) cascade;
drop function if exists public.my_apartment() cascade;
drop function if exists public.is_staff() cascade;
drop function if exists public.is_admin() cascade;
drop function if exists public.my_role() cascade;
drop type if exists public.user_role, public.occupancy, public.visibility cascade;

-- פורטל דיירים – מתחם יצחק רבין–אפק
-- להרצה פעם אחת ב-Supabase: SQL Editor > New query > הדבקה > Run

-- ===== טיפוסים =====
create type user_role  as enum ('pending', 'tenant', 'lawyer', 'admin');
create type occupancy  as enum ('owner', 'rented', 'empty');
create type visibility as enum ('public', 'private');

-- ===== דירות =====
create table apartments (
  id               bigserial primary key,
  building         text not null,           -- למשל "רבין 12"
  unit             text not null,           -- מספר דירה
  gush             text,
  helka            text,
  sub_helka        text,
  registered_area  numeric(7,2),            -- שטח רשום בנסח
  measured_area    numeric(7,2),            -- שטח לפי מדידה
  measured_at      date,
  compensation     text,                    -- תמורה מוצעת
  occupancy        occupancy not null default 'owner',
  renter_name      text,
  renter_phone     text,
  lease_end        date,
  signed           boolean not null default false,
  signed_at        date,
  notes            text,                    -- הערות פנימיות, נראות לנציגות בלבד בממשק
  created_at       timestamptz not null default now(),
  unique (building, unit)
);

-- ===== משתמשים =====
-- הזמנה: הנציגות מוסיפה כתובת מייל, וכשהדייר נכנס בפעם הראשונה הוא משויך אוטומטית
create table invites (
  email        text primary key,            -- כתובת המייל שאיתה הדייר נכנס (באותיות קטנות)
  phone        text,                        -- טלפון ליצירת קשר
  full_name    text,
  role         user_role not null default 'tenant',
  apartment_id bigint references apartments on delete set null,
  created_at   timestamptz not null default now()
);

create table profiles (
  id           uuid primary key references auth.users on delete cascade,
  phone        text,
  full_name    text,
  email        text,
  role         user_role not null default 'pending',
  apartment_id bigint references apartments on delete set null,
  created_at   timestamptz not null default now(),
  last_seen_at timestamptz
);

-- ===== תוכן =====
create table documents (
  id           bigserial primary key,
  apartment_id bigint references apartments on delete cascade,  -- ריק = מסמך כללי
  category     text not null check (category in ('binder','nesach','agreement','sale_contract','presentation','measurement','other')),
  title        text not null,
  storage_path text not null unique,
  is_public    boolean not null default false,                  -- כללי לכל הדיירים המאומתים
  uploaded_by  uuid references profiles default auth.uid(),
  created_at   timestamptz not null default now()
);

create table posts (
  id              bigserial primary key,
  category        text not null check (category in ('meetings','sale_contracts','agreement_progress','lawyers','general')),
  title           text not null,
  body            text,
  author_id       uuid references profiles on delete set null default auth.uid(),
  author_label    text,
  visibility      visibility not null default 'public',
  to_lawyers      boolean not null default false,
  is_announcement boolean not null default false,  -- מוצג גם בדף הבית הציבורי
  approved        boolean not null default false,  -- הודעת דייר גלויה לאחרים רק אחרי אישור המנהל
  featured        boolean not null default false,  -- מוצג בגדול בראש דף הבית
  attachment_path text,                             -- קובץ מצורף באחסון
  attachment_name text,
  created_at      timestamptz not null default now()
);

create table replies (
  id           bigserial primary key,
  post_id      bigint not null references posts on delete cascade,
  body         text not null,
  author_id    uuid references profiles on delete set null default auth.uid(),
  author_label text,
  visibility   visibility not null default 'public',
  approved     boolean not null default false,
  created_at   timestamptz not null default now()
);

create table meetings (
  id        bigserial primary key,
  title     text not null,
  starts_at timestamptz not null,
  location  text,
  notes     text
);

create table project_status (
  id            int primary key default 1 check (id = 1),
  stage         text not null default 'היערכות לקידום ההסכם',
  signed_target int not null default 66,
  updated_at    timestamptz not null default now()
);
insert into project_status default values;

create table registration_requests (
  id         bigserial primary key,
  full_name  text not null,
  email      text not null,
  phone      text not null,
  address    text not null,
  handled    boolean not null default false,
  status     text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now()
);

create table activity_log (
  id         bigserial primary key,
  user_id    uuid references profiles on delete set null,
  user_label text,
  role       user_role,
  action     text not null,
  details    text,
  created_at timestamptz not null default now()
);

-- ===== פונקציות עזר =====
create or replace function my_role() returns user_role
language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid()
$$;

create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'admin' from profiles where id = auth.uid()), false)
$$;

create or replace function is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select role in ('admin','lawyer') from profiles where id = auth.uid()), false)
$$;

create or replace function my_apartment() returns bigint
language sql stable security definer set search_path = public as $$
  select apartment_id from profiles where id = auth.uid()
$$;

create or replace function user_label(uid uuid) returns text
language sql stable security definer set search_path = public as $$
  select case p.role
           when 'lawyer' then coalesce(p.full_name, 'עורך דין') || ' (עו"ד)'
           when 'admin'  then coalesce(p.full_name, 'הנציגות') || ' (נציגות)'
           else coalesce(a.building || ' / ' || a.unit, p.full_name, 'דייר')
         end
  from profiles p left join apartments a on a.id = p.apartment_id
  where p.id = uid
$$;

-- משתמש חדש: יצירת פרופיל ושיוך לפי הזמנה
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

create trigger on_auth_user_created
  after insert on auth.users for each row execute function handle_new_user();

-- חתימת מחבר על הודעות ותשובות
create or replace function stamp_author() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.author_id := auth.uid();
  new.author_label := user_label(auth.uid());
  new.approved := is_staff();   -- הודעות של הנציגות ועורכי הדין מאושרות אוטומטית
  return new;
end $$;

create trigger posts_stamp   before insert on posts   for each row execute function stamp_author();
create trigger replies_stamp before insert on replies for each row execute function stamp_author();

-- רישום פעילות
create or replace function log_activity(p_action text, p_details text default null) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return; end if;
  insert into activity_log (user_id, user_label, role, action, details)
  values (auth.uid(), user_label(auth.uid()), my_role(), p_action, p_details);
  update profiles set last_seen_at = now() where id = auth.uid();
end $$;

-- עדכון פרטים עצמי של דייר (רק השדות המותרים)
create or replace function update_my_details(
  p_full_name text, p_phone text, p_occupancy occupancy,
  p_renter_name text, p_renter_phone text, p_lease_end date
) returns void
language plpgsql security definer set search_path = public as $$
declare apt bigint := my_apartment();
begin
  if auth.uid() is null or my_role() = 'pending' then raise exception 'not allowed'; end if;
  update profiles set full_name = p_full_name, phone = p_phone where id = auth.uid();
  if apt is not null then
    update apartments set
      occupancy    = p_occupancy,
      renter_name  = case when p_occupancy = 'rented' then p_renter_name  end,
      renter_phone = case when p_occupancy = 'rented' then p_renter_phone end,
      lease_end    = case when p_occupancy = 'rented' then p_lease_end    end
    where id = apt;
  end if;
  perform log_activity('עדכן פרטים אישיים',
    case p_occupancy when 'owner' then 'גר בדירה' when 'rented' then 'הדירה מושכרת' else 'הדירה ריקה' end);
end $$;

-- סטטיסטיקה ציבורית (מספרים בלבד)
-- נתוני התקדמות: רק למנהל
create or replace function public_stats() returns json
language sql stable security definer set search_path = public as $$
  select case when is_admin() then json_build_object(
    'apartments', (select count(*) from apartments),
    'signed',     (select count(*) from apartments where signed),
    'registered', (select count(*) from profiles where role = 'tenant')
  ) end
$$;

-- ===== הרשאות (RLS) =====
alter table apartments            enable row level security;
alter table invites               enable row level security;
alter table profiles              enable row level security;
alter table documents             enable row level security;
alter table posts                 enable row level security;
alter table replies               enable row level security;
alter table meetings              enable row level security;
alter table project_status        enable row level security;
alter table registration_requests enable row level security;
alter table activity_log          enable row level security;

-- דירות: דייר רואה רק את שלו, עו"ד ונציגות רואים הכול, רק נציגות משנה
create policy apt_read  on apartments for select using (is_staff() or id = my_apartment());
create policy apt_admin on apartments for all    using (is_admin()) with check (is_admin());

create policy inv_admin on invites for all using (is_admin()) with check (is_admin());

create policy prof_read  on profiles for select using (id = auth.uid() or is_staff());
create policy prof_admin on profiles for update using (is_admin()) with check (is_admin());

create policy doc_read  on documents for select using (
  is_staff()
  or (my_role() = 'tenant' and (is_public or apartment_id = my_apartment()))
);
create policy doc_admin on documents for all using (is_admin()) with check (is_admin());

-- הודעות: פומביות לכל מאומת, פרטיות רק למחבר ולצוות
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
-- רק המנהל מפרסם הודעות. דייר יכול לשלוח שאלה פרטית לנציגות או לעורכי הדין.
create policy post_insert on posts for insert to authenticated with check (
  is_admin()
  or (my_role() = 'tenant' and category in ('lawyers','general') and visibility = 'private'
      and not is_announcement and not featured)
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
create policy rep_del on replies for delete using (is_admin());

create policy meet_read  on meetings for select using (true);
create policy meet_admin on meetings for all using (is_admin()) with check (is_admin());

create policy status_read  on project_status for select using (true);
create policy status_admin on project_status for update using (is_admin()) with check (is_admin());

create policy reg_insert on registration_requests for insert with check (true);
create policy reg_admin  on registration_requests for all using (is_admin()) with check (is_admin());

create policy act_read on activity_log for select using (is_admin());

grant execute on function public_stats() to anon, authenticated;

-- ===== אימות בעלות הדדי בין בעלי אותה דירה =====
create table ownership_votes (
  id           bigserial primary key,
  apartment_id bigint not null references apartments on delete cascade,
  voter_id     uuid not null references profiles on delete cascade,
  subject_id   uuid not null references profiles on delete cascade,
  vote         text not null check (vote in ('confirm','report')),
  note         text,
  resolved     boolean not null default false,   -- דיווח שהמנהל טיפל בו
  created_at   timestamptz not null default now(),
  unique (voter_id, subject_id),
  check (voter_id <> subject_id)
);
alter table ownership_votes enable row level security;
create policy votes_admin on ownership_votes for all using (is_admin()) with check (is_admin());
create policy votes_own   on ownership_votes for select using (voter_id = auth.uid());

-- כל מי שרשום על הדירה שלי, עם מספר האישורים והדיווחים וההצבעה שלי
create or replace function my_coowners()
returns table (id uuid, full_name text, registered_at timestamptz, is_me boolean,
               confirmations int, reports int, my_vote text)
language sql stable security definer set search_path = public as $$
  select p.id, coalesce(p.full_name, 'ללא שם'), p.created_at, p.id = auth.uid(),
    (select count(*)::int from ownership_votes v where v.subject_id = p.id and v.apartment_id = p.apartment_id and v.vote = 'confirm'),
    (select count(*)::int from ownership_votes v where v.subject_id = p.id and v.apartment_id = p.apartment_id and v.vote = 'report' and not v.resolved),
    (select v.vote from ownership_votes v where v.subject_id = p.id and v.voter_id = auth.uid() and v.apartment_id = p.apartment_id)
  from profiles p
  where p.apartment_id = my_apartment() and my_apartment() is not null
    and p.role in ('tenant','admin','lawyer') and my_role() <> 'pending'
  order by p.created_at
$$;

-- אישור או דיווח על בעלים אחר באותה דירה
create or replace function vote_owner(p_subject uuid, p_vote text, p_note text default null) returns void
language plpgsql security definer set search_path = public as $$
declare apt bigint := my_apartment();
begin
  if auth.uid() is null or my_role() = 'pending' or apt is null then raise exception 'not allowed'; end if;
  if p_subject = auth.uid() then raise exception 'cannot vote on yourself'; end if;
  if not exists (select 1 from profiles where id = p_subject and apartment_id = apt) then
    raise exception 'not a co-owner';
  end if;
  if p_vote not in ('confirm','report') then raise exception 'bad vote'; end if;
  insert into ownership_votes (apartment_id, voter_id, subject_id, vote, note)
  values (apt, auth.uid(), p_subject, p_vote, p_note)
  on conflict (voter_id, subject_id) do update
    set vote = excluded.vote, note = excluded.note, apartment_id = excluded.apartment_id,
        resolved = false, created_at = now();
  perform log_activity(case p_vote when 'confirm' then 'אישר בעלות של שותף לדירה' else 'דיווח על משתמש שאינו קשור לדירה' end,
                       user_label(p_subject) || ' · ' || coalesce((select full_name from profiles where id = p_subject), ''));
end $$;

-- ===== אחסון קבצים =====
insert into storage.buckets (id, name, public) values ('documents', 'documents', false)
  on conflict (id) do nothing;

-- קובץ נגיש רק אם רשומת המסמך שלו נגישה למשתמש (אותן הרשאות כמו בטבלה)
create policy docs_read on storage.objects for select to authenticated using (
  bucket_id = 'documents'
  and exists (select 1 from public.documents d where d.storage_path = storage.objects.name)
);
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
create policy docs_delete on storage.objects for delete to authenticated using (
  bucket_id = 'documents' and public.is_admin()
);
