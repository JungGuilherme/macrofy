-- Create app role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'aai', 'cliente');

-- Create user_roles table (following security best practices - roles in separate table)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'aai',
  UNIQUE (user_id, role)
);

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create recommendations table
CREATE TABLE public.recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  product_code TEXT,
  category TEXT,
  status TEXT CHECK (status IN ('em_oferta', 'ativa', 'monitoramento', 'encerrada')) DEFAULT 'ativa',
  risk_level TEXT CHECK (risk_level IN ('baixo', 'medio', 'alto')) DEFAULT 'medio',
  profile_fit TEXT[] DEFAULT ARRAY['moderado'],
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  executive_summary TEXT,
  thesis TEXT,
  risks TEXT,
  client_explanation TEXT,
  is_published BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create recommendation_materials table
CREATE TABLE public.recommendation_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recommendation_id UUID REFERENCES public.recommendations(id) ON DELETE CASCADE NOT NULL,
  type TEXT CHECK (type IN ('pdf', 'onepager', 'link')) NOT NULL,
  label TEXT NOT NULL,
  url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create reports table
CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  type TEXT CHECK (type IN ('carta_mensal', 'relatorio', 'morning_call', 'nota')) DEFAULT 'relatorio',
  theme TEXT,
  author TEXT,
  summary TEXT,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  pdf_url TEXT,
  is_published BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create articles table
CREATE TABLE public.articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  subtitle TEXT,
  body TEXT,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  author TEXT,
  read_time INTEGER DEFAULT 5,
  is_published BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create house_alerts table
CREATE TABLE public.house_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  text TEXT NOT NULL,
  priority INTEGER DEFAULT 2,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create economic_calendar table
CREATE TABLE public.economic_calendar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_date DATE NOT NULL,
  event_time TEXT,
  title TEXT NOT NULL,
  region TEXT,
  impact TEXT CHECK (impact IN ('baixo', 'medio', 'alto')) DEFAULT 'medio',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create favorites table
CREATE TABLE public.favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  item_type TEXT CHECK (item_type IN ('recommendation', 'report', 'article')) NOT NULL,
  item_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE (user_id, item_type, item_id)
);

-- Create recents table
CREATE TABLE public.recents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  item_type TEXT CHECK (item_type IN ('recommendation', 'report', 'article')) NOT NULL,
  item_id UUID NOT NULL,
  last_opened_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create internal_notes table
CREATE TABLE public.internal_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  recommendation_id UUID REFERENCES public.recommendations(id) ON DELETE CASCADE NOT NULL,
  note TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create dashboard_embeds table
CREATE TABLE public.dashboard_embeds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope TEXT CHECK (scope IN ('overview', 'brasil', 'global', 'mercado')) NOT NULL,
  name TEXT,
  embed_html TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS on all tables
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendation_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.house_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.economic_calendar ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.internal_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dashboard_embeds ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check user role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to get user's role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- Create trigger function to create profile and role on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', NEW.email));
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'aai');
  
  RETURN NEW;
END;
$$;

-- Create trigger on auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid());

-- RLS Policies for recommendations
CREATE POLICY "Anyone authenticated can view published recommendations"
  ON public.recommendations FOR SELECT
  TO authenticated
  USING (is_published = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage recommendations"
  ON public.recommendations FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for recommendation_materials
CREATE POLICY "Anyone authenticated can view materials for published recommendations"
  ON public.recommendation_materials FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.recommendations r 
      WHERE r.id = recommendation_id 
      AND (r.is_published = true OR public.has_role(auth.uid(), 'admin'))
    )
  );

CREATE POLICY "Admins can manage recommendation materials"
  ON public.recommendation_materials FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for reports
CREATE POLICY "Anyone authenticated can view published reports"
  ON public.reports FOR SELECT
  TO authenticated
  USING (is_published = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage reports"
  ON public.reports FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for articles
CREATE POLICY "Anyone authenticated can view published articles"
  ON public.articles FOR SELECT
  TO authenticated
  USING (is_published = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage articles"
  ON public.articles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for house_alerts
CREATE POLICY "Anyone authenticated can view active alerts"
  ON public.house_alerts FOR SELECT
  TO authenticated
  USING (is_active = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage alerts"
  ON public.house_alerts FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for economic_calendar
CREATE POLICY "Anyone authenticated can view calendar"
  ON public.economic_calendar FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage calendar"
  ON public.economic_calendar FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for favorites
CREATE POLICY "Users can view own favorites"
  ON public.favorites FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own favorites"
  ON public.favorites FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own favorites"
  ON public.favorites FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- RLS Policies for recents
CREATE POLICY "Users can view own recents"
  ON public.recents FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own recents"
  ON public.recents FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own recents"
  ON public.recents FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own recents"
  ON public.recents FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- RLS Policies for internal_notes
CREATE POLICY "Users can view own notes"
  ON public.internal_notes FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own notes"
  ON public.internal_notes FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own notes"
  ON public.internal_notes FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own notes"
  ON public.internal_notes FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- RLS Policies for dashboard_embeds
CREATE POLICY "Anyone authenticated can view active embeds"
  ON public.dashboard_embeds FOR SELECT
  TO authenticated
  USING (is_active = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage embeds"
  ON public.dashboard_embeds FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_recommendations_updated_at
  BEFORE UPDATE ON public.recommendations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_articles_updated_at
  BEFORE UPDATE ON public.articles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();