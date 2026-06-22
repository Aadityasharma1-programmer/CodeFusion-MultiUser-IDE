-- Create member_codes table
CREATE TABLE IF NOT EXISTS public.member_codes (
  code        text primary key,
  user_id     uuid references auth.users(id) on delete cascade,
  username    text not null,
  avatar_url  text,
  status      text default 'online',
  created_at  timestamptz default now()
);

-- Enable RLS
ALTER TABLE public.member_codes ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "member_codes_public_read" ON public.member_codes FOR SELECT USING (true);
CREATE POLICY "member_codes_own_write" ON public.member_codes FOR ALL USING ((select auth.uid()) = user_id);
CREATE POLICY "member_codes_own_insert" ON public.member_codes FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "member_codes_own_update" ON public.member_codes FOR UPDATE USING ((select auth.uid()) = user_id);
