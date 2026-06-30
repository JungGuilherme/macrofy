import { useState, useRef } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { useCourses, useCourseLessons, type Course, type CourseLesson } from '@/hooks/useCourses';
import { useCourseFileUrl } from '@/hooks/useCourseFileUrl';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { DeleteConfirmDialog } from '@/components/common/DeleteConfirmDialog';
import {
  BookOpen, Plus, FileText, Video, Upload, Trash2, ExternalLink, Loader2,
  ArrowLeft, ImageIcon, Pencil, PlayCircle, Sparkles,
} from 'lucide-react';

export default function Videos() {
  const { courses, isLoading: coursesLoading, updateCourse, uploadCover } = useCourses();
  const { role } = useAuth();
  const isAdmin = role === 'admin';
  const [selectedCourse, setSelectedCourse] = useState<string | undefined>();
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);

  const activeCourse = selectedCourse ? courses.find((c) => c.id === selectedCourse) : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cursos"
        subtitle={activeCourse ? activeCourse.title : 'Trilhas de conhecimento — material e aulas'}
        breadcrumbs={
          activeCourse
            ? [{ label: 'Cursos' }, { label: activeCourse.title }]
            : [{ label: 'Cursos' }]
        }
      />

      {coursesLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : courses.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">Nenhum curso cadastrado.</div>
      ) : activeCourse ? (
        <div className="space-y-4">
          <Button variant="ghost" size="sm" onClick={() => setSelectedCourse(undefined)} className="gap-1.5">
            <ArrowLeft className="h-4 w-4" /> Voltar para cursos
          </Button>
          <CourseLessonsPanel courseId={activeCourse.id} isAdmin={isAdmin} />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {courses.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              onOpen={() => setSelectedCourse(course.id)}
              isAdmin={isAdmin}
              onEdit={() => setEditingCourse(course)}
            />
          ))}
        </div>
      )}

      {editingCourse && (
        <EditCourseDialog
          course={editingCourse}
          onClose={() => setEditingCourse(null)}
          onSave={async (updates, file) => {
            await updateCourse.mutateAsync({ id: editingCourse.id, ...updates });
            if (file) await uploadCover(editingCourse.id, file);
            setEditingCourse(null);
          }}
        />
      )}
    </div>
  );
}

