"use client";

import { UnoCard, ClientGameState, CardColor } from "@/types/game";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import Card from "./Card";
import ColorPicker from "./ColorPicker";

interface PlayerHandProps {
  hand: UnoCard[];
  onCardPlay: (cardId: string, selectedColor?: any) => void;
  onJumpIn: (cardId:string) => void;
  onCallUno: () => void;
  isMyTurn: boolean;
  gameState: ClientGameState;
  viewportSize: { width: number; height: number };
}

export default function PlayerHand({ hand, onCardPlay, onJumpIn, onCallUno, isMyTurn, gameState, viewportSize }: PlayerHandProps) {
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  
  if (!gameState) {
    return null;
  }
  const localPlayer = gameState.players.find(p => p.hand);
  
  const cardWidth = 128; // w-32 in Tailwind
  
  const handSize = hand.length;
  const maxHandWidth = viewportSize.width * 0.8;
  
  let cardOverlap = 80;
  let totalWidth = handSize * (cardWidth - cardOverlap) + cardOverlap;

  if (totalWidth > maxHandWidth && handSize > 1) {
    cardOverlap = (handSize * cardWidth - maxHandWidth) / (handSize - 1);
  }
  totalWidth = handSize * (cardWidth - cardOverlap) + cardOverlap;
  if (totalWidth > maxHandWidth) {
    totalWidth = maxHandWidth;
  }
  
  const canJumpIn = gameState.settings.jumpIn;
  const topCard = gameState.topCard;

  const jumpInCardInHand =
    canJumpIn && topCard && !isMyTurn
      ? hand.find(
          (c) => c.color === topCard.color && c.value === topCard.value,
        )
      : undefined;
  const activeCardId = hoveredCard || (jumpInCardInHand ? jumpInCardInHand.id : null);
  const activeCardIndex = activeCardId
    ? hand.findIndex((c) => c.id === activeCardId)
    : -1;

  return (
    <>
      <AnimatePresence>
        {pendingWildCard && (
          <ColorPicker
            onColorSelect={handleWildColorSelect}
            onCancel={() => setPendingWildCard(null)}
          />
        )}
      </AnimatePresence>

      <motion.div
        className="relative flex items-end justify-center h-72"
        style={{ width: `${totalWidth}px`, maxWidth: "90vw" }}
        animate={{
          y: isMyTurn ? 0 : 80,
          scale: isMyTurn ? 1 : 0.8,
        }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
      >
        <AnimatePresence>
          {hand.map((card, index) => {
            const isJumpInCard = card.id === jumpInCardInHand?.id;
            const isCardActive = index === activeCardIndex;

            const canActiveCardBePopped =
              isMyTurn || activeCardId === jumpInCardInHand?.id;

            let xOffset =
              (index - (hand.length - 1) / 2) * (cardWidth - cardOverlap);
            let yOffset = 0;
            let rotation = (index - (hand.length - 1) / 2) * 4;
            let zIndex = index;

            if (activeCardIndex !== -1 && canActiveCardBePopped) {
              if (isCardActive) {
                yOffset = -80;
                rotation = 0;
                zIndex = 100;
                xOffset -= 20; // Nudge hovered card left
              } else {
                const direction = index < activeCardIndex ? -1 : 1;
                const isImmediateRight = index === activeCardIndex + 1;
                const pushAmount = isImmediateRight
                  ? cardWidth / 2.2
                  : cardWidth / 3;
                xOffset += direction * pushAmount;
              }
            }

            const canPlayRegular =
              isMyTurn &&
              (gameState.stackedDrawCount > 0
                ? card.value === "draw2" || card.value === "wild_draw4"
                : card.color === "wild" ||
                  card.color === gameState.activeColor ||
                  card.value === topCard?.value);

            const shouldAnimateOnHover = isMyTurn || isJumpInCard;

            const isDrawnCard = localPlayer?.hasDrawnCard && index === hand.length - 1;

            return (
              <motion.div
                key={card.id}
                layoutId={card.id}
                className={`absolute cursor-pointer ${isDrawnCard ? 'shadow-yellow-400 shadow-2xl' : ''}`}
                onMouseEnter={
                  shouldAnimateOnHover
                    ? () => setHoveredCard(card.id)
                    : undefined
                }
                onMouseLeave={
                  shouldAnimateOnHover ? () => setHoveredCard(null) : undefined
                }
                initial={{ opacity: 0, y: 100 }}
                animate={{
                  opacity: 1,
                  x: xOffset,
                  y: yOffset,
                  rotate: rotation,
                  scale: isCardActive && canActiveCardBePopped ? 1.25 : 1,
                  zIndex: zIndex,
                }}
                exit={{ opacity: 0, y: 150, scale: 0.8 }}
                transition={{
                  type: "spring",
                  stiffness: 300,
                  damping: 25,
                }}
                onClick={() => {
                  if (isJumpInCard) {
                    onJumpIn(card.id);
                    return;
                  }

                  if (!isMyTurn || !canPlayRegular) return;

                  if (card.color === "wild") {
                    setPendingWildCard(card);
                  } else {
                    onCardPlay(card.id);
                  }
                }}
              >
                {isJumpInCard && (
                  <>
                    <div className="absolute -top-12 left-1/2 -translate-x-1/2 z-50">
                      <motion.button
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className="px-4 py-2 bg-yellow-500 text-black font-bold rounded-lg shadow-lg whitespace-nowrap cursor-pointer"
                      >
                        Jump In!
                      </motion.button>
                    </div>
                    <div className="spinning-border" />
                  </>
                )}
                <Card card={card} />
              </motion.div>
            );
          })}
        </AnimatePresence>
        <style jsx>{`
          @property --angle {
            syntax: "<angle>";
            initial-value: 0deg;
            inherits: false;
          }

          .spinning-border {
            position: absolute;
            top: -8px;
            left: -8px;
            right: -8px;
            bottom: -8px;
            border-radius: 18px; /* slightly larger than card's border-radius */
            border: 4px solid transparent;
            background: conic-gradient(
                from var(--angle),
                transparent 0%,
                #f59e0b 25%,
                transparent 50%
              )
              border-box;
            mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
            mask-composite: exclude;
            animation: spin 1.5s linear infinite;
          }

          @keyframes spin {
            0% {
              --angle: 0deg;
            }
            100% {
              --angle: 360deg;
            }
          }
        `}</style>
    </>
  );
}
