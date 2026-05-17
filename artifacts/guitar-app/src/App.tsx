import { lazy, Suspense, useState } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AnimatePresence } from "framer-motion";
import { Toaster as SonnerToaster } from "sonner";
import { ErrorBoundary } from "@/components/error-boundary";

// Layouts — eager (hafif, her yerde lazım)
import { Protected } from "@/components/layout/protected";
import { StudentLayout } from "@/components/layout/student-layout";

// İlk yüklenen sayfalar — eager
import Landing from "@/pages/landing";

// Diğer sayfalar — lazy (mobil başlangıç süresini %60+ azaltır)
const TeacherLogin   = lazy(() => import("@/pages/teacher-login"));
const StudentLogin   = lazy(() => import("@/pages/student-login"));
const AdminDashboard = lazy(() => import("@/pages/admin-dashboard"));
const TeacherDashboard = lazy(() => import("@/pages/teacher-dashboard"));
const StudentHome    = lazy(() => import("@/pages/student-home"));
const StudentLessons = lazy(() => import("@/pages/student-lessons"));
const LessonDetail   = lazy(() => import("@/pages/lesson-detail"));
const StudentProfile = lazy(() => import("@/pages/student-profile"));
const Smartboard     = lazy(() => import("@/pages/smartboard"));
const NotFound       = lazy(() => import("@/pages/not-found"));

// Splash
import { SplashScreen } from "@/components/splash-screen";

// PWA Install
import { InstallPrompt } from "@/components/install-prompt";

// Audio
import { BgMusicProvider } from "@/contexts/bg-music-provider";
import { useBgMusic } from "@/contexts/bg-music-context";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000,
      gcTime:    5 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

/** Lazy sayfa yüklenirken gösterilen minimal spinner */
function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-8 h-8 rounded-full border-[3px] border-primary border-t-transparent animate-spin" />
    </div>
  );
}

function Router() {
  return (
    <Suspense fallback={<PageLoader />}>
      <AnimatePresence mode="wait">
        <Switch>
          <Route path="/" component={Landing} />
          <Route path="/teacher-login" component={TeacherLogin} />
          <Route path="/student-login" component={StudentLogin} />

          <Route path="/admin">
            <Protected role="admin">
              <AdminDashboard />
            </Protected>
          </Route>

          <Route path="/teacher">
            <Protected role="teacher">
              <TeacherDashboard />
            </Protected>
          </Route>

          <Route path="/student">
            <Protected role="student">
              <StudentLayout>
                <StudentHome />
              </StudentLayout>
            </Protected>
          </Route>

          <Route path="/student/lessons">
            <Protected role="student">
              <StudentLayout>
                <StudentLessons />
              </StudentLayout>
            </Protected>
          </Route>

          <Route path="/student/lessons/:id">
            <Protected role="student">
              <LessonDetail />
            </Protected>
          </Route>

          <Route path="/student/profile">
            <Protected role="student">
              <StudentLayout>
                <StudentProfile />
              </StudentLayout>
            </Protected>
          </Route>

          <Route path="/smartboard/:code" component={Smartboard} />

          <Route component={NotFound} />
        </Switch>
      </AnimatePresence>
    </Suspense>
  );
}

function AppInner() {
  const [splashDone, setSplashDone] = useState(false);
  const { unlock } = useBgMusic();

  const handleSplashComplete = () => {
    setSplashDone(true);
    // NOT: unlock() buradan ÇAĞIRILMAMALI — splash screen içindeki
    // "Başla" butonu zaten kullanıcı gesture içinde unlock() çağırıyor.
    // Burada çağırmak setTimeout callback'inden olur = iOS bloklar.
  };

  return (
    <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
      {!splashDone && <SplashScreen onComplete={handleSplashComplete} />}
      <Router />
    </WouterRouter>
  );
}

function App() {
  return (
    <ErrorBoundary>
      {/* MotionConfig reducedMotion="user" KALDIRILDI:
          Bazı telefonlarda sistem düzeyinde "animasyonları azalt" açık olduğundan
          bu ayar Framer Motion'ı tamamen kapatıyordu → splash + geçiş animasyonları görünmüyordu */}
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <BgMusicProvider>
            <AppInner />
          </BgMusicProvider>
          <InstallPrompt />
          <Toaster />
          <SonnerToaster richColors position="top-center" />
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
