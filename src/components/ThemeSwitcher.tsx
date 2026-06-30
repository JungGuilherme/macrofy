import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme, Theme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';

const themes: { value: Theme; label: string; icon: React.ReactNode }[] = [
  { value: 'light', label: 'Claro', icon: <Sun className="h-3.5 w-3.5" /> },
  { value: 'dark', label: 'Escuro', icon: <Moon className="h-3.5 w-3.5" /> },
  { value: 'bloomberg', label: 'Bloomberg', icon: <Monitor className="h-3.5 w-3.5" /> },
];

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex items-center bg-muted rounded-lg p-0.5 gap-0.5">
      {themes.map((t) => (
        <button
          key={t.value}
          onClick={() => setTheme(t.value)}
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all duration-200',
            theme === t.value
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {t.icon}
          <span className="hidden sm:inline">{t.label}</span>
        </button>
      ))}
    </div>
  );
}
