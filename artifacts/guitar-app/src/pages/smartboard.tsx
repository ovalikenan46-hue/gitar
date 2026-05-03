import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useGetSmartboardClass, getGetSmartboardClassQueryKey } from "@workspace/api-client-react";
import { Monitor, Loader2, Music2, Guitar, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// Lesson content components — aynı bileşenler, seviye kısıtı yok
import { GuitarPosture } from "@/components/lessons/guitar-posture";
import { Fretboard } from "@/components/lessons/fretboard";
import { StrumPattern } from "@/components/lessons/strum-pattern";
import { Metronome } from "@/components/lessons/metronome";
import { ChordDiagram } from "@/components/lessons/chord-diagram";
import { ChordTransition } from "@/components/lessons/chord-transition";
import { ChordReference } from "@/components/lessons/chord-reference";
import { ChordPractice } from "@/components/lessons/chord-practice";
import { ChordSection } from "@/components/lessons/chord-section";
import { ChordTransitionSection } from "@/components/lessons/chord-transition-section";

interface SmartboardLesson {
  id: string;
  code: string;
  title: string;
  moduleNumber: number;
  moduleTitle: string;
  orderIndex: number;
}

function LessonContent({ lessonCode, onBack }: { lessonCode: string; onBack: () => void }) {
  const [activePlayer, setActivePlayer] = useState<"strum" | "metronome" | null>(null);

  const renderContent = () => {
    if (lessonCode === "1A") return <GuitarPosture />;
    if (lessonCode === "1B") return <Fretboard />;
    if (lessonCode === "1C") return (
      <div className="space-y-6">
        <StrumPattern
          isActive={activePlayer === "strum"}
          onActivate={() => setActivePlayer("strum")}
          onDeactivate={() => setActivePlayer(null)}
        />
        <Metronome
          isActive={activePlayer === "metronome"}
          onActivate={() => setActivePlayer("metronome")}
          onDeactivate={() => setActivePlayer(null)}
        />
      </div>
    );
    if (lessonCode === "2A") return <ChordDiagram chordCode="Em" />;
    if (lessonCode === "2B") return <ChordDiagram chordCode="Am" />;
    if (lessonCode === "2C") return <ChordDiagram chordCode="C" />;
    if (lessonCode === "2D") return <ChordDiagram chordCode="D" />;
    if (lessonCode === "3A") return <ChordTransition transitionCode="3A" />;
    if (lessonCode === "3B") return <ChordTransition transitionCode="3B" />;
    if (lessonCode === "3C") return <ChordTransition transitionCode="3C" />;
    if (lessonCode === "4A") return <ChordPractice chords={["Em", "Am", "C"]} />;
    if (lessonCode === "4B") return <ChordPractice chords={["Am", "C", "D"]} />;
    if (lessonCode === "4C") return <ChordPractice chords={["Em", "D", "Am"]} />;
    if (lessonCode === "4D") return <ChordPractice chords={["C", "D", "Em"]} />;
    if (lessonCode === "5A") return <ChordSection chords={["E", "A"]} />;
    if (lessonCode === "5B") return <ChordSection chords={["Dm", "G"]} />;
    if (lessonCode === "5C") return <ChordSection chords={["F", "B7"]} />;
    if (lessonCode === "6A") return <ChordTransitionSection sectionCode="6A" />;
    if (lessonCode === "6B") return <ChordTransitionSection sectionCode="6B" />;
    if (lessonCode === "6C") return <ChordTransitionSection sectionCode="6C" />;
    if (lessonCode === "6D") return <ChordTransitionSection sectionCode="6D" />;
    return (
      <div className="text-center py-12 text-muted-foreground">
        Bu ders için içerik hazırlanıyor.
      </div>
    );
  };

  return (
    <motion.div
      key={lessonCode}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="max-w-3xl mx-auto px-4"
    >
      <button
        onClick={onBack}
        className="mb-6 flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-lg font-medium"
      >
        ← Ders listesine dön
      </button>
      {renderContent()}
    </motion.div>
  );
}

export default function Smartboard() {
  const { code } = useParams<{ code: string }>();
  const [, setLocation] = useLocation();
  const [selectedLesson, setSelectedLesson] = useState<SmartboardLesson | null>(null);

  const { data, isLoading, isError } = useGetSmartboardClass(code ?? "", {
    query: { queryKey: getGetSmartboardClassQueryKey(code ?? ""), enabled: !!code },
  });

  if (!code) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground text-lg">Geçersiz akıllı tahta kodu.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4 p-8 text-center">
        <Monitor className="w-16 h-16 text-muted-foreground/40" />
        <h2 className="text-2xl font-bold text-foreground">Kod bulunamadı</h2>
        <p className="text-muted-foreground max-w-sm">
          <strong>{code}</strong> kodlu sınıf bulunamadı. Öğretmeninizden yeni bir akıllı tahta kodu oluşturmasını isteyin.
        </p>
      </div>
    );
  }

  const classInfo = data as {
    classId: string;
    className: string;
    teacherName: string | null;
    lessons: SmartboardLesson[];
  };

  const byModule = classInfo.lessons.reduce<Record<number, SmartboardLesson[]>>((acc, l) => {
    (acc[l.moduleNumber] ??= []).push(l);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-background">
      {/* Sabit başlık */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-border px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
            <Monitor className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-black text-foreground">{classInfo.className}</h1>
            {classInfo.teacherName && (
              <p className="text-xs text-muted-foreground">{classInfo.teacherName}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-primary/5 rounded-full px-4 py-1.5">
            <Guitar className="w-4 h-4 text-primary" />
            <span className="text-sm font-bold text-primary tracking-widest font-mono">{code}</span>
          </div>
          <button
            onClick={() => setLocation("/student-login")}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-muted hover:bg-red-100 hover:text-red-600 text-muted-foreground transition-colors"
            title="Çıkış"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="py-8">
        <AnimatePresence mode="wait">
          {selectedLesson ? (
            <LessonContent
              key={selectedLesson.code}
              lessonCode={selectedLesson.code}
              onBack={() => setSelectedLesson(null)}
            />
          ) : (
            <motion.div
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="max-w-4xl mx-auto px-4 space-y-10"
            >
              {Object.entries(byModule)
                .sort(([a], [b]) => Number(a) - Number(b))
                .map(([modNum, lessons]) => (
                  <section key={modNum}>
                    <div className="flex items-center gap-3 mb-5">
                      <div className="w-9 h-9 bg-secondary/20 rounded-xl flex items-center justify-center text-secondary font-black text-lg">
                        {modNum}
                      </div>
                      <h2 className="text-xl font-bold text-foreground">
                        {lessons[0].moduleTitle}
                      </h2>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {lessons
                        .sort((a, b) => a.orderIndex - b.orderIndex)
                        .map((lesson) => (
                          <button
                            key={lesson.id}
                            onClick={() => setSelectedLesson(lesson)}
                            className="group text-left p-5 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-primary/30 hover:bg-primary/5 transition-all"
                          >
                            <div className="flex items-start gap-4">
                              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0 group-hover:bg-primary group-hover:text-white transition-colors">
                                <Music2 className="w-6 h-6" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-primary/60 uppercase tracking-wider mb-1">
                                  {lesson.code}
                                </p>
                                <p className="text-lg font-bold text-foreground leading-tight">
                                  {lesson.title}
                                </p>
                              </div>
                            </div>
                          </button>
                        ))}
                    </div>
                  </section>
                ))}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
