import { useState, useEffect, useRef, useCallback } from 'react';
import { Pencil, Trash2, Plus, Calendar, BarChart3, Coins, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  useAllAgendaEconomica, 
  useAllAgendaResultados, 
  useAllAgendaDividendos,
  useBulkSaveAgendaEconomica,
  useBulkSaveAgendaResultados,
  useBulkSaveAgendaDividendos,
  useDeleteAgendaEconomica,
  useDeleteAgendaResultado,
  useDeleteAgendaDividendo,
  formatToBRDate,
  parseBRDate,
  type EconomicaRow,
  type ResultadoRow,
  type DividendoRow,
} from '@/hooks/useAgendaPocket';

const COUNTRIES = [
  { value: 'BR', label: '🇧🇷 BR' },
  { value: 'US', label: '🇺🇸 US' },
  { value: 'EU', label: '🇪🇺 EU' },
  { value: 'CN', label: '🇨🇳 CN' },
  { value: 'JP', label: '🇯🇵 JP' },
  { value: 'GB', label: '🇬🇧 GB' },
  { value: 'DE', label: '🇩🇪 DE' },
];

// Generic editable table for agenda items
interface EditableTableProps<T> {
  columns: { key: keyof T; label: string; type?: 'text' | 'select' | 'date'; options?: { value: string; label: string }[]; width?: string }[];
  rows: T[];
  onChange: (rows: T[]) => void;
  onDelete: (id: string) => void;
  createEmptyRow: () => T;
}

function EditableTable<T extends { id?: string }>({ 
  columns, 
  rows, 
  onChange, 
  onDelete,
  createEmptyRow 
}: EditableTableProps<T>) {
  const tableRef = useRef<HTMLTableElement>(null);
  
  const handleCellChange = (rowIndex: number, key: keyof T, value: string) => {
    const newRows = [...rows];
    newRows[rowIndex] = { ...newRows[rowIndex], [key]: value };
    onChange(newRows);
  };
  
  const handleAddRow = () => {
    onChange([...rows, createEmptyRow()]);
  };
  
  const handleRemoveRow = (index: number) => {
    const row = rows[index];
    if (row.id) {
      onDelete(row.id);
    }
    const newRows = rows.filter((_, i) => i !== index);
    onChange(newRows);
  };
  
  // Handle paste from Excel/Sheets
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const clipboardData = e.clipboardData.getData('text');
    if (!clipboardData) return;
    
    const lines = clipboardData.split('\n').filter(line => line.trim());
    if (lines.length === 0) return;
    
    e.preventDefault();
    
    const newRows: T[] = [];
    for (const line of lines) {
      const cells = line.split('\t');
      if (cells.length === 0) continue;
      
      const newRow = createEmptyRow();
      columns.forEach((col, colIndex) => {
        if (cells[colIndex] !== undefined) {
          let value = cells[colIndex].trim();
          // Convert date format if it's a date column
          if (col.type === 'date') {
            value = parseBRDate(value);
          }
          (newRow as Record<string, unknown>)[col.key as string] = value;
        }
      });
      newRows.push(newRow);
    }
    
    if (newRows.length > 0) {
      onChange([...rows, ...newRows]);
    }
  }, [columns, rows, onChange, createEmptyRow]);
  
  return (
    <div className="space-y-2">
      <div className="border rounded-md overflow-hidden">
        <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
          <Table ref={tableRef}>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                {columns.map((col) => (
                  <TableHead key={String(col.key)} style={{ width: col.width || 'auto' }} className="text-xs">
                    {col.label}
                  </TableHead>
                ))}
                <TableHead className="w-16">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length + 1} className="text-center text-muted-foreground py-8">
                    Nenhum item. Cole dados do Excel ou clique em "Adicionar linha".
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row, rowIndex) => (
                  <TableRow key={rowIndex}>
                    {columns.map((col) => (
                      <TableCell key={String(col.key)} className="p-1">
                        {col.type === 'select' ? (
                          <Select
                            value={String(row[col.key] || '')}
                            onValueChange={(value) => handleCellChange(rowIndex, col.key, value)}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="..." />
                            </SelectTrigger>
                            <SelectContent>
                              {col.options?.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input
                            type={col.type === 'date' ? 'date' : 'text'}
                            value={String(row[col.key] || '')}
                            onChange={(e) => handleCellChange(rowIndex, col.key, e.target.value)}
                            onPaste={handlePaste}
                            className="h-8 text-xs"
                            placeholder={col.label}
                          />
                        )}
                      </TableCell>
                    ))}
                    <TableCell className="p-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8"
                        onClick={() => handleRemoveRow(rowIndex)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
      <Button variant="outline" size="sm" onClick={handleAddRow}>
        <Plus className="h-4 w-4 mr-1" />
        Adicionar linha
      </Button>
    </div>
  );
}

// Economica Table Editor
function EconomicaTableEditor() {
  const { data: existingData = [], isLoading } = useAllAgendaEconomica();
  const bulkSave = useBulkSaveAgendaEconomica();
  const deleteItem = useDeleteAgendaEconomica();
  const [rows, setRows] = useState<EconomicaRow[]>([]);
  
  useEffect(() => {
    if (existingData.length > 0) {
      setRows(existingData.map(item => ({
        id: item.id,
        event_date: item.event_date,
        event_time: item.event_time || '',
        country: item.country,
        title: item.title,
      })));
    }
  }, [existingData]);
  
  const columns = [
    { key: 'event_date' as const, label: 'Data', type: 'date' as const, width: '130px' },
    { key: 'event_time' as const, label: 'Horário', type: 'text' as const, width: '80px' },
    { key: 'country' as const, label: 'País', type: 'select' as const, options: COUNTRIES, width: '100px' },
    { key: 'title' as const, label: 'Dado Econômico', type: 'text' as const },
  ];
  
  const createEmptyRow = (): EconomicaRow => ({
    event_date: '',
    event_time: '',
    country: 'BR',
    title: '',
  });
  
  const handleSave = async () => {
    const validRows = rows.filter(r => r.event_date && r.title);
    await bulkSave.mutateAsync(validRows);
  };
  
  if (isLoading) return <div className="text-center py-8 text-muted-foreground">Carregando...</div>;
  
  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
        💡 Dica: Cole diretamente do Excel/Sheets (colunas: Data, Horário, País, Dado)
      </div>
      
      <EditableTable
        columns={columns}
        rows={rows}
        onChange={setRows}
        onDelete={(id) => deleteItem.mutate(id)}
        createEmptyRow={createEmptyRow}
      />
      
      <Button onClick={handleSave} disabled={bulkSave.isPending} className="w-full">
        <Save className="h-4 w-4 mr-2" />
        Salvar Agenda Econômica
      </Button>
    </div>
  );
}

