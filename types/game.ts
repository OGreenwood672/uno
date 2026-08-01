// types/game.ts

// ==========================================
// 1. CARD DEFINITIONS
// ==========================================

export type CardColor = "red" | "yellow" | "green" | "blue" | "wild";

export type CardValue =
  | "0"
  | "1"
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9"
  | "skip"
  | "reverse"
  | "draw2"
  | "wild"
  | "wild_draw4";

export interface UnoCard {
  /** Unique ID per card instance (crucial for React keys and deck tracking) */
  id: string;
  color: CardColor;
  value: CardValue;
  /** Score value for end-of-round tallying */
  score: number;
}

// ==========================================
// 2. PLAYER & THEME DEFINITIONS
// ==========================================

export type ThemeName = "classic" | "dark-mode" | "neon" | "retro";

export interface Player {
  id: string;
  name: string;
  hand: UnoCard[];
  isReady: boolean;
  isHost: boolean;
  /** Tracks if they have called UNO when down to 1 card */
  hasCalledUno: boolean;
  wins: number;
  /** Optional avatar or customized deck skin per player */
  preferredTheme?: ThemeName;
}

// ==========================================
// 3. GAME STATE (SERVER -> CLIENT)
// ==========================================

export type GameStatus =
  | "waiting"
  | "in_progress"
  | "round_over"
  | "game_over"
  | "bonus_round";
export type TurnDirection = "clockwise" | "counterclockwise";

export interface BonusGame {
  drawerId: string;
  question: string;
  // authorId 'real' for real answer, otherwise player id
  answers: Array<{
    answer: string;
    authorId: string;
  }>;
  requiredDrawCount: number;
  // player ids that have submitted answers
  submittedAnswers: string[];
}

export interface GameSettings {
  startCards: number;
  turnTimer: number;
  jumpIn: boolean;
  bonusCards: boolean;
}

export interface GameState {
  roomCode: string;
  status: GameStatus;
  players: Player[];
  /** Index of the player whose turn it currently is in the players array */
  currentTurnIndex: number;
  direction: TurnDirection;
  settings: GameSettings;

  /** The top card currently visible on the table */
  topCard: UnoCard | null;
  /** The active color (important when a Wild card is played and color changes) */
  activeColor: CardColor;

  /** Remaining cards in the draw pile (send count only to clients to prevent cheating) */
  drawPileCount: number;
  /** Accumulator for stacking Draw 2 / Draw 4 cards (optional house rule) */
  stackedDrawCount: number;
  /** Type of card that initiated the current stack, for stacking rules */
  stackedCardType: "draw2" | "wild_draw4" | null;

  /** Player ID of the round or game winner */
  winnerId?: string;
  turnExpiresAt: number | null;
  bonusGame: BonusGame | null;
}

export type ClientPlayer = Omit<Player, "hand"> & {
  cardCount: number;
  hand?: UnoCard[];
};

/**
 * A sanitized version of the game state sent to a specific client.
 * Hides other players' actual cards to prevent cheating via browser devtools.
 */
export interface ClientGameState extends Omit<GameState, "players"> {
  players: ClientPlayer[];
}

// ==========================================
// 4. CLIENT ACTIONS (CLIENT -> SERVER)
// ==========================================

export type GameAction =
  | {
      type: "JOIN_GAME";
      payload: {
        name: string;
        preferredTheme?: ThemeName;
        settings?: Partial<GameSettings>;
      };
    }
  | { type: "LEAVE_GAME" }
  | { type: "START_GAME" }
  | { type: "UPDATE_SETTINGS"; payload: Partial<GameSettings> }
  | {
      type: "PLAY_CARD";
      payload: {
        cardId: string;
        /** Required if playing a Wild or Wild Draw 4 card */
        selectedColor?: CardColor;
      };
    }
  | {
      type: "JUMP_IN";
      payload: {
        cardId: string;
      };
    }
  | { type: "DRAW_CARD" }
  | { type: "ACCEPT_DRAW_STACK" }
  | { type: "CALL_UNO" }
  | { type: "CATCH_UNO_FAILURE"; payload: { targetPlayerId: string } }
  | { type: "CHANGE_THEME"; payload: { theme: ThemeName } }
  | { type: "CHANGE_NAME"; payload: { name: string } }
  | { type: "SUBMIT_BONUS_ANSWER"; payload: { answer: string } }
  | {
      type: "CHOOSE_BONUS_ANSWER";
      payload: { answer: string; authorId: string };
    }
  | { type: "RESET_GAME" };

// ==========================================
// 5. SERVER MESSAGES (SERVER -> CLIENT)
// ==========================================

export type ServerMessage =
  | { type: "SYNC_STATE"; state: ClientGameState }
  | { type: "ERROR"; message: string }
  | {
      type: "ANNOUNCEMENT";
      message: string;
      variant: "info" | "uno_call" | "penalty" | "win";
    };
