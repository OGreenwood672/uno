"use client";

import { ClientGameState } from "@/types/game";
import { motion, AnimatePresence } from "framer-motion";

interface WinnerDisplayProps {
  gameState: ClientGameState;
}

export default function WinnerDisplay({ gameState }: WinnerDisplayProps) {
  const winner = gameState.players.find((p) => p.id === gameState.winnerId);

  return (
    <AnimatePresence>
      {gameState.status === "round_over" && winner && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/80 z-50 flex flex-col items-center justify-center text-white"
        >
          <motion.div
            initial={{ scale: 0.5, y: 100 }}
            animate={{
              scale: 1,
              y: 0,
              transition: {
                type: "spring",
                stiffness: 150,
                damping: 20,
                delay: 0.2,
              },
            }}
            className="text-center"
          >
            <motion.h1
              initial={{ scale: 0 }}
              animate={{
                scale: [1, 1.2, 1],
                transition: {
                  duration: 1,
                  repeat: Infinity,
                  repeatType: "mirror",
                },
              }}
              className="text-6xl font-bold mb-4 text-yellow-400"
            >
              🎉 Congratulations, {winner.name}! 🎉
            </motion.h1>
            <p className="text-3xl">You won the round!</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
