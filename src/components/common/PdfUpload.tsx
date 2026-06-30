import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Upload, FileText, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface PdfUploadProps {
  currentUrl: string | null;
  onUploaded: (url: string) => void;
  onRemoved: () => void;
  folder?: string;
}

export function PdfUpload({ currentUrl, onUploaded, onRemoved, folder = 'reports' }: PdfUploadProps) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast.error('Apenas arquivos PDF são permitidos');
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      toast.error('Arquivo muito grande (máx. 20MB)');
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, file, { contentType: 'application/pdf' });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('documents')
        .getPublicUrl(fileName);

      onUploaded(urlData.publicUrl);
      toast.success('PDF enviado com sucesso');
    } catch (err: any) {
      toast.error('Erro ao enviar PDF', { description: err.message });
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const fileName = currentUrl ? decodeURIComponent(currentUrl.split('/').pop() || '') : null;

  return (
    <div className="space-y-2">
      {currentUrl ? (
        <div className="flex items-center gap-2 p-2 rounded-lg border border-border bg-muted/50">
          <FileText className="h-4 w-4 text-primary flex-shrink-0" />
          <a
            href={currentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary hover:underline truncate flex-1"
          >
            {fileName}
          </a>
          <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={onRemoved}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      ) : (
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            type="file"
            accept=".pdf"
            onChange={handleUpload}
            disabled={uploading}
            className="cursor-pointer"
          />
          {uploading && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mt-2" />}
        </div>
      )}
    </div>
  );
}
