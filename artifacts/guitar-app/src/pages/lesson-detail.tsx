import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useListMyLessons, getListMyLessonsQueryKey, useCompleteLesson, getGetStudentDashboardQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle2, Loader2, MessageCircle } from "lucide-react";
import { motion } from "framer-motion";
import { pageVariants, pageTransition } from "@/lib/animations";
import { Link } from "wouter";

// Lesson content components
import { GuitarPosture } from "@/components/lessons/guitar-posture";
import { Fretboard } from "@/components/lessons/fretboard";
import { StrumPattern } from "@/components/lessons/strum-pattern";
import { Metronome } from "@/components/lessons/metronome";
import { ChordDiagram } from "@/components/lessons/chord-diagram";
import { ChordTransition } from "@/components/lessons/chord-transition";
import { ChordReference } from "@/components/lessons/chord-reference";
import { ChordPractice } from "@/components/lessons/chord-practice";
import { toast } from "sonner";

export default function LessonDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  /** "strum" | "metronome" | null — only one player at a time */
  const [activePlayer, setActivePlayer] = useState<"strum" | "metronome" | null>(null);
  
  const { data: lessons, isLoading } = useListMyLessons({ query: { queryKey: getListMyLessonsQueryKey() } });
  const completeLesson = useCompleteLesson();

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  const lesson = lessons?.find(l => l.id === id);

  if (!lesson) {
    return <div className="p-8 text-center">Ders bulunamadı.</div>;
  }

  if (lesson.locked) {
    return <div className="p-8 text-center text-muted-foreground">Bu ders kilitli.</div>;
  }

  const handleComplete = () => {
    completeLesson.mutate({ id: lesson.id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListMyLessonsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetStudentDashboardQueryKey() });
        toast.success("Ders tamamlandı! Harikasın! 🎉");
        setLocation("/student/lessons");
      }
    });
  };

  return (
    <motion.div initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition} className="min-h-screen bg-background pb-24">
      
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-border px-4 py-4 flex items-center justify-between">
        <Link href="/student/lessons" className="w-10 h-10 flex items-center justify-center rounded-full bg-muted text-foreground hover:bg-muted/80">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="text-center font-bold text-lg truncate px-2">{lesson.title}</div>
        <div className="w-10" /> {/* Balancer */}
      </div>

      <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-8">
        
        {/* Intro bubble */}
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-full bg-accent text-white flex items-center justify-center shrink-0 shadow-md">
            <MessageCircle className="w-6 h-6" />
          </div>
          <div className="bg-white p-4 rounded-2xl rounded-tl-none shadow-sm border border-border text-foreground">
            <p className="font-medium">Nasıl yapılır? İzle ve tekrar et!</p>
            <p className="text-sm text-muted-foreground mt-1">{lesson.description}</p>
          </div>
        </div>

        {/* Content Area */}
        <div className="mt-8 space-y-6">
          {lesson.code === "1A" && <GuitarPosture />}
          {lesson.code === "1B" && <Fretboard />}
          {lesson.code === "1C" && (
            <>
              <StrumPattern
                isActive={activePlayer !== "metronome"}
                onActivate={() => setActivePlayer("strum")}
                onDeactivate={() => setActivePlayer(null)}
              />
              <Metronome
                isActive={activePlayer !== "strum"}
                onActivate={() => setActivePlayer("metronome")}
                onDeactivate={() => setActivePlayer(null)}
              />
            </>
          )}
          {lesson.code === "2A" && <ChordDiagram chordCode="Em" />}
          {lesson.code === "2B" && <ChordDiagram chordCode="Am" />}
          {lesson.code === "2C" && <ChordDiagram chordCode="C" />}
          {lesson.code === "2D" && <ChordDiagram chordCode="D" />}
          {lesson.code === "3A" && <ChordTransition transitionCode="3A" />}
          {lesson.code === "3B" && <ChordTransition transitionCode="3B" />}
          {lesson.code === "3C" && <ChordTransition transitionCode="3C" />}
          {lesson.code === "4A" && <ChordPractice chords={["Em", "Am", "C"]} />}
          {lesson.code === "4B" && <ChordPractice chords={["Am", "C", "D"]} />}
          {lesson.code === "4C" && <ChordPractice chords={["Em", "D", "Am"]} />}
          {lesson.code === "4D" && <ChordPractice chords={["C", "D", "Em"]} />}
        </div>

        {/* Action */}
        <div className="pt-8">
          <Button 
            size="lg" 
            className="w-full py-8 text-xl rounded-2xl shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1 bg-primary text-primary-foreground"
            onClick={handleComplete}
            disabled={completeLesson.isPending || lesson.completed}
          >
            {lesson.completed ? (
              <><CheckCircle2 className="w-6 h-6 mr-2" /> Zaten Tamamlandı</>
            ) : completeLesson.isPending ? (
              "İşleniyor..."
            ) : (
              "Bunu Öğrendim! 🚀"
            )}
          </Button>
        </div>

      </div>
    </motion.div>
  );
}
