"use client";

import React from "react";
import { motion } from "framer-motion";

export const TextReveal = ({ children, delay = 0 }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.8,
        delay: delay,
        ease: [0.2, 0.65, 0.3, 0.9],
      }}
    >
      {children}
    </motion.div>
  );
};
