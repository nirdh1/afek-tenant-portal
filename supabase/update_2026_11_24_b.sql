-- עדכון למסד נתונים קיים: אימות בעלות הדדי (24.11.2026, עדכון 2)

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
