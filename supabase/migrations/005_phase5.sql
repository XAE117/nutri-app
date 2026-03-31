-- Phase 5: Recipes, Household Sharing, Rate Limiting
-- Run in Supabase SQL Editor

-- Meal Templates (saved recipes)
create table public.meal_templates (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  description text,
  meal_type text,
  calories integer,
  protein_g numeric(6,1),
  carbs_g numeric(6,1),
  fat_g numeric(6,1),
  fiber_g numeric(6,1),
  items jsonb default '[]',
  use_count integer default 0,
  last_used_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index meal_templates_user_idx on public.meal_templates(user_id);
alter table public.meal_templates enable row level security;

create policy "Users can view own templates" on public.meal_templates
  for select using (auth.uid() = user_id);
create policy "Users can insert own templates" on public.meal_templates
  for insert with check (auth.uid() = user_id);
create policy "Users can update own templates" on public.meal_templates
  for update using (auth.uid() = user_id);
create policy "Users can delete own templates" on public.meal_templates
  for delete using (auth.uid() = user_id);

create trigger set_meal_templates_updated_at
  before update on public.meal_templates
  for each row execute function public.update_updated_at();

-- Household sharing
create table public.household_members (
  id uuid default uuid_generate_v4() primary key,
  owner_id uuid references public.profiles(id) on delete cascade not null,
  member_id uuid references public.profiles(id) on delete cascade not null,
  member_email text not null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  can_view_logs boolean default true,
  can_view_weight boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(owner_id, member_email)
);

create index household_members_owner_idx on public.household_members(owner_id);
create index household_members_member_idx on public.household_members(member_id);
alter table public.household_members enable row level security;

create policy "Owners can manage their household" on public.household_members
  for all using (auth.uid() = owner_id);
create policy "Members can view invites to them" on public.household_members
  for select using (auth.uid() = member_id);
create policy "Members can update their own invite status" on public.household_members
  for update using (auth.uid() = member_id)
  with check (auth.uid() = member_id);

-- Shared food log view (members can see owner's food logs if accepted)
create or replace function public.get_shared_food_logs(p_viewer_id uuid, p_date_start text, p_date_end text)
returns setof public.food_logs
language sql
security definer
stable
as $$
  select fl.*
  from public.food_logs fl
  inner join public.household_members hm
    on hm.owner_id = fl.user_id
    and hm.member_id = p_viewer_id
    and hm.status = 'accepted'
    and hm.can_view_logs = true
  where fl.logged_at >= p_date_start::timestamptz
    and fl.logged_at < p_date_end::timestamptz
  order by fl.logged_at desc;
$$;

create trigger set_household_members_updated_at
  before update on public.household_members
  for each row execute function public.update_updated_at();
