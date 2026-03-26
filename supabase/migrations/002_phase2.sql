-- Phase 2: Weight tracking, TDEE, and goals

-- Weight logs (one entry per user per day)
create table public.weight_logs (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  logged_at date default current_date not null,
  weight_kg numeric not null check (weight_kg > 0),
  notes text,
  created_at timestamptz default now(),
  unique(user_id, logged_at)
);

-- TDEE snapshots (daily calculation)
create table public.tdee_snapshots (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  snapshot_date date not null,
  trend_weight_kg numeric,
  raw_weight_kg numeric,
  calories_in numeric,
  estimated_tdee numeric,
  weight_change_rate numeric,
  energy_delta numeric,
  created_at timestamptz default now(),
  unique(user_id, snapshot_date)
);

-- User goals
create table public.user_goals (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null unique,
  goal_type text default 'maintain' check (goal_type in ('lose', 'gain', 'maintain')),
  target_weight_kg numeric,
  target_calories numeric,
  target_protein_g numeric,
  target_carbs_g numeric,
  target_fat_g numeric,
  rate_per_week_kg numeric default 0.5,
  height_cm numeric,
  age integer,
  sex text check (sex in ('male', 'female')),
  activity_level text default 'moderate' check (activity_level in ('sedentary', 'light', 'moderate', 'active', 'very_active')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Add profile fields for Phase 2
alter table public.profiles add column if not exists height_cm numeric;
alter table public.profiles add column if not exists age integer;
alter table public.profiles add column if not exists sex text check (sex in ('male', 'female'));

-- Indexes
create index weight_logs_user_date_idx on public.weight_logs(user_id, logged_at);
create index tdee_snapshots_user_date_idx on public.tdee_snapshots(user_id, snapshot_date);

-- RLS
alter table public.weight_logs enable row level security;
alter table public.tdee_snapshots enable row level security;
alter table public.user_goals enable row level security;

-- Weight logs RLS
create policy "Users can view own weight logs" on public.weight_logs for select using (auth.uid() = user_id);
create policy "Users can insert own weight logs" on public.weight_logs for insert with check (auth.uid() = user_id);
create policy "Users can update own weight logs" on public.weight_logs for update using (auth.uid() = user_id);
create policy "Users can delete own weight logs" on public.weight_logs for delete using (auth.uid() = user_id);

-- TDEE snapshots RLS
create policy "Users can view own tdee snapshots" on public.tdee_snapshots for select using (auth.uid() = user_id);
create policy "Users can insert own tdee snapshots" on public.tdee_snapshots for insert with check (auth.uid() = user_id);
create policy "Users can update own tdee snapshots" on public.tdee_snapshots for update using (auth.uid() = user_id);

-- User goals RLS
create policy "Users can view own goals" on public.user_goals for select using (auth.uid() = user_id);
create policy "Users can insert own goals" on public.user_goals for insert with check (auth.uid() = user_id);
create policy "Users can update own goals" on public.user_goals for update using (auth.uid() = user_id);

-- Updated_at triggers
create trigger user_goals_updated_at before update on public.user_goals for each row execute function public.update_updated_at();
