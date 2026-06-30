import { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  useHouseAlerts, 
  useAllHouseAlerts,
  useCreateHouseAlert, 
  useUpdateHouseAlert, 
  useDeleteHouseAlert, 
  useReorderHouseAlert,
  HouseAlert, 
  AlertType, 
  TimeHint 
} from '@/hooks/useHouseAlerts';
import { useAuth } from '@/contexts/AuthContext';
import { HouseAlertForm } from '@/components/forms/HouseAlertForm';
import { DeleteConfirmDialog } from '@/components/common/DeleteConfirmDialog';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { 
  AlertCircle, 
  FileText, 
  Calendar, 
  TrendingUp, 
  Bell, 
  Pin, 
  ExternalLink, 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  Plus,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';

const typeConfig: Record<AlertType, { icon: typeof AlertCircle; colors: string; iconColor: string }> = {
  attention: {
    icon: AlertCircle,
    colors: 'border-l-warning bg-warning/5',
    iconColor: 'text-warning',
  },
  content: {
    icon: FileText,
    colors: 'border-l-success bg-success/5',
    iconColor: 'text-success',
  },
  event: {
    icon: Calendar,
    colors: 'border-l-primary bg-primary/5',
    iconColor: 'text-primary',
  },
  market: {
    icon: TrendingUp,
    colors: 'border-l-muted-foreground bg-muted/50',
    iconColor: 'text-muted-foreground',
  },
};

const timeHintLabels: Record<TimeHint, string> = {
  hoje: 'HOJE',
  amanha: 'AMANHÃ',
  semana: 'ESTA SEMANA',
};

interface AlertItemProps {
  alert: HouseAlert;
  isAdmin: boolean;
  isFirst: boolean;
  isLast: boolean;
  onEdit: (alert: HouseAlert, e: React.MouseEvent) => void;
  onDelete: (alert: HouseAlert, e: React.MouseEvent) => void;
  onMoveUp: (alert: HouseAlert, e: React.MouseEvent) => void;
  onMoveDown: (alert: HouseAlert, e: React.MouseEvent) => void;
}

function AlertItem({ alert, isAdmin, isFirst, isLast, onEdit, onDelete, onMoveUp, onMoveDown }: AlertItemProps) {
  const config = typeConfig[alert.type] || typeConfig.content;
  const Icon = config.icon;

  const isExternal = alert.url?.startsWith('http');
  const hasUrl = !!alert.url;

  const content = (
    <div
      className={cn(
        'flex gap-3 p-3 rounded-lg border-l-4 transition-colors',
        config.colors,
        hasUrl && 'hover:bg-accent/50 cursor-pointer'
      )}
    >
      <div className="flex items-start gap-2 flex-shrink-0">
        {alert.is_pinned && <Pin className="h-3 w-3 text-gold mt-0.5" />}
        <Icon className={cn('h-4 w-4 mt-0.5', config.iconColor)} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground leading-snug">
          {alert.time_hint && (
            <span className={cn('font-semibold mr-2', config.iconColor)}>
              {timeHintLabels[alert.time_hint]} —
            </span>
          )}
          {alert.title}
        </p>
      </div>
      {hasUrl && isExternal && (
        <ExternalLink className="h-3 w-3 text-muted-foreground flex-shrink-0 mt-1" />
      )}
      {isAdmin && (
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 -my-1"
            onClick={(e) => onMoveUp(alert, e)}
            disabled={isFirst}
          >
            <ChevronUp className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 -my-1"
            onClick={(e) => onMoveDown(alert, e)}
            disabled={isLast}
          >
            <ChevronDown className="h-3 w-3" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-6 w-6 -my-1">
                <MoreHorizontal className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => onEdit(alert, e)}>
                <Edit className="mr-2 h-4 w-4" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => onDelete(alert, e)}
                className="text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  );

  if (!hasUrl) {
    return content;
  }

  if (isExternal) {
    return (
      <a href={alert.url!} target="_blank" rel="noopener noreferrer">
        {content}
      </a>
    );
  }

  return <Link to={alert.url!}>{content}</Link>;
}

export function HouseAlerts() {
  const { role } = useAuth();
  const isAdmin = role === 'admin';
  
  // Use all alerts for admin (to manage), regular query for non-admin
  const { data: displayAlerts = [], isLoading: isLoadingDisplay } = useHouseAlerts();
  const { data: allAlerts = [], isLoading: isLoadingAll } = useAllHouseAlerts();
  
  const createMutation = useCreateHouseAlert();
  const updateMutation = useUpdateHouseAlert();
  const deleteMutation = useDeleteHouseAlert();
  const reorderMutation = useReorderHouseAlert();

  const [formOpen, setFormOpen] = useState(false);
  const [editingAlert, setEditingAlert] = useState<HouseAlert | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingAlert, setDeletingAlert] = useState<HouseAlert | null>(null);

  // For admin, show all alerts for management; for users, show only active non-expired
  const alerts = isAdmin ? allAlerts : displayAlerts;
  const isLoading = isAdmin ? isLoadingAll : isLoadingDisplay;

  const handleCreate = () => {
    setEditingAlert(null);
    setFormOpen(true);
  };

  const handleEdit = (alert: HouseAlert, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingAlert(alert);
    setFormOpen(true);
  };

  const handleDelete = (alert: HouseAlert, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDeletingAlert(alert);
    setDeleteDialogOpen(true);
  };

  const handleMoveUp = (alert: HouseAlert, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    reorderMutation.mutate({ id: alert.id, direction: 'up', alerts: allAlerts });
  };

  const handleMoveDown = (alert: HouseAlert, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    reorderMutation.mutate({ id: alert.id, direction: 'down', alerts: allAlerts });
  };

  const handleFormSubmit = async (data: any) => {
    if (editingAlert) {
      await updateMutation.mutateAsync({ id: editingAlert.id, ...data });
    } else {
      await createMutation.mutateAsync(data);
    }
    setFormOpen(false);
    setEditingAlert(null);
  };

  const handleConfirmDelete = async () => {
    if (deletingAlert) {
      await deleteMutation.mutateAsync(deletingAlert.id);
      setDeleteDialogOpen(false);
      setDeletingAlert(null);
    }
  };

  // Check if an alert is expired (for admin visual indication)
  const isExpired = (alert: HouseAlert) => {
    if (!alert.expires_at) return false;
    const today = new Date().toISOString().split('T')[0];
    return alert.expires_at < today;
  };

  return (
    <>
      <div className="bg-card rounded-xl border p-5">
        <div className="section-header flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-gold" />
            <h2 className="section-title">O Que Importa Hoje</h2>
          </div>
          {isAdmin && (
            <Button variant="ghost" size="sm" onClick={handleCreate} className="-my-1">
              <Plus className="h-4 w-4 mr-1" />
              Novo
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-muted rounded animate-pulse" />
            ))}
          </div>
        ) : alerts.length > 0 ? (
          <div className="space-y-3">
            {alerts.map((alert, index) => (
              <div key={alert.id} className={cn(isAdmin && isExpired(alert) && 'opacity-50')}>
                {isAdmin && isExpired(alert) && (
                  <div className="text-xs text-destructive mb-1">Expirado</div>
                )}
                {isAdmin && !alert.is_active && !isExpired(alert) && (
                  <div className="text-xs text-muted-foreground mb-1">Inativo</div>
                )}
                <AlertItem
                  alert={alert}
                  isAdmin={isAdmin}
                  isFirst={index === 0}
                  isLast={index === alerts.length - 1}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onMoveUp={handleMoveUp}
                  onMoveDown={handleMoveDown}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="py-4 text-center">
            <p className="text-sm text-muted-foreground">Nenhum alerta ativo</p>
          </div>
        )}
      </div>

      <HouseAlertForm
        open={formOpen}
        onOpenChange={setFormOpen}
        alert={editingAlert}
        onSubmit={handleFormSubmit}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleConfirmDelete}
        isLoading={deleteMutation.isPending}
        title="Excluir alerta"
        description={`Tem certeza que deseja excluir "${deletingAlert?.title}"?`}
      />
    </>
  );
}
