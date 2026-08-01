"use client";

import { CardColor } from "@/types/game";
import { motion } from "framer-motion";

interface ColorPickerProps {
  onColorSelect: (color: CardColor) => void;
  onCancel: () => void;
}

const colors: CardColor[] = ["red", "green", "blue", "yellow"];

const colorClasses = {
  red: "bg-red-500 hover:bg-red-600",
  green: "bg-green-500 hover:bg-green-600",
  blue: "bg-blue-500 hover:bg-blue-600",
  yellow: "bg-yellow-500 hover:bg-yellow-600",
  wild: "", // wild should not be an option here
};

export default function ColorPicker({ onColorSelect, onCancel }: ColorPickerProps) {
  return (
    <motion.div 
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onCancel}
    >
      <motion.div
        className="p-6 bg-gray-800 rounded-2xl shadow-2xl flex flex-col items-center gap-4"
        initial={{ scale: 0.8, y: 50 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.8, y: 50 }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-2xl font-bold text-white">Choose a color</h3>
        <div className="flex gap-4">
          {colors.map((color) => (
            <motion.button
              key={color}
              className={`w-24 h-24 rounded-full shadow-lg ${colorClasses[color]}`}
              onClick={() => onColorSelect(color)}
              whileHover={{ scale: 1.1, y: -5 }}
              whileTap={{ scale: 0.95 }}
            />
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
