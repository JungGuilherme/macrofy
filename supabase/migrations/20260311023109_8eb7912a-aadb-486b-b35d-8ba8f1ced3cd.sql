
-- Courses table
CREATE TABLE public.courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  display_order integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view courses" ON public.courses
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage courses" ON public.courses
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'));

-- Course lessons table
CREATE TABLE public.course_lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  pdf_url text,
  video_url text,
  display_order integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.course_lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view lessons" ON public.course_lessons
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage lessons" ON public.course_lessons
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'));

-- Storage bucket for course PDFs
INSERT INTO storage.buckets (id, name, public) VALUES ('course-files', 'course-files', true);

CREATE POLICY "Anyone can view course files" ON storage.objects
  FOR SELECT USING (bucket_id = 'course-files');

CREATE POLICY "Admins can upload course files" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'course-files' AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete course files" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'course-files' AND has_role(auth.uid(), 'admin'));

-- Seed the two courses
INSERT INTO public.courses (title, description, display_order) VALUES
  ('Mercado de Capitais', 'Curso completo sobre mercado de capitais', 0),
  ('Economia 1', 'Fundamentos de economia', 1);
