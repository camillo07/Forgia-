-- Forgia: tabella unica per la sincronizzazione (una riga per allenamento, giorno di diario, scheda, cibo…)
create table if not exists public.items (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind text not null,
  id text not null,
  data jsonb,
  deleted boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, kind, id)
);
create index if not exists items_user_updated on public.items (user_id, updated_at);

-- ognuno vede e modifica solo i propri dati
alter table public.items enable row level security;
drop policy if exists "items_select_own" on public.items;
drop policy if exists "items_insert_own" on public.items;
drop policy if exists "items_update_own" on public.items;
drop policy if exists "items_delete_own" on public.items;
create policy "items_select_own" on public.items for select to authenticated using (auth.uid() = user_id);
create policy "items_insert_own" on public.items for insert to authenticated with check (auth.uid() = user_id);
create policy "items_update_own" on public.items for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "items_delete_own" on public.items for delete to authenticated using (auth.uid() = user_id);

-- l'ora di modifica la decide il server (niente problemi di orologi diversi tra telefono e PC)
create or replace function public.items_touch() returns trigger language plpgsql as $$
begin new.updated_at = clock_timestamp(); return new; end $$;
drop trigger if exists items_touch on public.items;
create trigger items_touch before insert or update on public.items for each row execute function public.items_touch();
