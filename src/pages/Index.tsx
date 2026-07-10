import { useApp } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";
import { HomeSkeleton } from "@/components/common/LoadingSkeleton";
import { EconomicAgenda } from "@/components/home/EconomicAgenda";

import { QuickAccess } from "@/components/home/QuickAccess";
import { RecommendationsList } from "@/components/home/RecommendationsList";
import { RecentContent } from "@/components/home/RecentContent";
import { FavoritesRecents } from "@/components/home/FavoritesRecents";
import { HomeRssNews } from "@/components/home/HomeRssNews";
import { HomeMarketCards } from "@/components/home/HomeMarketCards";

function HomeGreeting() {
  const { profile } = useAuth();
  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  const firstName = profile?.name?.split(" ")[0];

  const dateLabel = now.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="flex items-baseline justify-between flex-wrap gap-2 pb-1">
      <h1
        className="text-xl font-semibold text-foreground"
        style={{ fontFamily: "var(--font-heading)" }}
      >
        {greeting}
        {firstName ? `, ${firstName}` : ""}
      </h1>
      <p className="text-sm text-muted-foreground capitalize">{dateLabel}</p>
    </div>
  );
}

export default function Index() {
  const { isLoading } = useApp();

  if (isLoading) {
    return <HomeSkeleton />;
  }

  return (
    <div className="space-y-4 animate-fade-up">

      <HomeGreeting />

      {/* Market Overview Cards */}
      <HomeMarketCards />

      {/* Quick Access */}
      <QuickAccess />

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          
          <EconomicAgenda />
          <RecommendationsList />
        </div>
        <div className="space-y-4">
          <HomeRssNews />
          <RecentContent />
          <FavoritesRecents />
        </div>
      </div>
    </div>
  );
}
