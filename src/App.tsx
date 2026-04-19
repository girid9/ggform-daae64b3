import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index";
import Admin from "./pages/Admin";
import Quiz from "./pages/Quiz";
import Analytics from "./pages/Analytics";
import QuestionBank from "./pages/QuestionBank";
import ImportQuestions from "./pages/ImportQuestions";
import NotFound from "./pages/NotFound";
import DailyView from "./pages/DailyView";
import Study from "./pages/Study";
import { useVersionCheck } from "@/hooks/useVersionCheck";

const queryClient = new QueryClient();

const App = () => {
  useVersionCheck();
  return (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/questions" element={<QuestionBank />} />
          <Route path="/import" element={<ImportQuestions />} />
          <Route path="/quiz/:code" element={<Quiz />} />
          <Route path="/study" element={<Study />} />
          <Route path="/daily/:code" element={<DailyView />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  );
};

export default App;
