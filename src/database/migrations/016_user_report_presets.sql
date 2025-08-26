-- 016_user_report_presets.sql
-- User report presets (filters + columns) with RLS and helper RPCs

begin;

-- Table
create table if not exists public.user_report_presets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  report_key text not null,
  name text not null,
  filters jsonb not null default '{}',
  columns jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_user_report_presets_user on public.user_report_presets(user_id);
create index if not exists idx_user_report_presets_key on public.user_report_presets(report_key);

-- RLS
alter table public.user_report_presets enable row level security;

-- Policies: owner-only access
create policy if not exists user_report_presets_select on public.user_report_presets
  for select using (auth.uid() = user_id);

create policy if not exists user_report_presets_insert on public.user_report_presets
  for insert with check (auth.uid() = user_id);

create policy if not exists user_report_presets_update on public.user_report_presets
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy if not exists user_report_presets_delete on public.user_report_presets
  for delete using (auth.uid() = user_id);

-- Trigger to keep updated_at fresh
create or replace function public.tg_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger trg_user_report_presets_touch
before update on public.user_report_presets
for each row execute function public.tg_touch_updated_at();

-- RPCs
create or replace function public.get_report_presets(p_report_key text)
returns setof public.user_report_presets
language sql
security definer
set search_path = public
as $$
  select * from public.user_report_presets
  where user_id = auth.uid()
    and report_key = p_report_key
  order by created_at desc;
$$;

grant execute on function public.get_report_presets(text) to authenticated, anon, service_role;

create or replace function public.upsert_report_preset(
  p_id uuid,
  p_report_key text,
  p_name text,
  p_filters jsonb,
  p_columns jsonb
)
returns public.user_report_presets
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_row public.user_report_presets;
begin
  if p_id is null then
    insert into public.user_report_presets (user_id, report_key, name, filters, columns)
    values (auth.uid(), p_report_key, p_name, coalesce(p_filters,'{}'::jsonb), coalesce(p_columns,'[]'::jsonb))
    returning * into v_row;
  else
    update public.user_report_presets
       set name = coalesce(p_name, name),
           filters = coalesce(p_filters, filters),
           columns = coalesce(p_columns, columns),
           updated_at = now()
     where id = p_id and user_id = auth.uid()
    returning * into v_row;
  end if;
  return v_row;
end;
$$;

grant execute on function public.upsert_report_preset(uuid, text, text, jsonb, jsonb) to authenticated, service_role;

create or replace function public.delete_report_preset(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.user_report_presets where id = p_id and user_id = auth.uid();
end;
$$;

grant execute on function public.delete_report_preset(uuid) to authenticated, service_role;

commit;
