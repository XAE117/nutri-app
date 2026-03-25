-- Phase 1: Core schema for NutriLens
-- profiles, food_logs, storage bucket, RLS, triggers

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Profiles table (extends auth.users)
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  display_name text,
  timezone text default 'America/Los_Angeles',
  unit_system text default 'imperial' check (unit_system in ('imperial', 'metric')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Food logs table
create table public.food_logs (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  logged_at timestamptz default now() not null,
  meal_type text check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack', 'drink', 'other')),
  description text,
  items jsonb default '[]'::jsonb,
  calories numeric,
  protein_g numeric,
  carbs_g numeric,
  fat_g numeric,
  fiber_g numeric,
  confidence numeric check (confidence >= 0 and confidence <= 1),
  source text default 'photo' check (source in ('photo', 'manual', 'barcode', 'search', 'label')),
  image_path text,
  raw_ai_response jsonb,
  verified boolean default false,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Indexes
create index food_logs_user_id_idx on public.food_logs(user_id);
create index food_logs_logged_at_idx on public.food_logs(logged_at);
create index food_logs_user_date_idx on public.food_logs(user_id, logged_at);

-- RLS
alter table public.profiles enable row level security;
alter table public.food_logs enable row level security;

-- Profiles: users can only read/update their own profile
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Food logs: full CRUD on own data only
create policy "Users can view own food logs"
  on public.food_logs for select
  using (auth.uid() = user_id);

create policy "Users can insert own food logs"
  on public.food_logs for insert
  with check (auth.uid() = user_id);

create policy "Users can update own food logs"
  on public.food_logs for update
  using (auth.uid() = user_id);

create policy "Users can delete own food logs"
  on public.food_logs for delete
  using (auth.uid() = user_id);

-- Storage bucket for food photos
insert into storage.buckets (id, name, public)
values ('food-photos', 'food-photos', false);

-- Storage RLS: users can only access their own folder
create policy "Users can upload own photos"
  on storage.objects for insert
  with check (
    bucket_id = 'food-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can view own photos"
  on storage.objects for select
  using (
    bucket_id = 'food-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can delete own photos"
  on storage.objects for delete
  using (
    bucket_id = 'food-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Auto-create profile on auth signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Updated_at trigger
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.update_updated_at();

create trigger food_logs_updated_at
  before update on public.food_logs
  for each row execute function public.update_updated_at();
