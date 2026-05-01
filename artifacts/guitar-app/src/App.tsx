import { useState } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AnimatePresence } from "framer-motion";
import { Toaster as SonnerToaster } from "sonner";

// Layouts
import { Protected } from "@/components/layout/protected";
import { StudentLayout } from "@/components/layout/student-layout";

// Pages
import Landing from "@/pages/landing";
import TeacherLogin from "@/pages/teacher-login";
import StudentLogin from "@/pages/student-login";
import AdminDashboard from "@/pages/admin-dashboard";
import TeacherDashboard from "@/pages/teacher-dashboard";
import StudentHome from "@/pages/student-home";
import StudentLessons from "@/pages/student-lessons";
import LessonDetail from "@/pages/lesson-detail";
import StudentProfile from "@/pages/student-profile";
import NotFound from "@/pages/not-found";

// Splash
import { SplashScreen } from "@/components/splash-screen";

const queryClient = new QueryClient();

function Router() {
  return (
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

        <Route component={NotFound} />
      </Switch>
    </AnimatePresence>
  );
}

function App() {
  const [splashDone, setSplashDone] = useState(false);
  const handleSplashComplete = () => setSplashDone(true);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          {!splashDone && <SplashScreen onComplete={handleSplashComplete} />}
          <Router />
        </WouterRouter>
        <Toaster />
        <SonnerToaster richColors position="top-center" />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
