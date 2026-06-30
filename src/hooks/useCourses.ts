import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Course {
  id: string;
  title: string;
  description: string | null;
  display_order: number;
  created_at: string;
  cover_image_url: string | null;
  lesson_count?: number;
}

export interface CourseLesson {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  pdf_url: string | null;
  video_url: string | null;
  display_order: number;
  created_at: string;
}

export function useCourses() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const coursesQuery = useQuery({
    queryKey: ['courses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('*, course_lessons(count)')
        .order('display_order');
      if (error) throw error;
      return (data ?? []).map((c: any) => ({
        ...c,
        lesson_count: c.course_lessons?.[0]?.count ?? 0,
      })) as Course[];
    },
  });

  const updateCourse = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Course> & { id: string }) => {
      const { error } = await supabase.from('courses').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      toast({ title: 'Curso atualizado' });
    },
    onError: (e: any) => toast({ title: 'Erro ao atualizar curso', description: e.message, variant: 'destructive' }),
  });

  const uploadCover = async (courseId: string, file: File) => {
    const ext = file.name.split('.').pop();
    const path = `${courseId}/cover-${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from('course-files')
      .upload(path, file, { upsert: true, contentType: file.type });
    if (uploadError) {
      toast({ title: 'Erro ao enviar imagem', description: uploadError.message, variant: 'destructive' });
      throw uploadError;
    }
    // Store storage path; consumers resolve via signed URL
    await updateCourse.mutateAsync({ id: courseId, cover_image_url: path });
  };

  return {
    courses: coursesQuery.data ?? [],
    isLoading: coursesQuery.isLoading,
    updateCourse,
    uploadCover,
  };
}

export function useCourseLessons(courseId: string | undefined) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const lessonsQuery = useQuery({
    queryKey: ['course-lessons', courseId],
    queryFn: async () => {
      if (!courseId) return [];
      const { data, error } = await supabase
        .from('course_lessons')
        .select('*')
        .eq('course_id', courseId)
        .order('display_order');
      if (error) throw error;
      return data as CourseLesson[];
    },
    enabled: !!courseId,
  });

  const addLesson = useMutation({
    mutationFn: async (lesson: { course_id: string; title: string; description?: string }) => {
      const { data: existing } = await supabase
        .from('course_lessons')
        .select('display_order')
        .eq('course_id', lesson.course_id)
        .order('display_order', { ascending: false })
        .limit(1);
      const nextOrder = (existing?.[0]?.display_order ?? -1) + 1;

      const { error } = await supabase.from('course_lessons').insert({
        ...lesson,
        display_order: nextOrder,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course-lessons', courseId] });
      toast({ title: 'Aula adicionada com sucesso' });
    },
    onError: () => toast({ title: 'Erro ao adicionar aula', variant: 'destructive' }),
  });

  const updateLesson = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CourseLesson> & { id: string }) => {
      const { error } = await supabase.from('course_lessons').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course-lessons', courseId] });
    },
  });

  const deleteLesson = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('course_lessons').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course-lessons', courseId] });
      toast({ title: 'Aula removida' });
    },
    onError: () => toast({ title: 'Erro ao remover aula', variant: 'destructive' }),
  });

  const uploadPdf = async (lessonId: string, file: File) => {
    const ext = file.name.split('.').pop();
    const path = `${courseId}/${lessonId}/${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from('course-files')
      .upload(path, file, { upsert: true });
    if (uploadError) {
      toast({ title: 'Erro ao enviar PDF', description: uploadError.message, variant: 'destructive' });
      throw uploadError;
    }

    // Store storage path; consumers resolve via signed URL
    await updateLesson.mutateAsync({ id: lessonId, pdf_url: path });
    toast({ title: 'PDF enviado com sucesso' });
  };

  return {
    lessons: lessonsQuery.data ?? [],
    isLoading: lessonsQuery.isLoading,
    addLesson,
    updateLesson,
    deleteLesson,
    uploadPdf,
  };
}
