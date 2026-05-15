import type { Transition, Variants } from "framer-motion";

export const pageVariants: Variants = {
  initial: { opacity: 0, y: 20 },
  in: { opacity: 1, y: 0 },
  out: { opacity: 0, y: -20 },
};

export const pageTransition: Transition = {
  type: "tween",
  ease: "anticipate",
  duration: 0.3,
};