// Resultados Table Editor
function ResultadosTableEditor() {
  const { data: existingData = [], isLoading } = useAllAgendaResultados();
  const bulkSave = useBulkSaveAgendaResultados();
  const deleteItem = useDeleteAgendaResultado();
  const [rows, setRows] = useState<ResultadoRow[]>([]);
  
  useEffect(() => {
    if (existingData.length > 0) {
      setRows(existingData.map(item => ({
        id: item.id,
        event_date: item.event_date,
        company: item.company,
        ticker: item.ticker,
        country: item.country,
        event_time: item.event_time || '',
      })));
    }
  }, [existingData]);
  
  const columns = [
    { key: 'event_date' as const, label: 'Data', type: 'date' as const, width: '130px' },
    { key: 'company' as const, label: 'Empresa', type: 'text' as const },
    { key: 'ticker' as const, label: 'Ticker', type: 'text' as const, width: '80px' },
    { key: 'country' as const, label: 'País', type: 'select' as const, options: [
      { value: 'BR', label: '🇧🇷 BR' },
      { value: 'US', label: '🇺🇸 US' },
    ], width: '100px' },
    { key: 'event_time' as const, label: 'Horário', type: 'text' as const, width: '100px' },
  ];
  
  const createEmptyRow = (): ResultadoRow => ({
    event_date: '',
    company: '',
    ticker: '',
    country: 'BR',
    event_time: '',
  });
  
  const handleSave = async () => {
    // Required: date + company (ticker, country, time optional)
    const validRows = rows.filter(r => r.event_date && r.company);
    await bulkSave.mutateAsync(validRows);
  };
  
  if (isLoading) return <div className="text-center py-8 text-muted-foreground">Carregando...</div>;
  
  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
        💡 Dica: Cole do Excel (colunas: Data, Empresa, Ticker, País, Horário/BMO/AMC)
      </div>
      
      <EditableTable
        columns={columns}
        rows={rows}
        onChange={setRows}
        onDelete={(id) => deleteItem.mutate(id)}
        createEmptyRow={createEmptyRow}
      />
      
      <Button onClick={handleSave} disabled={bulkSave.isPending} className="w-full">
        <Save className="h-4 w-4 mr-2" />
        Salvar Resultados
      </Button>
    </div>
  );
}

