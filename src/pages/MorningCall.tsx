import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Coffee, Save, Edit, X, Youtube } from "lucide-react";
import { GlobalFuturesWatchlist } from "@/components/markets/GlobalFuturesWatchlist";
import { useMorningCall } from "@/hooks/useMorningCall";
import { useRssFeeds, type RssFeedItem } from "@/hooks/useRssFeeds";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

// Hidden feed row maintained by scripts/sync-morning-call.mjs
const YT_FEED_NAME = "YouTube · Alta Vista";

function videoTimeAgo(pubDate: string): string {
  const d = new Date(pubDate);
  if (isNaN(d.getTime())) return "";
  const hours = Math.floor((Date.now() - d.getTime()) / 3_600_000);
  if (hours < 1) return "agora";
  if (hours < 24) return `há ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "ontem";
  if (days < 30) return `há ${days} dias`;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

function extractYoutubeEmbedUrl(url: string): string | null {
  if (!url) return null;
  try {
    let videoId: string | null = null;
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtube.com") && parsed.pathname.includes("/embed/")) {
      videoId = parsed.pathname.split("/embed/")[1]?.split("?")[0];
    } else if (parsed.hostname.includes("youtube.com")) {
      videoId = parsed.searchParams.get("v");
    } else if (parsed.hostname === "youtu.be") {
      videoId = parsed.pathname.slice(1);
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
  const { data: feeds = [] } = useRssFeeds();

  const [isEditing, setIsEditing] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<RssFeedItem | null>(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [isPublished, setIsPublished] = useState(true);
  const [publishedDate, setPublishedDate] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  });

  useEffect(() => {
    if (todaysMorningCall) {
      setVideoUrl(todaysMorningCall.video_url || "");
      setIsPublished(todaysMorningCall.is_published);
      setPublishedDate(todaysMorningCall.published_date);
    }
  }, [todaysMorningCall]);

  const handleSave = () => {
    saveMorningCall.mutate(
      {
        id: todaysMorningCall?.id,
        title: todaysMorningCall?.title || "Morning Call",
        content_html: todaysMorningCall?.content_html || "",
        video_url: videoUrl,
        published_date: publishedDate,
        is_published: isPublished,
      },
      { onSuccess: () => setIsEditing(false) }
    );
  };

  const channelVideos = useMemo(
    () => feeds.find((f) => f.name === YT_FEED_NAME)?.items ?? [],
    [feeds]
  );

  const playingUrl = isEditing
    ? videoUrl
    : selectedVideo?.link || todaysMorningCall?.video_url || "";

  const embedUrl = useMemo(() => extractYoutubeEmbedUrl(playingUrl), [playingUrl]);

  // Videos for the grid — everything except what's currently playing
  const gridVideos = useMemo(() => {
    const playingId = extractYoutubeEmbedUrl(playingUrl)?.split("/embed/")[1];
    return channelVideos.filter((v) => v.guid !== playingId).slice(0, 12);
  }, [channelVideos, playingUrl]);

  const dateLabel = useMemo(() => {
    if (!todaysMorningCall?.published_date) return null;
    const [y, m, d] = todaysMorningCall.published_date.split("-").map(Number);
    return format(new Date(y, m - 1, d), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  }, [todaysMorningCall?.published_date]);

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-up">
        <div className="flex items-center gap-3">
          <Skeleton className="h-6 w-6" />
          <Skeleton className="h-8 w-48" />
        </div>
        <Skeleton className="aspect-video w-full max-w-4xl mx-auto" />
      </div>
    );
  }

  const showVideo = embedUrl && (isEditing || todaysMorningCall?.is_published);

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <Coffee className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Morning Call</h1>
            {dateLabel && (
              <p className="text-sm text-muted-foreground capitalize">{dateLabel}</p>
            )}
          </div>
        </div>
        {isAdmin && !isEditing && (
          <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
            <Edit className="h-4 w-4 mr-2" />
            Editar
          </Button>
        )}
      </div>

      {/* Admin edit panel */}
      {isAdmin && isEditing && (
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_170px_auto] gap-4 items-end">
              <div className="space-y-2">
                <Label htmlFor="video-url" className="flex items-center gap-2">
                  <Youtube className="h-4 w-4 text-destructive" />
                  Link do vídeo
                </Label>
                <Input
                  id="video-url"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
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
              <div className="flex items-center gap-2 pb-2.5">
                <Switch id="published" checked={isPublished} onCheckedChange={setIsPublished} />
                <Label htmlFor="published">Publicado</Label>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={handleSave} disabled={saveMorningCall.isPending}>
                <Save className="h-4 w-4 mr-2" />
                Salvar
              </Button>
              <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              O vídeo é puxado automaticamente do canal Alta Vista Investimentos todo dia útil
              por volta das 8h20. Edite apenas para corrigir ou antecipar.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Video */}
      {showVideo ? (
        <div className="max-w-4xl mx-auto w-full space-y-2">
          <div className="aspect-video rounded-xl overflow-hidden border border-border shadow-lg">
            <iframe
              src={embedUrl}
              title="Morning Call"
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
          {selectedVideo && (
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <p className="text-sm font-medium text-foreground truncate">{selectedVideo.title}</p>
              <Button variant="outline" size="sm" onClick={() => setSelectedVideo(null)}>
                <Coffee className="h-3.5 w-3.5 mr-2" />
                Voltar ao Morning Call de hoje
              </Button>
            </div>
          )}
        </div>
      ) : (
        <Card>
          <CardContent className="py-16 text-center space-y-2">
            <Coffee className="h-10 w-10 text-muted-foreground/40 mx-auto" />
            <p className="text-sm text-muted-foreground">
              O Morning Call de hoje ainda não foi publicado. O vídeo chega todo dia útil
              por volta das 8h20.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Other channel videos */}
      {gridVideos.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Youtube className="h-4 w-4 text-destructive" />
            <h2 className="text-sm font-semibold text-foreground">Outros vídeos do canal</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {gridVideos.map((v) => (
              <button
                key={v.guid}
                onClick={() => {
                  setSelectedVideo(v);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className={cn(
                  "group text-left rounded-xl border bg-card overflow-hidden transition-colors",
                  "hover:border-primary/40"
                )}
              >
                <div className="aspect-video bg-muted overflow-hidden">
                  <img
                    src={v.imageUrl || `https://i3.ytimg.com/vi/${v.guid}/hqdefault.jpg`}
                    alt=""
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-200"
                  />
                </div>
                <div className="p-2.5">
                  <p className="text-xs font-medium text-foreground line-clamp-2 leading-snug group-hover:text-primary transition-colors">
                    {v.title}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-1">{videoTimeAgo(v.pubDate)}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Futures watchlist */}
      <GlobalFuturesWatchlist />
    </div>
  );
}
