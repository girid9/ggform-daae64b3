import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Loader2 } from "lucide-react";
import { RouteSkeleton } from "@/components/PageSkeletons";

// Eager: landing + most-used flows
import Index from "./pages/Index";
import Quiz from "./pages/Quiz";
import NotFound from "./pages/NotFound";

// Lazy: tutor/admin tooling and secondary flows
const Admin = lazy(() => import("./pages/Admin"));
const Analytics = lazy(() => import("./pages/Analytics"));
const QuestionBank = lazy(() => import("./pages/QuestionBank"));
const ImportQuestions = lazy(() => import("./pages/ImportQuestions"));
const DailyView = lazy(() => import("./pages/DailyView"));
const DailyLeaderboard = lazy(() => import("./pages/DailyLeaderboard"));
const SessionLeaderboard = lazy(() => import("./pages/SessionLeaderboard"));
const Study = lazy(() => import("./pages/Study"));

const queryClient = new QueryClient();

const RouteFallback = () => <RouteSkeleton />;

const App = () => {
  return (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/questions" element={<QuestionBank />} />
            <Route path="/import" element={<ImportQuestions />} />
            <Route path="/quiz/:code" element={<Quiz />} />
            <Route path="/study" element={<Study />} />
            <Route path="/daily/:code" element={<DailyView />} />
            <Route path="/leaderboard/:code" element={<DailyLeaderboard />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  );
};

export default App;