// Dividendos Table Editor
function DividendosTableEditor() {
  const { data: existingData = [], isLoading } = useAllAgendaDividendos();
  const bulkSave = useBulkSaveAgendaDividendos();
  const deleteItem = useDeleteAgendaDividendo();
  const [rows, setRows] = useState<DividendoRow[]>([]);
  
  useEffect(() => {
    if (existingData.length > 0) {
      setRows(existingData.map(item => ({
        id: item.id,
        event_date: item.event_date,
        company: item.company,
        ticker: item.ticker,
        country: item.country,
        dividend_type: item.dividend_type,
        dividend_yield: item.dividend_yield?.toString() || '',
        ex_date: item.ex_date || '',
      })));
    }
  }, [existingData]);
  
  const columns = [
    { key: 'event_date' as const, label: 'Data Pgto', type: 'date' as const, width: '130px' },
    { key: 'company' as const, label: 'Empresa', type: 'text' as const },
    { key: 'ticker' as const, label: 'Ticker', type: 'text' as const, width: '80px' },
    { key: 'country' as const, label: 'País', type: 'select' as const, options: COUNTRIES, width: '100px' },
    { key: 'dividend_type' as const, label: 'Tipo', type: 'select' as const, options: [
      { value: 'Dividendo', label: 'Dividendo' },
      { value: 'JCP', label: 'JCP' },
    ], width: '110px' },
    { key: 'dividend_yield' as const, label: 'Yield %', type: 'text' as const, width: '80px' },
    { key: 'ex_date' as const, label: 'Data Ex', type: 'date' as const, width: '130px' },
  ];
  
  const createEmptyRow = (): DividendoRow => ({
    event_date: '',
    company: '',
    ticker: '',
    country: 'BR',
    dividend_type: 'Dividendo',
    dividend_yield: '',
    ex_date: '',
  });
  
  const handleSave = async () => {
    // Required: event_date + company (ticker, country, dy, type, ex_date optional)
    const validRows = rows.filter(r => r.event_date && r.company);
    await bulkSave.mutateAsync(validRows);
  };
  
  if (isLoading) return <div className="text-center py-8 text-muted-foreground">Carregando...</div>;
  
  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
        💡 Dica: Cole do Excel (colunas: Data Pgto, Empresa, Ticker, País, Tipo, Yield%, Data Ex)
      </div>
      
      <EditableTable
        columns={columns}
        rows={rows}
        onChange={setRows}
        onDelete={(id) => deleteItem.mutate(id)}
        createEmptyRow={createEmptyRow}
      />
      
      <Button onClick={handleSave} disabled={bulkSave.isPending} className="w-full">
        <Save className="h-4 w-4 mr-2" />
        Salvar Dividendos
      </Button>
    </div>
  );
}

export function AgendaPocketEditor() {
  const [open, setOpen] = useState(false);
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8">
          <Pencil className="h-4 w-4 mr-1" />
          Editar
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Agenda Pocket</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="economica" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="economica" className="text-xs sm:text-sm">
              <Calendar className="h-4 w-4 mr-1 hidden sm:inline" />
              Dados Econômicos
            </TabsTrigger>
            <TabsTrigger value="resultados" className="text-xs sm:text-sm">
              <BarChart3 className="h-4 w-4 mr-1 hidden sm:inline" />
              Resultados
            </TabsTrigger>
            <TabsTrigger value="dividendos" className="text-xs sm:text-sm">
              <Coins className="h-4 w-4 mr-1 hidden sm:inline" />
              Dividendos
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="economica" className="mt-4">
            <EconomicaTableEditor />
          </TabsContent>
          
          <TabsContent value="resultados" className="mt-4">
            <ResultadosTableEditor />
          </TabsContent>
          
          <TabsContent value="dividendos" className="mt-4">
            <DividendosTableEditor />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
