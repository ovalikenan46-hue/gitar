import { ChordDiagram, ChordCode } from "@/components/lessons/chord-diagram";

interface ChordSectionProps {
  chords: [ChordCode, ChordCode];
}

export function ChordSection({ chords }: ChordSectionProps) {
  return (
    <div className="w-full flex flex-col gap-6">
      {chords.map(code => (
        <ChordDiagram key={code} chordCode={code} />
      ))}
    </div>
  );
}
