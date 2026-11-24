-- עדכון למסד נתונים קיים: התקדמות החתימות ופרסום הודעות רק למנהל (24.11.2026, עדכון 4)
-- נתוני התקדמות: רק למנהל
create or replace function public_stats() returns json
language sql stable security definer set search_path = public as $$
  select case when is_admin() then json_build_object(
    'apartments', (select count(*) from apartments),
    'signed',     (select count(*) from apartments where signed),
    'registered', (select count(*) from profiles where role = 'tenant')
  ) end
$$;

drop policy if exists post_insert on posts;
-- רק המנהל מפרסם הודעות. דייר יכול לשלוח שאלה פרטית לנציגות או לעורכי הדין.
create policy post_insert on posts for insert to authenticated with check (
  is_admin()
  or (my_role() = 'tenant' and category in ('lawyers','general') and visibility = 'private'
      and not is_announcement and not featured)
);
