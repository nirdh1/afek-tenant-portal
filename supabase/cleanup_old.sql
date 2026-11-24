-- ניקוי טבלאות ישנות מניסיון קודם בפרויקט Supabase.
-- בטוח: אם באחת הטבלאות יש מידע, שום דבר לא נמחק ומופיעה שגיאה שמציינת איפה.
do $$
declare
  t text;
  n bigint;
  old_tables text[] := array['staff_roles','announcements','events','documents','profiles','units','memberships'];
begin
  foreach t in array old_tables loop
    if to_regclass('public.' || t) is not null then
      execute format('select count(*) from public.%I', t) into n;
      if n > 0 then
        raise exception 'בטבלה % יש % שורות. לא נמחק דבר.', t, n;
      end if;
    end if;
  end loop;
  foreach t in array old_tables loop
    execute format('drop table if exists public.%I cascade', t);
  end loop;
end $$;
