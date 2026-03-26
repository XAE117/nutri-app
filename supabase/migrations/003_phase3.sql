-- Phase 3: AI Memory + Semantic State

-- Enable pgvector extension
create extension if not exists vector with schema extensions;

-- AI memory episodes (episodic memory from meal interactions)
create table public.ai_memory_episodes (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  episode_type text not null default 'meal' check (episode_type in ('meal', 'weight', 'coaching', 'goal_change')),
  content text not null,
  embedding vector(1536),
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

-- AI semantic state (one living JSON per user)
create table public.ai_semantic_state (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null unique,
  state jsonb not null default '{}',
  version integer not null default 1,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Indexes
create index ai_memory_episodes_user_idx on public.ai_memory_episodes(user_id, created_at desc);
create index ai_memory_episodes_embedding_idx on public.ai_memory_episodes
  using hnsw (embedding vector_cosine_ops) with (m = 16, ef_construction = 64);

-- RLS
alter table public.ai_memory_episodes enable row level security;
alter table public.ai_semantic_state enable row level security;

create policy "Users can view own memory episodes" on public.ai_memory_episodes for select using (auth.uid() = user_id);
create policy "Users can insert own memory episodes" on public.ai_memory_episodes for insert with check (auth.uid() = user_id);
create policy "Users can delete own memory episodes" on public.ai_memory_episodes for delete using (auth.uid() = user_id);

create policy "Users can view own semantic state" on public.ai_semantic_state for select using (auth.uid() = user_id);
create policy "Users can insert own semantic state" on public.ai_semantic_state for insert with check (auth.uid() = user_id);
create policy "Users can update own semantic state" on public.ai_semantic_state for update using (auth.uid() = user_id);

-- Updated_at trigger
create trigger ai_semantic_state_updated_at before update on public.ai_semantic_state for each row execute function public.update_updated_at();

-- Cosine similarity search function
create or replace function public.match_episodes(
  query_embedding vector(1536),
  match_user_id uuid,
  match_count int default 5,
  match_threshold float default 0.7
)
returns table (
  id uuid,
  content text,
  metadata jsonb,
  similarity float
)
language sql stable
as $$
  select
    ai_memory_episodes.id,
    ai_memory_episodes.content,
    ai_memory_episodes.metadata,
    1 - (ai_memory_episodes.embedding <=> query_embedding) as similarity
  from ai_memory_episodes
  where ai_memory_episodes.user_id = match_user_id
    and ai_memory_episodes.embedding is not null
    and 1 - (ai_memory_episodes.embedding <=> query_embedding) > match_threshold
  order by ai_memory_episodes.embedding <=> query_embedding
  limit match_count;
$$;
