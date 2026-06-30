import { useState } from "react";
import { MessageCircleQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function HelpFeedbackButton() {
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const { profile } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) {
      toast.error("Preencha todos os campos.");
      return;
    }

    setSending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Você precisa estar logado.");
        return;
      }

      const { error } = await supabase.from('feedback_suggestions' as any).insert({
        user_id: user.id,
        user_name: profile?.name || user.email,
        subject: subject.trim(),
        message: message.trim(),
      });

      if (error) throw error;

      toast.success("Mensagem enviada com sucesso! Obrigado pelo feedback.");
      setSubject("");
      setMessage("");
      setOpen(false);
    } catch {
      toast.error("Erro ao enviar. Tente novamente.");
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 rounded-full shadow-lg gap-2 px-5 py-3 h-auto bg-primary text-primary-foreground hover:bg-primary/90"
      >
        <MessageCircleQuestion className="h-5 w-5" />
        <span className="hidden sm:inline text-sm font-medium">Sugestões e Ajuda</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Sugestões e Ajuda</DialogTitle>
            <DialogDescription>
              Envie sua sugestão, dúvida ou reporte um problema. Responderemos o mais breve possível.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="feedback-subject">Assunto</Label>
              <Input
                id="feedback-subject"
                placeholder="Ex: Sugestão de melhoria, Bug, Dúvida..."
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                maxLength={100}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="feedback-message">Mensagem</Label>
              <Textarea
                id="feedback-message"
                placeholder="Descreva sua sugestão ou problema..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={1000}
                rows={5}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={sending}>
                {sending ? "Enviando..." : "Enviar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
