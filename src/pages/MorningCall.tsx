import { sanitizeHtml } from "@/lib/sanitize";
import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Coffee, Save, Edit, X, Youtube, Eye, EyeOff } from "lucide-react";
import { GlobalFuturesWatchlist } from "@/components/markets/GlobalFuturesWatchlist";
import { RichTextEditor } from "@/components/editor/RichTextEditor";
import { useMorningCall } from "@/hooks/useMorningCall";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

function extractYoutubeEmbedUrl(url: string): string | null {
  if (!url) return null;
  try {
    let videoId: string | null = null;
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtube.com")) {
      videoId = parsed.searchParams.get("v");
    } else if (parsed.hostname === "youtu.be") {
      videoId = parsed.pathname.slice(1);
    } else if (parsed.hostname.includes("youtube.com") && parsed.pathname.includes("/embed/")) {
      videoId = parsed.pathname.split("/embed/")[1]?.split("?")[0];
    }
    return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
  } catch {
    return null;
  }
}

export default function MorningCall() {
  const { role } = useAuth();
  const isAdmin = role === "admin";
  const { todaysMorningCall, isLoading, saveMorningCall } = useMorningCall();

  const [isEditing, setIsEditing] = useState(false);
  const [showSummary, setShowSummary] = useState(() => {
    const stored = localStorage.getItem("mc_show_summary");
    return stored === null ? true : stored === "true";
  });
  const [title, setTitle] = useState("Morning Call");
  const [contentHtml, setContentHtml] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [isPublished, setIsPublished] = useState(false);
  const [publishedDate, setPublishedDate] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  });

  const toggleSummary = () => {
    setShowSummary((prev) => {
      const next = !prev;
      localStorage.setItem("mc_show_summary", String(next));
      return next;
    });
  };

  useEffect(() => {
    if (todaysMorningCall) {
      setTitle(todaysMorningCall.title);
      setContentHtml(todaysMorningCall.content_html || "");
      setVideoUrl(todaysMorningCall.video_url || "");
      setIsPublished(todaysMorningCall.is_published);
      setPublishedDate(todaysMorningCall.published_date);
    }
  }, [todaysMorningCall]);

  const handleSave = () => {
    saveMorningCall.mutate(
      {
        id: todaysMorningCall?.id,
        title,
        content_html: contentHtml,
        video_url: videoUrl,
        published_date: publishedDate,
        is_published: isPublished,
      },
      {
        onSuccess: () => {
          setIsEditing(false);
        },
      }
    );
  };

  const handleCancel = () => {
    if (todaysMorningCall) {
      setTitle(todaysMorningCall.title);
      setContentHtml(todaysMorningCall.content_html || "");
      setVideoUrl(todaysMorningCall.video_url || "");
      setIsPublished(todaysMorningCall.is_published);
    }
    setIsEditing(false);
  };

  const embedUrl = useMemo(() => extractYoutubeEmbedUrl(videoUrl), [videoUrl]);

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-up">
        <div className="flex items-center gap-3">
          <Skeleton className="h-6 w-6" />
          <Skeleton className="h-8 w-48" />
        </div>
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  // Edit mode for admin
  if (isAdmin && isEditing) {
    return (
      <div className="space-y-6 animate-fade-up">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Coffee className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-semibold text-foreground">
              {todaysMorningCall ? "Editar" : "Criar"} Morning Call
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleCancel}>
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saveMorningCall.isPending}>
              <Save className="h-4 w-4 mr-2" />
              Salvar
            </Button>
          </div>
        </div>

        {/* Meta fields */}
        <Card>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Título</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Morning Call"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">Data</Label>
                <Input
                  id="date"
                  type="date"
                  value={publishedDate}
                  onChange={(e) => setPublishedDate(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-3 pt-6">
                <Switch
                  id="published"
                  checked={isPublished}
                  onCheckedChange={setIsPublished}
                />
                <Label htmlFor="published">Publicado</Label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Texto do Morning Call */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Coffee className="h-4 w-4 text-primary" />
              Texto do Morning Call
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RichTextEditor content={contentHtml} onChange={setContentHtml} />
          </CardContent>
        </Card>

        {/* Link do vídeo */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Youtube className="h-4 w-4 text-destructive" />
              Vídeo do YouTube
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
            />
            {embedUrl && (
              <div className="aspect-video rounded-lg overflow-hidden border border-border">
                <iframe
                  src={embedUrl}
                  title="YouTube Preview"
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            )}
          </CardContent>
        </Card>

        <GlobalFuturesWatchlist />
      </div>
    );
  }

  // View mode
  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Coffee className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-semibold text-foreground">Morning Call</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={toggleSummary}>
            {showSummary ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
            {showSummary ? "Ocultar resumo" : "Mostrar resumo"}
          </Button>
          {isAdmin && (
            <Button onClick={() => setIsEditing(true)}>
              <Edit className="h-4 w-4 mr-2" />
              {todaysMorningCall ? "Editar" : "Criar"} Morning Call
            </Button>
          )}
        </div>
      </div>

      {todaysMorningCall && todaysMorningCall.is_published ? (
        <>
          {/* Grid: Texto à esquerda (opcional), Vídeo + Futuros à direita */}
          <div className={showSummary ? "grid grid-cols-1 lg:grid-cols-2 gap-6" : "grid grid-cols-1 gap-6"}>
            {/* Texto */}
            {showSummary && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center justify-between">
                    <span>{todaysMorningCall.title}</span>
                    <span className="text-sm font-normal text-muted-foreground">
                      {(() => {
                        const [y, m, d] = todaysMorningCall.published_date.split('-').map(Number);
                        return format(new Date(y, m - 1, d), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
                      })()}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div
                    className="prose prose-sm sm:prose max-w-none"
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(todaysMorningCall.content_html) }}
                  />
                </CardContent>
              </Card>
            )}

            {/* Coluna direita: Vídeo + Futuros */}
            <div className="flex flex-col gap-6">
              {/* Vídeo */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Youtube className="h-4 w-4 text-destructive" />
                    Vídeo
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {todaysMorningCall.video_url && extractYoutubeEmbedUrl(todaysMorningCall.video_url) ? (
                    <div className="aspect-video rounded-lg overflow-hidden">
                      <iframe
                        src={extractYoutubeEmbedUrl(todaysMorningCall.video_url)!}
                        title="Morning Call Video"
                        className="w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-12">
                      Nenhum vídeo adicionado.
                    </p>
                  )}
                </CardContent>
              </Card>

              <GlobalFuturesWatchlist />
            </div>
          </div>
        </>
      ) : (
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground text-center py-8">
              {isAdmin
                ? "Nenhum Morning Call para hoje. Clique em 'Criar Morning Call' para adicionar."
                : "Nenhum Morning Call disponível para hoje."}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
