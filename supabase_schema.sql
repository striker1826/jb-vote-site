-- ========================================================
-- JB Vote Site - Supabase SQL Schema
-- Copy and paste this script into your Supabase SQL Editor
-- ========================================================

-- 1. Create Polls Table
CREATE TABLE IF NOT EXISTS public.polls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    is_anonymous BOOLEAN DEFAULT true NOT NULL,
    start_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    end_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 2. Create Poll Options Table
CREATE TABLE IF NOT EXISTS public.poll_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    poll_id UUID REFERENCES public.polls(id) ON DELETE CASCADE NOT NULL,
    text VARCHAR(255) NOT NULL,
    link_url TEXT,
    vote_count INT DEFAULT 0 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);


-- 3. Create Votes Table (for tracking and preventing double voting)
CREATE TABLE IF NOT EXISTS public.votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    poll_id UUID REFERENCES public.polls(id) ON DELETE CASCADE NOT NULL,
    option_id UUID REFERENCES public.poll_options(id) ON DELETE CASCADE NOT NULL,
    user_identifier VARCHAR(255) NOT NULL, -- e.g., browser UUID or IP hash
    voter_name VARCHAR(100), -- Only used if is_anonymous = false
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE(poll_id, user_identifier)
);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;

-- 5. Set up RLS Policies (Allow public read & write for simplicity)
CREATE POLICY "Allow public read access to polls" ON public.polls FOR SELECT USING (true);
CREATE POLICY "Allow public insert access to polls" ON public.polls FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public read access to poll_options" ON public.poll_options FOR SELECT USING (true);
CREATE POLICY "Allow public insert access to poll_options" ON public.poll_options FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access to poll_options" ON public.poll_options FOR UPDATE USING (true);

CREATE POLICY "Allow public read access to votes" ON public.votes FOR SELECT USING (true);
CREATE POLICY "Allow public insert access to votes" ON public.votes FOR INSERT WITH CHECK (true);

-- 6. Trigger to increment option vote count automatically
CREATE OR REPLACE FUNCTION increment_option_vote_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.poll_options
    SET vote_count = vote_count + 1
    WHERE id = NEW.option_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_increment_vote ON public.votes;
CREATE TRIGGER trigger_increment_vote
AFTER INSERT ON public.votes
FOR EACH ROW EXECUTE FUNCTION increment_option_vote_count();
