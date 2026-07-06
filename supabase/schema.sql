create table if not exists public.reading_attempts (
  id uuid primary key default gen_random_uuid(),
  problem jsonb not null,
  user_answer text not null,
  ai_feedback jsonb not null,
  score integer not null check (score >= 0 and score <= 100),
  created_at timestamptz not null default now()
);

create index if not exists reading_attempts_created_at_idx
  on public.reading_attempts (created_at desc);

create index if not exists reading_attempts_score_idx
  on public.reading_attempts (score);