function CourseCard({
  course, onOpen, isAdmin, onEdit,
}: { course: Course; onOpen: () => void; isAdmin: boolean; onEdit: () => void }) {
  const cover = useCourseFileUrl(course.cover_image_url);
  return (
    <div
      onClick={onOpen}
      className="group relative overflow-hidden rounded-2xl border border-border bg-card cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-primary/20 hover:border-primary/40"
    >
      {/* Cover */}
      <div className="relative h-44 overflow-hidden">
        {cover ? (
          <img
            src={cover}
            alt={course.title}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-primary/10 to-background flex items-center justify-center">
            <BookOpen className="h-14 w-14 text-primary/50" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-card via-card/40 to-transparent" />

        {/* Top-left badge */}
        <div className="absolute top-3 left-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-background/80 backdrop-blur-sm border border-border/50 text-[11px] font-medium text-foreground">
          <Sparkles className="h-3 w-3 text-primary" />
          Curso Macrofy
        </div>

        {/* Admin edit */}
        {isAdmin && (
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            className="absolute top-3 right-3 h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm border border-border/50 flex items-center justify-center text-foreground hover:bg-background transition-colors"
            title="Editar curso"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="p-5 space-y-3">
        <div>
          <h3 className="font-semibold text-lg leading-tight text-foreground line-clamp-2">{course.title}</h3>
          {course.description ? (
            <p className="mt-1.5 text-sm text-muted-foreground line-clamp-3">{course.description}</p>
          ) : (
            <p className="mt-1.5 text-sm text-muted-foreground italic">Sem descrição ainda.</p>
          )}
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-border/60">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <FileText className="h-3.5 w-3.5" /> {course.lesson_count ?? 0} aula{(course.lesson_count ?? 0) === 1 ? '' : 's'}
            </span>
            <span className="inline-flex items-center gap-1">
              <Video className="h-3.5 w-3.5" /> Em breve
            </span>
          </div>
          <span className="inline-flex items-center gap-1 text-xs font-medium text-primary group-hover:gap-2 transition-all">
            Acessar <PlayCircle className="h-4 w-4" />
          </span>
        </div>
      </div>
    </div>
  );
}

function EditCourseDialog({
  course, onClose, onSave,
}: {
  course: Course;
  onClose: () => void;
  onSave: (updates: Partial<Course>, coverFile?: File) => Promise<void>;
}) {
  const [title, setTitle] = useState(course.title);
  const [description, setDescription] = useState(course.description ?? '');
  const [file, setFile] = useState<File | null>(null);
  const initialPreview = useCourseFileUrl(course.cover_image_url);
  const [preview, setPreview] = useState<string | null>(null);
  const previewSrc = preview ?? initialPreview;
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (f: File) => {
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Editar curso</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div
            onClick={() => fileRef.current?.click()}
            className="relative h-36 rounded-lg border-2 border-dashed border-border hover:border-primary/50 cursor-pointer overflow-hidden bg-muted/30"
          >
            {previewSrc ? (
              <img src={previewSrc} alt="" className="absolute inset-0 w-full h-full object-cover" />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground gap-2">
                <ImageIcon className="h-8 w-8" />
                <span className="text-xs">Clique para enviar capa</span>
              </div>
            )}
            <div className="absolute inset-0 bg-black/0 hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 hover:opacity-100">
              <span className="text-white text-xs font-medium">Trocar imagem</span>
            </div>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Título</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Descrição</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="O que o aluno verá neste curso?"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            onClick={async () => {
              setSaving(true);
              try {
                await onSave({ title: title.trim(), description: description.trim() || null }, file ?? undefined);
              } finally {
                setSaving(false);
              }
            }}
            disabled={!title.trim() || saving}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CourseLessonsPanel({ courseId, isAdmin }: { courseId: string; isAdmin: boolean }) {
  const { lessons, isLoading, addLesson, deleteLesson, uploadPdf } = useCourseLessons(courseId);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [uploading, setUploading] = useState<string | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<string | null>(null);
  const [lessonTab, setLessonTab] = useState<'material' | 'video'>('material');
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingLessonRef = useRef<string | null>(null);

  const handleAdd = async () => {
    if (!newTitle.trim()) return;
    await addLesson.mutateAsync({ course_id: courseId, title: newTitle.trim() });
    setNewTitle('');
    setShowAddDialog(false);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const lessonId = pendingLessonRef.current;
    if (!file || !lessonId) return;
    setUploading(lessonId);
    try {
      await uploadPdf(lessonId, file);
    } catch {
      // toast handled in hook
    } finally {
      setUploading(null);
      pendingLessonRef.current = null;
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const triggerUpload = (lessonId: string) => {
    pendingLessonRef.current = lessonId;
    fileInputRef.current?.click();
  };

  const activeLesson = lessons.find((l) => l.id === selectedLesson);

  return (
    <div className="space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf"
        className="hidden"
        onChange={handleFileChange}
      />

      {isAdmin && (
        <div className="flex justify-end">
          <Button size="sm" onClick={() => setShowAddDialog(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Adicionar Aula
          </Button>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : lessons.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          Nenhuma aula adicionada ainda.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
          {/* Lesson list */}
          <div className="space-y-2">
            {lessons.map((lesson, idx) => (
              <button
                key={lesson.id}
                onClick={() => { setSelectedLesson(lesson.id); setLessonTab('material'); }}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${
                  selectedLesson === lesson.id
                    ? 'bg-primary/10 border-primary/30 text-foreground'
                    : 'bg-card border-border hover:bg-muted/50 text-foreground'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary flex-shrink-0">
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{lesson.title}</p>
                    <div className="flex gap-2 mt-1">
                      {lesson.pdf_url && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                          <FileText className="h-3 w-3" /> PDF
                        </span>
                      )}
                      {lesson.video_url && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                          <Video className="h-3 w-3" /> Vídeo
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Lesson detail */}
          {activeLesson ? (
            <div className="bg-card rounded-xl border p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-foreground">{activeLesson.title}</h3>
                {isAdmin && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      onClick={() => triggerUpload(activeLesson.id)}
                      disabled={uploading === activeLesson.id}
                    >
                      {uploading === activeLesson.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Upload className="h-3.5 w-3.5" />
                      )}
                      {activeLesson.pdf_url ? 'Trocar PDF' : 'Enviar PDF'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeleteTarget(activeLesson.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </div>

              <Tabs value={lessonTab} onValueChange={(v) => setLessonTab(v as 'material' | 'video')}>
                <TabsList>
                  <TabsTrigger value="material" className="gap-1.5">
                    <FileText className="h-3.5 w-3.5" /> Material
                  </TabsTrigger>
                  <TabsTrigger value="video" className="gap-1.5">
                    <Video className="h-3.5 w-3.5" /> Vídeo
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="material" className="mt-4">
                  {activeLesson.pdf_url ? (
                    <LessonPdfViewer lesson={activeLesson} />
                  ) : (
                    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
                      <FileText className="h-10 w-10 opacity-40" />
                      <p className="text-sm">Nenhum material adicionado ainda.</p>
                      {isAdmin && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => triggerUpload(activeLesson.id)}
                          className="gap-1.5"
                        >
                          <Upload className="h-3.5 w-3.5" /> Enviar PDF
                        </Button>
                      )}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="video" className="mt-4">
                  <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
                    <Video className="h-10 w-10 opacity-40" />
                    <p className="text-sm">Vídeo ainda não disponível para esta aula.</p>
                    <span className="text-xs">Em breve</span>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          ) : (
            <div className="bg-card rounded-xl border flex items-center justify-center py-16 text-muted-foreground">
              <p className="text-sm">Selecione uma aula para ver o conteúdo</p>
            </div>
          )}
        </div>
      )}

      {/* Add lesson dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Aula</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Título da aula"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancelar</Button>
            <Button onClick={handleAdd} disabled={!newTitle.trim() || addLesson.isPending}>
              {addLesson.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Adicionar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Excluir aula"
        description="Tem certeza que deseja excluir esta aula?"
        onConfirm={() => {
          if (deleteTarget) {
            deleteLesson.mutate(deleteTarget);
            if (selectedLesson === deleteTarget) setSelectedLesson(null);
            setDeleteTarget(null);
          }
        }}
      />
    </div>
  );
}

function LessonPdfViewer({ lesson }: { lesson: CourseLesson }) {
  const url = useCourseFileUrl(lesson.pdf_url);
  if (!url) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando PDF...
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
        >
          <ExternalLink className="h-4 w-4" /> Abrir PDF em nova aba
        </a>
      </div>
      <iframe
        src={url}
        className="w-full rounded-lg border"
        style={{ height: '70vh' }}
        title={lesson.title}
      />
    </div>
  );
}
