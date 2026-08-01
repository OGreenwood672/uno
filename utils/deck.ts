// utils/deck.ts
import { CardColor, CardValue, UnoCard } from "../types/game";

// Helper to generate unique IDs
const generateId = () => crypto.randomUUID();

// Card distribution in a standard 108-card deck
const CARD_DISTRIBUTION: { value: CardValue; color?: CardColor; count: number; score: number }[] = [
  // Numbers
  { value: "0", count: 1, score: 0 },
  { value: "1", count: 2, score: 1 },
  { value: "2", count: 2, score: 2 },
  { value: "3", count: 2, score: 3 },
  { value: "4", count: 2, score: 4 },
  { value: "5", count: 2, score: 5 },
  { value: "6", count: 2, score: 6 },
  { value: "7", count: 2, score: 7 },
  { value: "8", count: 2, score: 8 },
  { value: "9", count: 2, score: 9 },
  // Actions
  { value: "skip", count: 2, score: 20 },
  { value: "reverse", count: 2, score: 20 },
  { value: "draw2", count: 2, score: 20 },
  // Wilds (colorless)
  { value: "wild", color: "wild", count: 4, score: 50 },
  { value: "wild_draw4", color: "wild", count: 4, score: 50 },
];

const PROBABILITY_DECK: { value: CardValue; color: CardColor; score: number }[] = [];
const colors: CardColor[] = ["red", "yellow", "green", "blue"];

for (const template of CARD_DISTRIBUTION) {
  if (template.color === "wild") {
    for (let i = 0; i < template.count; i++) {
      PROBABILITY_DECK.push({
        value: template.value,
        color: "wild",
        score: template.score,
      });
    }
  } else {
    for (const color of colors) {
      for (let i = 0; i < template.count; i++) {
        PROBABILITY_DECK.push({
          value: template.value,
          color: color,
          score: template.score,
        });
      }
    }
  }
}

/**
 * Draws a single random card based on standard UNO deck distribution.
 */
export function drawRandomCard(): UnoCard {
  const randomIndex = Math.floor(Math.random() * PROBABILITY_DECK.length);
  const template = PROBABILITY_DECK[randomIndex];
  return {
    ...template,
    id: generateId(),
  };
}

export function createDeck(): UnoCard[] {
  const deck: UnoCard[] = [];

  for (const color of colors) {
    // One '0' card per color
    deck.push({ id: generateId(), color, value: "0", score: 0 });

    // Two of each number 1-9 per color
    for (let i = 1; i <= 9; i++) {
      const value = i.toString() as CardValue;
      deck.push({ id: generateId(), color, value, score: i });
      deck.push({ id: generateId(), color, value, score: i });
    }

    // Two of each action card per color
    const actionCards: CardValue[] = ["skip", "reverse", "draw2"];
    for (const action of actionCards) {
      deck.push({ id: generateId(), color, value: action, score: 20 });
      deck.push({ id: generateId(), color, value: action, score: 20 });
    }
  }

  // Four Wild and Four Wild Draw 4 cards
  for (let i = 0; i < 4; i++) {
    deck.push({ id: generateId(), color: "wild", value: "wild", score: 50 });
    deck.push({
      id: generateId(),
      color: "wild",
      value: "wild_draw4",
      score: 50,
    });
  }

  return deck;
}

// Fisher-Yates Shuffle Algorithm
export function shuffleDeck(deck: UnoCard[]): UnoCard[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
