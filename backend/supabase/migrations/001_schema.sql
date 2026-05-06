-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Profiles Table (extends auth.users)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  display_name TEXT,
  current_level INTEGER DEFAULT 40,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- 2. Questions Table
CREATE TABLE public.questions (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL, -- 'mcq' or 'pronunciation'
  skill TEXT NOT NULL,
  band INTEGER NOT NULL,
  difficulty_level INTEGER, -- optional fine-grained level
  content JSONB NOT NULL, -- flexible specs: question, gujaratiText, options, answer, answerGujarati, explanation, pronunciationTarget, audio_url
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
-- Everyone can read questions
CREATE POLICY "Anyone can read questions" ON public.questions FOR SELECT USING (true);

-- 3. Placement Questions Table
CREATE TABLE public.placement_questions (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  skill TEXT NOT NULL,
  band INTEGER NOT NULL,
  content JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.placement_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read placement questions" ON public.placement_questions FOR SELECT USING (true);

-- 4. User Sessions Table
CREATE TABLE public.user_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  start_level INTEGER NOT NULL,
  end_level INTEGER,
  total_questions INTEGER DEFAULT 0,
  correct_answers INTEGER DEFAULT 0,
  accuracy NUMERIC DEFAULT 0,
  duration_seconds INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active', -- 'active' or 'completed'
  weak_skill TEXT,
  insight TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own sessions" ON public.user_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own sessions" ON public.user_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own sessions" ON public.user_sessions FOR UPDATE USING (auth.uid() = user_id);

-- 5. Session Answers Table
CREATE TABLE public.session_answers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES public.user_sessions(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL,
  skill TEXT NOT NULL,
  band INTEGER NOT NULL,
  question_type TEXT NOT NULL,
  correct BOOLEAN NOT NULL,
  level_before INTEGER NOT NULL,
  level_after INTEGER NOT NULL,
  answer_data JSONB, -- store what they answered, transcript etc.
  answered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.session_answers ENABLE ROW LEVEL SECURITY;
-- For RLS, we need to join with user_sessions or just rely on the application logic for now. 
-- Since we are moving logic to edge functions, the edge function will bypass RLS if it uses the service_role key.
-- But let's add a basic policy anyway. We can do it via a subquery.
CREATE POLICY "Users can read own answers" ON public.session_answers FOR SELECT 
  USING (EXISTS (SELECT 1 FROM public.user_sessions WHERE id = session_answers.session_id AND user_id = auth.uid()));

CREATE POLICY "Users can insert own answers" ON public.session_answers FOR INSERT 
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_sessions WHERE id = session_answers.session_id AND user_id = auth.uid()));

-- 6. User Learning State Table (Cross-device resume)
CREATE TABLE public.user_learning_state (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  current_level INTEGER NOT NULL DEFAULT 40,
  current_band INTEGER NOT NULL DEFAULT 2,
  last_session_id UUID REFERENCES public.user_sessions(id) ON DELETE SET NULL,
  state_data JSONB, -- streak, asked_question_ids, etc.
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.user_learning_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own state" ON public.user_learning_state FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own state" ON public.user_learning_state FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own state" ON public.user_learning_state FOR UPDATE USING (auth.uid() = user_id);

-- Create trigger for new user signup to insert profile and learning state automatically
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (new.id, new.raw_user_meta_data->>'full_name');

  INSERT INTO public.user_learning_state (user_id)
  VALUES (new.id);

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
