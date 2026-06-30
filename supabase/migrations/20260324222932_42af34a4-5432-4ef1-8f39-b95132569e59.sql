
CREATE TABLE public.feedback_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  user_name text,
  subject text NOT NULL,
  message text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.feedback_suggestions ENABLE ROW LEVEL SECURITY;

-- Users can insert their own feedback
CREATE POLICY "Users can insert own feedback"
  ON public.feedback_suggestions
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Admins can view all feedback
CREATE POLICY "Admins can view all feedback"
  ON public.feedback_suggestions
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Admins can update (mark as read)
CREATE POLICY "Admins can update feedback"
  ON public.feedback_suggestions
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Admins can delete feedback
CREATE POLICY "Admins can delete feedback"
  ON public.feedback_suggestions
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
