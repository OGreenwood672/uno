"use client";

import { ClientGameState, UnoCard } from "@/types/game";
import { AnimatePresence, motion } from "framer-motion";
import Card from "./Card";

interface CardTableProps {
  gameState: ClientGameState;
  localPlayerId: string;
}

export default function CardTable({ gameState, localPlayerId }: CardTableProps) {
  const allCards = gameState.players.flatMap((p) =>
    p.hand
      ? p.hand.map((card) => ({ ...card, ownerId: p.id }))
      : [],
  );

  return (
    <div className="absolute inset-0">
      <AnimatePresence>
        {allCards.map((card) => (
          <motion.div
            key={card.id}
            layoutId={card.id}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="absolute"
            style={getCardPosition(card, gameState, localPlayerId)}
          >
            <Card card={card} hidden={card.ownerId !== localPlayerId} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function getCardPosition(
  card: UnoCard & { ownerId: string },
  gameState: ClientGameState,
  localPlayerId: string,
) {
  const owner = gameState.players.find((p) => p.id === card.ownerId);
  if (!owner) return { top: "50%", left: "50%" };

  if (owner.id === localPlayerId) {
    // Position for local player's hand at the bottom
    const hand = owner.hand || [];
    const cardIndex = hand.findIndex((c) => c.id === card.id);
    const totalCards = hand.length;
    const cardWidth = 128;
    const cardOverlap = 80;
    const totalWidth = totalCards * (cardWidth - cardOverlap) + cardOverlap;
    
    return {
      bottom: 20,
      left: `calc(50% - ${totalWidth / 2}px + ${cardIndex * (cardWidth - cardOverlap)}px)`,
      zIndex: 100 + cardIndex,
      cursor: "pointer",
    };
  } else {
    // Position for opponent's hand
    const opponents = gameState.players.filter((p) => p.id !== localPlayerId);
    const opponentIndex = opponents.findIndex((p) => p.id === owner.id);
    const totalOpponents = opponents.length;
    const angle = (opponentIndex / totalOpponents) * 2 * Math.PI;
    const radius = Math.min(window.innerWidth, window.innerHeight) * 0.35;
    const x = radius * Math.cos(angle - Math.PI / 2);
    const y = radius * Math.sin(angle - Math.PI / 2);
    
    const hand = owner.hand || [];
    const cardIndex = hand.findIndex((c) => c.id === card.id);

    return {
      top: `calc(50% + ${y}px)`,
      left: `calc(50% + ${x}px)`,
      transform: `translate(-50%, -50%) rotate(${cardIndex * 5 - (hand.length * 2.5)}deg)`,
      zIndex: opponentIndex * 10 + cardIndex
    };
  }
}
