import { useGetStudentDashboard, getGetStudentDashboardQueryKey } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Play, Trophy, Star, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { pageVariants, pageTransition } from "@/lib/animations";
import { Link } from "wouter";

export default function StudentHome() {
  const { data: dashboard, isLoading } = useGetStudentDashboard({ query: { queryKey: getGetStudentDashboardQueryKey() } });

  if (isLoading) {
    return <div className="h-[60vh] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  if (!dashboard) return null;

  const progressPercent = dashboard.totalLessons > 0 ? (dashboard.completedLessons / dashboard.totalLessons) * 100 : 0;

  return (
    <motion.div initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition} className="space-y-6">
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Selam, {dashboard.studentName}! 👋</h1>
          <p className="text-muted-foreground text-sm">{dashboard.className} • Seviye {dashboard.currentLevel}</p>
        </div>
        <div className="w-12 h-12 bg-secondary/20 text-secondary rounded-full flex items-center justify-center border-2 border-secondary">
          <span className="font-bold text-lg">{dashboard.currentLevel}</span>
        </div>
      </div>

      <Card className="rounded-[2rem] border-none shadow-md bg-white/80 backdrop-blur-sm overflow-hidden">
        <CardContent className="p-6">
          <div className="flex justify-between items-end mb-4">
            <div>
              <p className="text-sm font-bold text-primary mb-1 uppercase tracking-wider">İlerleme</p>
              <p className="text-2xl font-black">{dashboard.completedLessons} <span className="text-muted-foreground text-lg font-medium">/ {dashboard.totalLessons} Ders</span></p>
            </div>
            <Trophy className="w-10 h-10 text-secondary mb-1" />
          </div>
          <Progress value={progressPercent} className="h-4 rounded-full bg-muted" />
        </CardContent>
      </Card>

      {dashboard.nextLesson ? (
        <div className="mt-8">
          <h2 className="text-xl font-bold mb-4">Sıradaki Ders</h2>
          <Link href={`/student/lessons/${dashboard.nextLesson.id}`}>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="cursor-pointer">
              <Card className="rounded-[2.5rem] border-none shadow-xl bg-gradient-to-br from-primary to-accent text-white overflow-hidden relative">
                {/* Decorative background circle */}
                <div className="absolute -right-8 -top-8 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />
                
                <CardContent className="p-8 flex flex-col items-center text-center relative z-10">
                  <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center mb-6 border border-white/30 shadow-inner">
                    <Play className="w-10 h-10 text-white fill-white ml-2" />
                  </div>
                  <h3 className="text-2xl font-bold mb-2">{dashboard.nextLesson.title}</h3>
                  <p className="text-white/80 mb-6">{dashboard.nextLesson.moduleTitle}</p>
                  <div className="w-full py-4 bg-white/20 rounded-2xl backdrop-blur-md font-bold text-lg border border-white/20">
                    Devam Et
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </Link>
        </div>
      ) : (
        <Card className="rounded-[2.5rem] border-none shadow-md bg-secondary/10 mt-8">
          <CardContent className="p-8 text-center">
            <div className="w-20 h-20 bg-secondary/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Star className="w-10 h-10 text-secondary fill-secondary" />
            </div>
            <h3 className="text-xl font-bold mb-2">Harikasın!</h3>
            <p className="text-muted-foreground">Şu anki seviyedeki tüm dersleri bitirdin. Öğretmeninin yeni seviyeyi açmasını bekle.</p>
          </CardContent>
        </Card>
      )}

    </motion.div>
  );
}
