import { UnoCard } from "../../types/game";
import { motion, HTMLMotionProps } from "framer-motion";

// Extend standard motion props so we can pass layoutId, initial, animate, etc.
interface CardProps extends HTMLMotionProps<"div"> {
  card?: UnoCard;
  hidden?: boolean;
  activeColor?: string;
}

// New helper function to get the display value
const getCardDisplay = (value: UnoCard["value"]) => {
  switch (value) {
    case "skip":
      return "🚫";
    case "reverse":
      return "🔄";
    case "draw2":
      return "+2";
    case "wild":
      return "W"; // Or a more complex component
    case "wild_draw4":
      return "+4";
    default:
      return value.toUpperCase();
  }
};

export default function Card({ card, hidden, activeColor, ...motionProps }: CardProps) {
  // Render the back of the card
  if (hidden || !card) {
    return (
      <motion.div
        {...motionProps}
        className={`w-32 h-48 bg-[var(--color-card-back)] rounded-xl border-4 border-white flex items-center justify-center shadow-md select-none ${motionProps.className || ""}`}
      >
        <div className="w-20 h-20 bg-red-600 rounded-full flex items-center justify-center shadow-inner">
          <span className="text-white font-black text-3xl tracking-widest">
            UNO
          </span>
        </div>
      </motion.div>
    );
  }

  const colorStyles: { [key: string]: string } = {
    red: "bg-red-500",
    blue: "bg-blue-500",
    green: "bg-green-500",
    yellow: "bg-yellow-400",
    wild: "bg-zinc-800",
  };

  const displayValue = getCardDisplay(card.value);
  const isSymbol = ["🚫", "🔄", "+2", "+4"].includes(displayValue);
  const isWild = card.color === "wild";

  const dynamicColor = isWild && activeColor ? colorStyles[activeColor] : colorStyles[card.color];

  return (
    <motion.div
      {...motionProps}
      className={`w-32 h-48 ${dynamicColor} rounded-xl border-4 border-white flex flex-col items-center justify-center p-2 shadow-md select-none relative ${
        motionProps.className || ""
      }`}
    >
      <div className="absolute top-2 left-3 text-white font-bold text-xl">
        {displayValue}
      </div>
      <div className="absolute bottom-2 right-3 text-white font-bold text-xl transform rotate-180">
        {displayValue}
      </div>

      <div
        className={`bg-white/80 w-24 h-36 rounded-full flex items-center justify-center -rotate-12 shadow-inner backdrop-blur-sm`}
      >
        <span
          className={`font-black ${
            isWild && activeColor
              ? "text-white"
              : isWild
              ? "text-zinc-800"
              : colorStyles[card.color].replace("bg-", "text-")
          } drop-shadow-sm ${isSymbol ? "text-4xl" : "text-6xl"}`}
        >
          {displayValue}
        </span>
      </div>
    </motion.div>
  );
}
