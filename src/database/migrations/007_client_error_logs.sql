-- 007_client_error_logs.sql
-- Create a simple client error logs table for telemetry

begin;

create table if not exists public.client_error_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  context text not null,
  message text not null,
  extra jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_client_error_logs_created_at on public.client_error_logs(created_at desc);
create index if not exists idx_client_error_logs_user_id on public.client_error_logs(user_id);

commit;

