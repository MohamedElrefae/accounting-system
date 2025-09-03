-- 017_user_font_preferences.sql
-- User font and formatting preferences with RLS and helper RPCs

begin;

-- Table for storing user font preferences
create table if not exists public.user_font_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  font_family text not null default 'Segoe UI',
  font_size_scale real not null default 1.0 check (font_size_scale >= 0.7 and font_size_scale <= 1.5),
  line_height_scale real not null default 1.0 check (line_height_scale >= 0.8 and line_height_scale <= 2.0),
  font_weight text not null default 'normal' check (font_weight in ('lighter', 'normal', 'medium', 'semibold', 'bold')),
  letter_spacing_scale real not null default 1.0 check (letter_spacing_scale >= 0.8 and letter_spacing_scale <= 1.5),
  is_arabic_optimized boolean not null default false,
  custom_css_variables jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  
  -- One preference record per user
  constraint user_font_preferences_user_unique unique (user_id)
);

create index if not exists idx_user_font_preferences_user on public.user_font_preferences(user_id);

-- RLS
alter table public.user_font_preferences enable row level security;

-- Policies: owner-only access
create policy if not exists user_font_preferences_select on public.user_font_preferences
  for select using (auth.uid() = user_id);

create policy if not exists user_font_preferences_insert on public.user_font_preferences
  for insert with check (auth.uid() = user_id);

create policy if not exists user_font_preferences_update on public.user_font_preferences
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy if not exists user_font_preferences_delete on public.user_font_preferences
  for delete using (auth.uid() = user_id);

-- Trigger to keep updated_at fresh
create trigger trg_user_font_preferences_touch
before update on public.user_font_preferences
for each row execute function public.tg_touch_updated_at();

-- RPC to get user font preferences
create or replace function public.get_user_font_preferences()
returns public.user_font_preferences
language sql
security definer
set search_path = public
as $$
  select * from public.user_font_preferences
  where user_id = auth.uid()
  limit 1;
$$;

grant execute on function public.get_user_font_preferences() to authenticated, service_role;

-- RPC to upsert user font preferences
create or replace function public.upsert_user_font_preferences(
  p_font_family text,
  p_font_size_scale real,
  p_line_height_scale real,
  p_font_weight text,
  p_letter_spacing_scale real,
  p_is_arabic_optimized boolean,
  p_custom_css_variables jsonb
)
returns public.user_font_preferences
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.user_font_preferences;
begin
  insert into public.user_font_preferences (
    user_id, 
    font_family, 
    font_size_scale, 
    line_height_scale, 
    font_weight, 
    letter_spacing_scale, 
    is_arabic_optimized, 
    custom_css_variables
  )
  values (
    auth.uid(), 
    p_font_family, 
    p_font_size_scale, 
    p_line_height_scale, 
    p_font_weight, 
    p_letter_spacing_scale, 
    p_is_arabic_optimized, 
    coalesce(p_custom_css_variables, '{}'::jsonb)
  )
  on conflict (user_id) do update set
    font_family = coalesce(p_font_family, user_font_preferences.font_family),
    font_size_scale = coalesce(p_font_size_scale, user_font_preferences.font_size_scale),
    line_height_scale = coalesce(p_line_height_scale, user_font_preferences.line_height_scale),
    font_weight = coalesce(p_font_weight, user_font_preferences.font_weight),
    letter_spacing_scale = coalesce(p_letter_spacing_scale, user_font_preferences.letter_spacing_scale),
    is_arabic_optimized = coalesce(p_is_arabic_optimized, user_font_preferences.is_arabic_optimized),
    custom_css_variables = coalesce(p_custom_css_variables, user_font_preferences.custom_css_variables),
    updated_at = now()
  returning * into v_row;
  
  return v_row;
end;
$$;

grant execute on function public.upsert_user_font_preferences(text, real, real, text, real, boolean, jsonb) to authenticated, service_role;

commit;
