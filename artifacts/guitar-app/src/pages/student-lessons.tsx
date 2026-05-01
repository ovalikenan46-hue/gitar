import { useListMyLessons, getListMyLessonsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Lock, CheckCircle2, Play, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { pageVariants, pageTransition } from "@/lib/animations";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";

export default function StudentLessons() {
  const { data: lessons, isLoading } = useListMyLessons({ query: { queryKey: getListMyLessonsQueryKey() } });

  if (isLoading) {
    return <div className="h-[60vh] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  // Group by moduleNumber
  const grouped = lessons?.reduce((acc, lesson) => {
    if (!acc[lesson.moduleNumber]) {
      acc[lesson.moduleNumber] = {
        title: lesson.moduleTitle,
        lessons: []
      };
    }
    acc[lesson.moduleNumber].lessons.push(lesson);
    return acc;
  }, {} as Record<number, { title: string, lessons: typeof lessons }>) || {};

  return (
    <motion.div initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition} className="space-y-8">
      
      <div>
        <h1 className="text-2xl font-bold text-foreground">Derslerim</h1>
        <p className="text-muted-foreground text-sm mt-1">Gitar çalmayı adım adım öğren.</p>
      </div>

      <div className="space-y-8">
        {Object.entries(grouped).map(([modNum, module]) => (
          <div key={modNum} className="space-y-4">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Badge variant="secondary" className="rounded-xl px-3 py-1">Modül {modNum}</Badge> 
              {module.title}
            </h2>
            
            <div className="grid gap-3">
              {module.lessons.map((lesson) => {
                const isLocked = lesson.locked;
                const isCompleted = lesson.completed;
                
                const cardContent = (
                  <Card className={`rounded-3xl border-none transition-all ${isLocked ? 'opacity-60 bg-muted shadow-none' : 'bg-white shadow-sm hover:shadow-md'}`}>
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className={`w-14 h-14 shrink-0 rounded-2xl flex items-center justify-center ${
                        isCompleted ? 'bg-accent/10 text-accent' : 
                        isLocked ? 'bg-muted-foreground/10 text-muted-foreground' : 
                        'bg-primary/10 text-primary'
                      }`}>
                        {isCompleted ? <CheckCircle2 className="w-7 h-7" /> :
                         isLocked ? <Lock className="w-6 h-6" /> :
                         <Play className="w-6 h-6 ml-1" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-base truncate">{lesson.title}</h3>
                        <p className="text-xs text-muted-foreground truncate">{lesson.description}</p>
                      </div>
                    </CardContent>
                  </Card>
                );

                if (isLocked) {
                  return <div key={lesson.id}>{cardContent}</div>;
                }

                return (
                  <Link key={lesson.id} href={`/student/lessons/${lesson.id}`}>
                    <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                      {cardContent}
                    </motion.div>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

    </motion.div>
  );
}
