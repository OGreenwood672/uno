"use client";

import { motion } from "framer-motion";

interface TurnTimerProps {
  remaining: number;
  duration: number;
  size?: "small" | "large";
}

export default function TurnTimer({
  remaining,
  duration,
  size = "large",
}: TurnTimerProps) {
  const isSmall = size === "small";
  const RADIUS = isSmall ? 40 : 45;
  const STROKE_WIDTH = isSmall ? 12 : 10;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

  const percentage = duration > 0 ? remaining / duration : 0;
  const offset = CIRCUMFERENCE * (1 - percentage);

  let color = "stroke-green-500";
  if (percentage < 0.5) color = "stroke-yellow-500";
  if (percentage < 0.2) color = "stroke-red-500";

  return (
    <div className={`relative ${isSmall ? "w-8 h-8" : "w-24 h-24"}`}>
      <svg className="w-full h-full" viewBox="0 0 100 100">
        {/* Background circle */}
        <circle
          className="stroke-current text-gray-700/50"
          strokeWidth={STROKE_WIDTH}
          cx="50"
          cy="50"
          r={RADIUS}
          fill="transparent"
        />
        {/* Progress circle */}
        <motion.circle
          className={`stroke-current ${color} transition-colors duration-500`}
          strokeWidth={STROKE_WIDTH}
          cx="50"
          cy="50"
          r={RADIUS}
          fill="transparent"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 50 50)"
          initial={{ strokeDashoffset: CIRCUMFERENCE }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: "linear" }}
        />
      </svg>
    </div>
  );
}
