"use client";

import { ClientGameState, UnoCard, CardColorChoice } from "@/types/game";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import Card from "./Card";
import type { PartySocket } from "partysocket";

interface CardTableProps {
  gameState: ClientGameState;
  localPlayerId: string;
  onCardPlay: (cardId: string, selectedColor?: CardColorChoice) => void;
  onJumpIn: (cardId: string) => void;
  isMyTurn: boolean;
  hand: UnoCard[];
  drawnCardToPlay: UnoCard | null;
  setPendingDrawnWildCard: (card: UnoCard | null) => void;
  socket: PartySocket;
}

export default function CardTable({
  gameState,
  localPlayerId,
  onCardPlay,
  onJumpIn,
  isMyTurn,
  hand,
  drawnCardToPlay,
  setPendingDrawnWildCard,
  socket,
}: CardTableProps) {
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  const cardWidth = 128;
  const handSize = hand.length;
  const maxHandWidth = typeof window !== 'undefined' ? window.innerWidth * 0.8 : 1000;
  
  let cardOverlap = 80;
  if (handSize > 1) {
    const currentWidth = handSize * (cardWidth - cardOverlap) + cardOverlap;
    if (currentWidth > maxHandWidth) {
      cardOverlap = (handSize * cardWidth - maxHandWidth) / (handSize - 1);
    }
  }

  const topCard = gameState.topCard;
  const canJumpIn = gameState.settings.jumpIn;
  const jumpInCardInHand =
    canJumpIn && topCard && !isMyTurn
      ? hand.find(
          (c) => c.color === topCard.color && c.value === topCard.value,
        )
      : undefined;

  const activeCardId =
    hoveredCard ||
    (jumpInCardInHand ? jumpInCardInHand.id : null) ||
    (drawnCardToPlay ? drawnCardToPlay.id : null);
  const activeCardIndex = activeCardId
    ? hand.findIndex((c) => c.id === activeCardId)
    : -1;

  const allCards = gameState.players.flatMap((p) => {
    if (p.id === localPlayerId) {
      return hand.map((card) => ({ ...card, ownerId: p.id }));
    } else {
      return Array.from({ length: p.cardCount }, (_, i) => ({
        id: `${p.id}_card_${i}`,
        ownerId: p.id,
        color: "wild", // dummy value
        value: "0",    // dummy value
        score: 0,      // dummy value
      } as UnoCard & { ownerId: string }));
    }
  });

  const getCardPosition = (
    card: UnoCard & { ownerId: string },
    indexInHand?: number,
  ) => {
    const owner = gameState.players.find((p) => p.id === card.ownerId);
    if (!owner) return { top: "50%", left: "50%" };

    if (owner.id === localPlayerId) {
      const cardIndex = hand.findIndex((c) => c.id === card.id);
      
      let xOffset = (cardIndex - (handSize - 1) / 2) * (cardWidth - cardOverlap);
      let yOffset = 0;
      let rotation = (cardIndex - (handSize - 1) / 2) * 4;
      let zIndex = cardIndex;

      const isCardActive = cardIndex === activeCardIndex;
      const canActiveCardBePopped = isMyTurn || card.id === jumpInCardInHand?.id || card.id === drawnCardToPlay?.id;
      
      let scale = 1;
      if (isMyTurn) {
        scale = 1.25;
      }

      if (activeCardIndex !== -1 && canActiveCardBePopped) {
        if (isCardActive) {
          yOffset = -60; // Pop up
          rotation = 0;
          zIndex = 100;
          scale = 1.4;
        } else {
          const direction = cardIndex < activeCardIndex ? -1 : 1;
          xOffset += direction * (cardWidth / 3);
        }
      }

      return {
        bottom: canActiveCardBePopped && isCardActive ? 120 : 40,
        left: `calc(50% + ${xOffset}px)`,
        transform: `rotate(${rotation}deg) scale(${scale})`,
        zIndex,
        transition: "all 0.2s ease-out",
      };
    } else {
      const opponents = gameState.players.filter((p) => p.id !== localPlayerId);
      const opponentIndex = opponents.findIndex((p) => p.id === owner.id);
      const totalOpponents = opponents.length;
      const angle = (opponentIndex / totalOpponents) * 2 * Math.PI;
      const radius = typeof window !== 'undefined' ? Math.min(window.innerWidth, window.innerHeight) * 0.4 : 300;
      const x = radius * Math.cos(angle - Math.PI / 2);
      const y = radius * Math.sin(angle - Math.PI / 2);
      
      const cardIndex = indexInHand ?? 0;

      return {
        top: `calc(50% + ${y}px)`,
        left: `calc(50% + ${x}px)`,
        transform: `translate(-50%, -50%) rotate(${cardIndex * 5 - (owner.cardCount * 2.5)}deg)`,
        zIndex: opponentIndex * 10 + cardIndex,
      };
    }
  };

  return (
    <div className="absolute inset-0 pointer-events-none">
      <AnimatePresence>
        {allCards.map((card, globalIndex) => {
          const isLocalPlayerCard = card.ownerId === localPlayerId;
          
          const canPlayRegular =
            isLocalPlayerCard && isMyTurn && !drawnCardToPlay &&
            (gameState.stackedDrawCount > 0
              ? (card.value === "draw2" && gameState.stackedCardType === "draw2") || (card.value === "wild_draw4" && (!gameState.stackedCardType || gameState.stackedCardType === "wild_draw4"))
              : card.color === "wild" ||
                card.color === gameState.activeColor ||
                card.value === topCard?.value);

          const isJumpInCard = card.id === jumpInCardInHand?.id;
          const isDrawnCard = card.id === drawnCardToPlay?.id;

          const shouldAnimateOnHover = (isMyTurn || isJumpInCard) && !drawnCardToPlay;
          
          const cardIndexInHand = isLocalPlayerCard ? undefined : allCards.slice(0, globalIndex).filter(c => c.ownerId === card.ownerId).length;

          return (
            <motion.div
              key={card.id}
              layoutId={card.id}
              className="absolute"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1, ...getCardPosition(card, cardIndexInHand) }}
              exit={{ opacity: 0, scale: 0.5 }}
              transition={{ type: "spring", stiffness: 500, damping: 50 }}
              onMouseEnter={() => isLocalPlayerCard && shouldAnimateOnHover && setHoveredCard(card.id)}
              onMouseLeave={() => isLocalPlayerCard && shouldAnimateOnHover && setHoveredCard(null)}
              onClick={() => {
                if (!isLocalPlayerCard) return;

                if (isJumpInCard) {
                  onJumpIn(card.id);
                  return;
                }

                if (!isMyTurn || !canPlayRegular) return;
                onCardPlay(card.id);

              }}
              style={{
                pointerEvents: isLocalPlayerCard ? 'auto' : 'none',
                cursor: isLocalPlayerCard && (isMyTurn || isJumpInCard) && !drawnCardToPlay ? 'pointer' : 'default',
              }}
            >
              <Card card={card} hidden={!isLocalPlayerCard} />
               {isLocalPlayerCard && isJumpInCard && (
                  <>
                    <div className="absolute -top-12 left-1/2 -translate-x-1/2 z-50">
                      <motion.button
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className="px-4 py-2 bg-yellow-500 text-black font-bold rounded-lg shadow-lg whitespace-nowrap"
                      >
                        Jump In!
                      </motion.button>
                    </div>
                  </>
                )}
                {isLocalPlayerCard && isDrawnCard && (
                  <div className="absolute -top-12 left-1/2 -translate-x-1/2 z-50 flex gap-2">
                    <motion.button
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 20 }}
                      className="px-4 py-2 bg-green-600 text-white font-bold rounded-lg shadow-lg whitespace-nowrap"
                      onClick={() => {
                        if (drawnCardToPlay.color === "wild") {
                          setPendingDrawnWildCard(drawnCardToPlay);
                        } else {
                          socket.send(
                            JSON.stringify({
                              type: "PLAY_DRAWN_CARD",
                              payload: { cardId: drawnCardToPlay.id },
                            }),
                          );
                        }
                      }}
                    >
                      Play Card
                    </motion.button>
                    <motion.button
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 20 }}
                      className="px-4 py-2 bg-yellow-500 text-black font-bold rounded-lg shadow-lg whitespace-nowrap"
                      onClick={() =>
                        socket.send(JSON.stringify({ type: "SKIP_TURN" }))
                      }
                    >
                      Skip
                    </motion.button>
                  </div>
                )}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

