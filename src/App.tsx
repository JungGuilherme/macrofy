import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AppProvider } from "@/contexts/AppContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AppLayout } from "@/components/layout/AppLayout";

// Eagerly loaded: landing, login gate and home (first paint)
import Index from "./pages/Index";
import Login from "./pages/Login";
import Landing from "./pages/Landing";

// Lazily loaded: everything else downloads on first visit to the route
const Recommendations = lazy(() => import("./pages/Recommendations"));
const RecommendationDetail = lazy(() => import("./pages/RecommendationDetail"));
const Reports = lazy(() => import("./pages/Reports"));
const ReportDetail = lazy(() => import("./pages/ReportDetail"));
const Articles = lazy(() => import("./pages/Articles"));
const ArticleDetail = lazy(() => import("./pages/ArticleDetail"));
const Projections = lazy(() => import("./pages/Projections"));
const Videos = lazy(() => import("./pages/Videos"));
const Favorites = lazy(() => import("./pages/Favorites"));
const Recents = lazy(() => import("./pages/Recents"));
const Settings = lazy(() => import("./pages/Settings"));
const NotFound = lazy(() => import("./pages/NotFound"));
const MorningCall = lazy(() => import("./pages/MorningCall"));
const Markets = lazy(() => import("./pages/Markets"));
const News = lazy(() => import("./pages/News"));
const NewsDetail = lazy(() => import("./pages/NewsDetail"));
const TesouroCurvas = lazy(() => import("./pages/TesouroCurvas"));
const MacroDashboard = lazy(() => import("./pages/MacroDashboard"));
const Brasil = lazy(() => import("./pages/Brasil"));
const EUA = lazy(() => import("./pages/EUA"));
const Eleicoes2026 = lazy(() => import("./pages/Eleicoes2026"));
const RankingAtivos = lazy(() => import("./pages/RankingAtivos"));

function RouteFallback() {
  return (
    <div className="flex items-center justify-center py-24">
      <span className="text-sm text-muted-foreground animate-pulse">Carregando…</span>
    </div>
  );
}

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <span className="text-2xl font-bold text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>
          MF
        </span>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Visitors landing on the root see the marketing page;
    // deep links still go straight to the login form.
    return location.pathname === "/" ? <Landing /> : <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/" replace /> : <Login />}
      />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Suspense fallback={<RouteFallback />}>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/morning-call" element={<MorningCall />} />
                <Route path="/mercados" element={<Markets />} />
                <Route path="/mercados/:tab" element={<Markets />} />
                <Route path="/eleicoes-2026" element={<Eleicoes2026 />} />
                <Route path="/brasil" element={<Brasil />} />
                <Route path="/brasil/:tab" element={<Brasil />} />
                <Route path="/eua" element={<EUA />} />
                <Route path="/eua/:tab" element={<EUA />} />
                <Route path="/tesouro-curvas" element={<TesouroCurvas />} />
                <Route path="/ranking-ativos" element={<RankingAtivos />} />
                <Route path="/macro" element={<MacroDashboard />} />
                {/* Old country-level macro URLs → country pages, Macro tab */}
                <Route path="/macro/brasil" element={<Navigate to="/brasil/macro" replace />} />
                <Route path="/macro/eua" element={<Navigate to="/eua/macro" replace />} />
                <Route path="/noticias" element={<News />} />
                <Route path="/noticias/:id" element={<NewsDetail />} />
                <Route path="/dashboards" element={<Navigate to="/macro" replace />} />
                <Route path="/dashboards/:section" element={<Navigate to="/macro" replace />} />
                <Route path="/recomendacoes" element={<Recommendations />} />
                <Route path="/recomendacoes/:id" element={<RecommendationDetail />} />
                <Route path="/relatorios" element={<Reports />} />
                <Route path="/relatorios/:id" element={<ReportDetail />} />
                <Route path="/artigos" element={<Articles />} />
                <Route path="/artigos/:id" element={<ArticleDetail />} />
                <Route path="/projecoes" element={<Projections />} />
                <Route path="/videos" element={<Videos />} />
                <Route path="/favoritos" element={<Favorites />} />
                <Route path="/recentes" element={<Recents />} />
                <Route path="/configuracoes" element={<Settings />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
              </Suspense>
            </AppLayout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <ThemeProvider>
        <LanguageProvider>
          <AuthProvider>
            <AppProvider>
              <Toaster />
              <Sonner />
              <HashRouter>
                <AppRoutes />
              </HashRouter>
            </AppProvider>
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
