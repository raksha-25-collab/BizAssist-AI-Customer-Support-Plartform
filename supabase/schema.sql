-- BizAssist AI Support Platform - Supabase PostgreSQL Schema
-- Run this SQL in your Supabase SQL Editor to provision all tables and Realtime feeds.

create table if not exists public.profiles (
  id text primary key,
  email text unique not null,
  full_name text not null,
  role text not null check (role in ('customer', 'staff', 'admin')),
  title text not null,
  company text not null,
  department text default 'Infrastructure',
  tier text default 'Tier-1 SLA',
  avatar_url text not null,
  on_call boolean default true,
  urgent_routing boolean default true,
  csat_score numeric(4,1) default 99.0,
  avg_resolve_mins integer default 16,
  resolved_month integer default 42,
  active_load integer default 2,
  max_load integer default 5,
  shift_label text default 'Active Shift',
  created_at timestamptz default now()
);

create table if not exists public.tickets (
  id text primary key,
  code text unique not null,
  title text not null,
  domain_category text not null,
  severity text not null check (severity in ('P1', 'P2', 'P3', 'Low', 'Medium')),
  status text not null check (status in ('open', 'in_progress', 'waiting_customer', 'escalated', 'pending_verification', 'resolved')),
  customer_id text references public.profiles(id) on delete set null,
  customer_name text not null,
  customer_email text,
  customer_role text,
  company text not null,
  cluster_name text default 'auth-cluster-east',
  assignee_id text references public.profiles(id) on delete set null,
  assignee_name text,
  assignee_tier text,
  payload_description text not null,
  attachment_name text,
  attachment_size text,
  ai_diagnosis jsonb,
  resolution_notes jsonb,
  sla_minutes_left integer default 15,
  sla_target_mins integer default 25,
  progress_pct integer default 25,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.ticket_messages (
  id text primary key,
  ticket_id text not null references public.tickets(id) on delete cascade,
  sender_id text,
  sender_name text not null,
  sender_role text not null check (sender_role in ('customer', 'staff', 'admin', 'ai', 'system')),
  message_type text not null default 'text' check (message_type in ('text', 'handover', 'runbook', 'diagnostic')),
  body text not null,
  metadata jsonb,
  created_at timestamptz default now()
);

create table if not exists public.ticket_timeline (
  id text primary key,
  ticket_id text not null references public.tickets(id) on delete cascade,
  stage_order integer not null,
  title text not null,
  description text not null,
  badge_text text,
  status text not null check (status in ('completed', 'active', 'pending')),
  progress_pct integer,
  attachment_name text,
  timestamp_label text
);

create table if not exists public.notifications (
  id text primary key,
  target_role text not null check (target_role in ('customer', 'staff', 'admin', 'all')),
  ticket_id text,
  ticket_code text,
  category text not null check (category in ('urgent', 'ai_update', 'assignment', 'runbook')),
  title text not null,
  body text not null,
  is_read boolean default false,
  action_type text,
  created_at timestamptz default now()
);

create table if not exists public.runbooks (
  code text primary key,
  title text not null,
  description text not null,
  estimated_secs integer default 45,
  confidence integer default 94,
  last_status text default 'Ready',
  last_executed_at timestamptz
);

create table if not exists public.ai_copilot_messages (
  id text primary key,
  session_user_id text not null,
  sender text not null check (sender in ('user', 'assistant')),
  body text not null,
  diagnosis_card jsonb,
  created_at timestamptz default now()
);

-- Enable Row Level Security (configure per-tenant policies for production)
alter table public.profiles enable row level security;
alter table public.tickets enable row level security;
alter table public.ticket_messages enable row level security;
alter table public.ticket_timeline enable row level security;
alter table public.notifications enable row level security;
alter table public.runbooks enable row level security;
alter table public.ai_copilot_messages enable row level security;

-- Permissive policies for service-role / authenticated workspace access
create policy "Allow authenticated read profiles" on public.profiles for select using (true);
create policy "Allow workspace access tickets" on public.tickets for all using (true) with check (true);
create policy "Allow workspace access messages" on public.ticket_messages for all using (true) with check (true);
create policy "Allow workspace access timeline" on public.ticket_timeline for all using (true) with check (true);
create policy "Allow workspace access notifications" on public.notifications for all using (true) with check (true);
create policy "Allow workspace access runbooks" on public.runbooks for all using (true) with check (true);
create policy "Allow workspace access ai_copilot" on public.ai_copilot_messages for all using (true) with check (true);

-- Enable Supabase Realtime on live collaboration tables
alter publication supabase_realtime add table public.tickets;
alter publication supabase_realtime add table public.ticket_messages;
alter publication supabase_realtime add table public.ticket_timeline;
alter publication supabase_realtime add table public.notifications;
