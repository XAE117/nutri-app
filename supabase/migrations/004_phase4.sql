-- Phase 4: Coaching Reviews

create table public.coaching_reviews (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  week_start date not null,
  week_end date not null,
  summary text not null,
  insights jsonb default '[]',
  recommendations jsonb default '[]',
  metrics jsonb default '{}',
  created_at timestamptz default now()
);

-- Index
create index coaching_reviews_user_date_idx on public.coaching_reviews(user_id, week_start desc);

-- RLS
alter table public.coaching_reviews enable row level security;

create policy "Users can view own coaching reviews" on public.coaching_reviews for select using (auth.uid() = user_id);
create policy "Users can insert own coaching reviews" on public.coaching_reviews for insert with check (auth.uid() = user_id);

-- Add onboarding_complete flag to profiles
alter table public.profiles add column if not exists onboarding_complete boolean default false;
