import { useApp } from "@/contexts/AppContext";
import { HomeSkeleton } from "@/components/common/LoadingSkeleton";
import { EconomicAgenda } from "@/components/home/EconomicAgenda";

import { QuickAccess } from "@/components/home/QuickAccess";
import { RecommendationsList } from "@/components/home/RecommendationsList";
import { RecentContent } from "@/components/home/RecentContent";
import { FavoritesRecents } from "@/components/home/FavoritesRecents";
import { HomeRssNews } from "@/components/home/HomeRssNews";
import { HomeMarketsSection } from "@/components/home/HomeMarketsSection";

function HomeDate() {
  const dateLabel = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return (
    <p className="text-sm text-muted-foreground capitalize text-right pb-1">{dateLabel}</p>
  );
}

export default function Index() {
  const { isLoading } = useApp();

  if (isLoading) {
    return <HomeSkeleton />;
  }

  return (
    <div className="space-y-4 animate-fade-up">

      <HomeDate />

      {/* Markets strip (CNBC-style category tabs) */}
      <HomeMarketsSection />

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
