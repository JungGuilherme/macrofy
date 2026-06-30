import { ReactNode } from 'react';
import { AppSidebar } from './AppSidebar';
import { AppHeader } from './AppHeader';
import { useApp } from '@/contexts/AppContext';
import { cn } from '@/lib/utils';
import { HelpFeedbackButton } from '@/components/common/HelpFeedbackButton';
import { MarketTickerTape } from '@/components/home/MarketTickerTape';
import { FeaturedNewsTicker } from '@/components/home/FeaturedNewsTicker';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { sidebarCollapsed } = useApp();

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <AppHeader />
      <div
        className={cn(
          'pt-14 min-h-screen transition-all duration-300',
          sidebarCollapsed ? 'pl-16' : 'pl-64'
        )}
      >
        {/* Global fixed ticker */}
        <div className="sticky top-14 z-30 px-6 pt-4">
          <section className="rounded-lg overflow-hidden border border-border">
            <MarketTickerTape />
            <FeaturedNewsTicker />
          </section>
        </div>
        <main className="p-6 pt-4">
          {children}
        </main>
      </div>
      <HelpFeedbackButton />
    </div>
  );
}
