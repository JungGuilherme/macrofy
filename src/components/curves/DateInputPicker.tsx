import { useState, useEffect, useRef } from "react";
import { format, parse, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface DateInputPickerProps {
  date: Date;
  onChange: (date: Date) => void;
}

export function DateInputPicker({ date, onChange }: DateInputPickerProps) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(format(date, "dd/MM/yyyy"));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setText(format(date, "dd/MM/yyyy"));
  }, [date]);

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value.replace(/[^\d/]/g, "");
    // Auto-insert slashes
    const digits = v.replace(/\//g, "");
    if (digits.length >= 2 && !v.includes("/")) {
      v = digits.slice(0, 2) + "/" + digits.slice(2);
    }
    if (digits.length >= 4 && v.split("/").length < 3) {
      const parts = v.split("/");
      v = parts[0] + "/" + (parts[1] || "").slice(0, 2) + "/" + (parts[1] || "").slice(2);
    }
    if (v.length > 10) v = v.slice(0, 10);
    setText(v);
  };

  const handleBlur = () => {
    const parsed = parse(text, "dd/MM/yyyy", new Date());
    if (isValid(parsed) && text.length === 10) {
      onChange(parsed);
    } else {
      setText(format(date, "dd/MM/yyyy"));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleBlur();
    }
  };

  return (
    <div className="flex gap-1.5">
      <Input
        ref={inputRef}
        value={text}
        onChange={handleTextChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder="dd/mm/aaaa"
        className="h-9 text-sm font-normal"
      />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="icon" className="h-9 w-9 flex-shrink-0">
            <CalendarIcon className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={(d) => {
              if (d) {
                onChange(d);
                setOpen(false);
              }
            }}
            initialFocus
            className={cn("p-3 pointer-events-auto")}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
