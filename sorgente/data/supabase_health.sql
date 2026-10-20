-- Forgia 3.2: dati di Apple Salute inviati da un Comando Rapido
-- Il comando non ha password: usa un codice personale (token) generato dall'app.
-- Il codice permette SOLO di scrivere i dati di Salute del suo proprietario.

create table if not exists public.health_tokens (
  token text primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.health_tokens enable row level security;
drop policy if exists "ht_select_own" on public.health_tokens;
drop policy if exists "ht_insert_own" on public.health_tokens;
drop policy if exists "ht_delete_own" on public.health_tokens;
create policy "ht_select_own" on public.health_tokens for select to authenticated using (auth.uid() = user_id);
create policy "ht_insert_own" on public.health_tokens for insert to authenticated with check (auth.uid() = user_id and length(token) >= 24);
create policy "ht_delete_own" on public.health_tokens for delete to authenticated using (auth.uid() = user_id);

create or replace function public.ingest_health(
  p_token text, d text default null,
  hrv text default null, rhr text default null, sleep text default null, deep text default null, rem text default null,
  steps text default null, kcal text default null, w text default null, bf text default null
) returns text language plpgsql security definer set search_path = public as $$
declare
  uid uuid;
  loc timestamp := now() at time zone 'Europe/Rome';
  day text;
  cur jsonb;
  base jsonb;
  night jsonb;
  nd jsonb;
begin
  select t.user_id into uid from public.health_tokens t where t.token = p_token;
  if uid is null then raise exception 'Codice Forgia non valido'; end if;
  day := coalesce(nullif(trim(d), ''), to_char(loc::date, 'YYYY-MM-DD'));
  if day !~ '^\d{4}-\d{2}-\d{2}$' then raise exception 'Data non valida'; end if;
  -- valori della giornata: l'ultimo invio vince
  base := jsonb_strip_nulls(jsonb_build_object(
    'steps', nullif(left(trim(steps), 40), ''), 'kcal', nullif(left(trim(kcal), 40), ''),
    'w', nullif(left(trim(w), 40), ''), 'bf', nullif(left(trim(bf), 40), ''),
    'at', to_char(loc, 'HH24:MI')));
  -- valori della notte: li fissa l'invio del mattino, quello della sera non li sovrascrive
  night := jsonb_strip_nulls(jsonb_build_object(
    'hrv', nullif(left(trim(hrv), 40), ''), 'rhr', nullif(left(trim(rhr), 40), ''),
    'sleep', nullif(left(trim(sleep), 60), ''), 'deep', nullif(left(trim(deep), 60), ''), 'rem', nullif(left(trim(rem), 60), '')));
  select i.data into cur from public.items i where i.user_id = uid and i.kind = 'h' and i.id = day;
  cur := coalesce(cur, '{}'::jsonb);
  if extract(hour from loc) < 14 then nd := cur || night || base;
  else nd := night || cur || base;
  end if;
  insert into public.items (user_id, kind, id, data, deleted) values (uid, 'h', day, nd, false)
  on conflict (user_id, kind, id) do update set data = excluded.data, deleted = false;
  return 'ok ' || day;
end $$;
revoke all on function public.ingest_health(text, text, text, text, text, text, text, text, text, text, text) from public;
grant execute on function public.ingest_health(text, text, text, text, text, text, text, text, text, text, text) to anon, authenticated;
