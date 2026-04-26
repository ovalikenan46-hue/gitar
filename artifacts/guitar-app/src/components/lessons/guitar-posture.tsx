import { useState, useEffect } from "react";
import { motion } from "framer-motion";

export function GuitarPosture() {
  return (
    <div className="w-full aspect-square bg-blue-50 rounded-[2rem] relative overflow-hidden flex items-center justify-center shadow-inner border border-blue-100">
      <motion.div
        className="w-48 h-64 bg-amber-100 rounded-full absolute"
        animate={{ y: [-5, 5, -5] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      >
        {/* Placeholder for character body */}
        <div className="absolute top-[-20px] left-1/2 -translate-x-1/2 w-20 h-24 bg-amber-200 rounded-full" />
        {/* Guitar proxy */}
        <motion.div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-20 bg-orange-800 rounded-[2rem] -rotate-12 flex items-center justify-end pr-2"
          animate={{ rotate: [-10, -14, -10] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        >
           <div className="w-20 h-4 bg-orange-900 absolute -left-16 rounded-l-md" />
           <div className="w-12 h-12 bg-black/80 rounded-full border-2 border-orange-900/50" />
        </motion.div>
      </motion.div>
      <div className="absolute bottom-4 left-0 right-0 text-center text-sm font-medium text-blue-800/60 px-4">
        Gitarı göğsüne yakın tut ve sapı hafif yukarı baksın.
      </div>
    </div>
  );
}
