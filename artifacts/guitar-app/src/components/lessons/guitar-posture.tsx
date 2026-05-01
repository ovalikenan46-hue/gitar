import postureImg from "@assets/ChatGPT_Image_1_May_2026_09_19_12_1777616524016.png";

export function GuitarPosture() {
  return (
    <div className="space-y-4">
      {/* Posture image */}
      <div className="rounded-3xl overflow-hidden shadow-lg border border-primary/10 bg-white">
        <img
          src={postureImg}
          alt="Gitar Tutuş Pozisyonu"
          className="w-full h-auto object-contain"
          draggable={false}
        />
      </div>
    </div>
  );
}
