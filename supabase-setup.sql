-- 百岳登頂簿：Supabase 資料庫設定
-- 用法：Supabase 後台 → SQL Editor → New query → 整段貼上 → Run

-- 1) 每個人的登頂簿（一人一列）
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  nick        text not null default '' check (char_length(nick) <= 20),
  peaks       jsonb not null default '{}'::jsonb check (pg_column_size(peaks) < 32000),
  updated_at  timestamptz not null default now()
);

-- 2) 山友打氣（誰、給誰、哪一座山、按讚與留言）
create table if not exists public.cheers (
  author      uuid not null references auth.users (id) on delete cascade,
  target      uuid not null references public.profiles (id) on delete cascade,
  rank        int  not null check (rank between 1 and 100),
  liked       boolean not null default false,
  msg         text not null default '' check (char_length(msg) <= 40),
  updated_at  timestamptz not null default now(),
  primary key (author, target, rank),
  check (author <> target)
);

-- 3) 權限：大家都能看，每個人只能改自己的
alter table public.profiles enable row level security;
alter table public.cheers   enable row level security;

drop policy if exists "profiles: everyone reads"  on public.profiles;
drop policy if exists "profiles: insert own"      on public.profiles;
drop policy if exists "profiles: update own"      on public.profiles;
drop policy if exists "profiles: delete own"      on public.profiles;
create policy "profiles: everyone reads" on public.profiles for select to authenticated using (true);
create policy "profiles: insert own"     on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "profiles: update own"     on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);
create policy "profiles: delete own"     on public.profiles for delete to authenticated using (auth.uid() = id);

drop policy if exists "cheers: everyone reads" on public.cheers;
drop policy if exists "cheers: insert own"     on public.cheers;
drop policy if exists "cheers: update own"     on public.cheers;
drop policy if exists "cheers: delete own"     on public.cheers;
create policy "cheers: everyone reads" on public.cheers for select to authenticated using (true);
create policy "cheers: insert own"     on public.cheers for insert to authenticated with check (auth.uid() = author);
create policy "cheers: update own"     on public.cheers for update to authenticated using (auth.uid() = author) with check (auth.uid() = author);
create policy "cheers: delete own"     on public.cheers for delete to authenticated using (auth.uid() = author);

-- 4) 即時更新：山友一登頂，大家畫面自動刷新
do $$ begin
  begin alter publication supabase_realtime add table public.profiles; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.cheers;   exception when duplicate_object then null; end;
end $$;
