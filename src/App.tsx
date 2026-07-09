import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AppProvider } from "@/contexts/AppContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AppLayout } from "@/components/layout/AppLayout";

// Pages
import Index from "./pages/Index";
import Login from "./pages/Login";
import Recommendations from "./pages/Recommendations";
import RecommendationDetail from "./pages/RecommendationDetail";
import Reports from "./pages/Reports";
import ReportDetail from "./pages/ReportDetail";
import Articles from "./pages/Articles";
import ArticleDetail from "./pages/ArticleDetail";
import Projections from "./pages/Projections";
import Videos from "./pages/Videos";
import Favorites from "./pages/Favorites";
import Recents from "./pages/Recents";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import MorningCall from "./pages/MorningCall";
import Markets from "./pages/Markets";
import News from "./pages/News";
import NewsDetail from "./pages/NewsDetail";
import TesouroCurvas from "./pages/TesouroCurvas";
import MacroDashboard from "./pages/MacroDashboard";
import Brasil from "./pages/Brasil";
import EUA from "./pages/EUA";
import Eleicoes2026 from "./pages/Eleicoes2026";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

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
    return <Navigate to="/login" replace />;
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
