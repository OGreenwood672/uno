// party/game-server.ts
import type * as Party from "partykit/server";
import {
  GameState,
  GameAction,
  ClientGameState,
  Player,
  UnoCard,
  BonusGame,
  GameSettings,
} from "../types/game";
import { drawRandomCard } from "@/utils/deck";
import { questions } from "@/utils/questions";

const DEFAULT_SETTINGS = {
  startCards: 7,
  turnTimer: 30, // 30 seconds, 0 to disable
  jumpIn: true,
  bonusCards: false,
};

export default class UnoServer implements Party.Server {
  gameState: GameState;

  constructor(readonly room: Party.Room) {
    this.gameState = {
      roomCode: this.room.id,
      status: "waiting",
      players: [],
      currentTurnIndex: 0,
      direction: "clockwise",
      topCard: null,
      activeColor: "red", // Default
      drawPileCount: 99,
      stackedDrawCount: 0,
      stackedCardType: null, // Initialize new property
      settings: { ...DEFAULT_SETTINGS },
      turnExpiresAt: null,
      bonusGame: null,
    };
  }

  async onStart() {
    const storedSettings = await this.room.storage.get<GameSettings>("settings");
    if (storedSettings) {
      this.gameState.settings = storedSettings;
    }
  }

  getSanitizedState(targetPlayerId: string): ClientGameState {
    const { turnTimeout, ...restOfState } = this.gameState;
    const sanitizedPlayers = restOfState.players.map((p) => {
      const { hand, ...playerData } = p;
      if (p.id === targetPlayerId) {
        return { ...playerData, hand, cardCount: hand.length };
      }
      return { ...playerData, cardCount: hand.length };
    });

    return {
      ...restOfState,
      players: sanitizedPlayers,
    };
  }

  broadcastState() {
    for (const connection of this.room.getConnections()) {
      const clientState = this.getSanitizedState(connection.id);
      connection.send(
        JSON.stringify({ type: "SYNC_STATE", state: clientState }),
      );
    }
  }

  startBonusGame(drawerId: string, requiredDrawCount: number) {
    if (!this.gameState.settings.bonusCards || Math.random() > 0.2) {
        // if bonus game doesn't start, the player just draws
        const player = this.gameState.players.find((p) => p.id === drawerId);
        if (player) {
            const cardsToDraw = Array.from({ length: requiredDrawCount }, () => drawRandomCard());
            player.hand.push(...cardsToDraw);
            this.gameState.stackedDrawCount = 0;
            this.gameState.stackedCardType = null; // Reset stacked card type
            this.advanceTurn(1);
            this.broadcastState();
        }
        return;
    }

    const randomQuestion =
      questions[Math.floor(Math.random() * questions.length)];

    this.gameState.status = "bonus_round";
    this.gameState.bonusGame = {
      drawerId,
      question: randomQuestion.question,
      answers: [{ answer: randomQuestion.answer, authorId: "real" }],
      requiredDrawCount,
      submittedAnswers: [],
    };

    this.broadcastState();
  }

  async startTurnTimer() {
    await this.room.storage.deleteAlarm();
    if (this.gameState.settings.turnTimer > 0) {
      const currentPlayer =
        this.gameState.players[this.gameState.currentTurnIndex];
      if (!currentPlayer) return;

      console.log(`Starting timer for ${currentPlayer.name}`);
      await this.room.storage.setAlarm(
        Date.now() + this.gameState.settings.turnTimer * 1000,
      );
    }
  }

  advanceTurn(steps: number = 1) {
    const playerCount = this.gameState.players.length;
    if (playerCount === 0) return;
    const stepDirection = this.gameState.direction === "clockwise" ? 1 : -1;
    this.gameState.currentTurnIndex =
      (this.gameState.currentTurnIndex + steps * stepDirection + playerCount) %
      playerCount;

    if (this.gameState.settings.turnTimer > 0) {
      this.gameState.turnExpiresAt =
        Date.now() + this.gameState.settings.turnTimer * 1000;
    } else {
      this.gameState.turnExpiresAt = null;
    }

    this.startTurnTimer();
  }

  onAlarm() {
    if (this.gameState.status === "in_progress") {
      const currentPlayer =
        this.gameState.players[this.gameState.currentTurnIndex];
      console.log(`Timer expired for ${currentPlayer.name}`);
      if (currentPlayer) {
        if (this.gameState.settings.bonusCards) {
          this.startBonusGame(currentPlayer.id, 1);
          return;
        }
        currentPlayer.hand.push(drawRandomCard());
        this.advanceTurn(1);
        this.broadcastState();
      }
    } else if (this.gameState.status === "round_over") {
      this.resetGame();
    }
  }

  onConnect(conn: Party.Connection) {
    console.log(`Player ${conn.id} joined room ${this.room.id}`);
    const clientState = this.getSanitizedState(conn.id);
    conn.send(JSON.stringify({ type: "SYNC_STATE", state: clientState }));
  }

  onClose(conn: Party.Connection) {
    this.handleLeave(conn.id);
  }

  handleLeave(id: string) {
    const playerIndex = this.gameState.players.findIndex((p) => p.id === id);
    if (playerIndex === -1) return;

    const player = this.gameState.players[playerIndex];
    console.log(`Player ${player.name} (${id}) left the room.`);

    this.gameState.players.splice(playerIndex, 1);

    if (player.isHost && this.gameState.players.length > 0) {
      this.gameState.players[0].isHost = true;
      console.log(`Host transferred to ${this.gameState.players[0].name}`);
    }

    if (this.gameState.players.length === 0) {
      this.gameState.status = "waiting";
      this.room.storage.deleteAlarm();
    } else {
      // Adjust current turn if the leaving player was before the current one
      if (playerIndex < this.gameState.currentTurnIndex) {
        this.gameState.currentTurnIndex--;
      } else if (
        this.gameState.currentTurnIndex >= this.gameState.players.length
      ) {
        // If the last player in the list left, wrap around
        this.gameState.currentTurnIndex = 0;
      }

      if (
        this.gameState.status === "in_progress" &&
        this.gameState.players.length < 2
      ) {
        this.gameState.status = "round_over";
        this.gameState.winnerId = this.gameState.players[0].id; // The last one remaining wins
      }
    }

    this.broadcastState();
  }

  onMessage(message: string, sender: Party.Connection) {
    const action = JSON.parse(message) as GameAction;

    switch (action.type) {
      case "LEAVE_GAME": {
        sender.close();
        break;
      }

      case "JOIN_GAME": {
        if (
          this.gameState.status !== "waiting" ||
          this.gameState.players.some((p) => p.id === sender.id)
        )
          return;

        const isHost = this.gameState.players.length === 0;
        if (isHost && action.payload.settings) {
          this.gameState.settings = {
            ...this.gameState.settings,
            ...action.payload.settings,
          };
          this.room.storage.put("settings", this.gameState.settings);
          // Ensure timer is a number, not a string
          if (typeof this.gameState.settings.turnTimer === "string") {
            this.gameState.settings.turnTimer = parseInt(
              this.gameState.settings.turnTimer,
              10,
            );
          }
        }

        const player: Player = {
          id: sender.id,
          name:
            action.payload?.name ||
            `Player ${this.gameState.players.length + 1}`,
          hand: [],
          isReady: false,
          isHost: isHost,
          hasCalledUno: false,
          wins: 0,
        };
        this.gameState.players.push(player);
        this.broadcastState();
        break;
      }

      case "UPDATE_SETTINGS": {
        const player = this.gameState.players.find((p) => p.id === sender.id);
        if (player?.isHost && this.gameState.status === "waiting") {
          this.gameState.settings = {
            ...this.gameState.settings,
            ...action.payload,
          };
          this.room.storage.put("settings", this.gameState.settings);
          this.broadcastState();
        }
        break;
      }

      case "CHANGE_NAME": {
        const player = this.gameState.players.find((p) => p.id === sender.id);
        if (player) {
          player.name = action.payload.name;
          this.broadcastState();
        }
        break;
      }

      case "START_GAME": {
        if (
          this.gameState.status !== "waiting" ||
          this.gameState.players.length < 2
        )
          return;

        this.gameState.players.forEach((player) => {
          player.hand = Array.from(
            { length: this.gameState.settings.startCards },
            () => drawRandomCard(),
          );
        });

        let topCard;
        do {
          topCard = drawRandomCard();
        } while (topCard.color === "wild");

        this.gameState.topCard = topCard;
        this.gameState.activeColor = topCard.color;
        this.gameState.status = "in_progress";
        this.gameState.drawPileCount = 99;
        this.advanceTurn(0); // To start the timer for the first player
        this.broadcastState();
        break;
      }

      case "PLAY_CARD": {
        const playerIndex = this.gameState.players.findIndex(
          (p) => p.id === sender.id,
        );
        if (playerIndex !== this.gameState.currentTurnIndex) return;

        const cardInHand = this.gameState.players[playerIndex].hand.find(
          (c) => c.id === action.payload.cardId,
        );

        if (!cardInHand) return; // Should not happen

        if (this.gameState.stackedDrawCount > 0) {
          if (cardInHand.value !== this.gameState.stackedCardType) {
            return; // Invalid move, must stack matching draw card
          }
        }

        this.handleCardPlay(
          sender.id,
          action.payload.cardId,
          action.payload.selectedColor,
        );
        break;
      }

      case "JUMP_IN": {
        if (!this.gameState.settings.jumpIn) return;

        const playerIndex = this.gameState.players.findIndex(
          (p) => p.id === sender.id,
        );
        if (playerIndex === -1) return;

        // a player can't jump in on their own turn
        if (this.gameState.currentTurnIndex === playerIndex) return;

        const player = this.gameState.players[playerIndex];
        const cardInHand = player.hand.find(
          (c) => c.id === action.payload.cardId,
        );

        if (!cardInHand || !this.gameState.topCard) return;

        // Jump-in requires an identical card (color and value)
        if (
          cardInHand.color !== "wild" &&
          cardInHand.color === this.gameState.topCard.color &&
          cardInHand.value === this.gameState.topCard.value
        ) {
          // set the current turn to the player who is jumping in
          this.gameState.currentTurnIndex = playerIndex;

          // handle the card play, which will advance the turn from this new current player
          this.handleCardPlay(sender.id, action.payload.cardId);
        }
        break;
      }

      case "ACCEPT_DRAW_STACK": {
        const playerIndex = this.gameState.players.findIndex(
          (p) => p.id === sender.id,
        );
        if (
          playerIndex !== this.gameState.currentTurnIndex ||
          this.gameState.stackedDrawCount === 0
        )
          return;

        if (this.gameState.settings.bonusCards) {
          this.startBonusGame(sender.id, this.gameState.stackedDrawCount);
          this.gameState.stackedDrawCount = 0;
          this.gameState.stackedCardType = null; // Reset stacked card type
          return;
        }

        const player = this.gameState.players[playerIndex];
        const cardsToDraw = Array.from(
          { length: this.gameState.stackedDrawCount },
          () => drawRandomCard(),
        );
        player.hand.push(...cardsToDraw);

        this.gameState.stackedDrawCount = 0;
        this.gameState.stackedCardType = null; // Reset stacked card type
        this.advanceTurn(1); // Skip this player's turn
        this.broadcastState();
        break;
      }

      case "DRAW_CARD": {
        const playerIndex = this.gameState.players.findIndex(
          (p) => p.id === sender.id,
        );
        if (playerIndex !== this.gameState.currentTurnIndex) return;

        if (this.gameState.settings.bonusCards) {
          this.startBonusGame(sender.id, 1);
          return;
        }

        const player = this.gameState.players[playerIndex];
        player.hand.push(drawRandomCard());

        this.advanceTurn(1);
        this.broadcastState();
        break;
      }
      case "CALL_UNO": {
        const player = this.gameState.players.find((p) => p.id === sender.id);
        if (player) {
          player.hasCalledUno = true;
          this.broadcastState();
        }
        break;
      }
      case "SUBMIT_BONUS_ANSWER": {
        if (
          this.gameState.status !== "bonus_round" ||
          !this.gameState.bonusGame ||
          sender.id === this.gameState.bonusGame.drawerId
        ) {
          return;
        }

        this.gameState.bonusGame.answers.push({
          answer: action.payload.answer,
          authorId: sender.id,
        });
        this.gameState.bonusGame.submittedAnswers.push(sender.id);

        const otherPlayers = this.gameState.players.filter(
          (p) => p.id !== this.gameState.bonusGame?.drawerId,
        );
        if (
          this.gameState.bonusGame.submittedAnswers.length ===
          otherPlayers.length
        ) {
          this.gameState.bonusGame.answers = this.shuffle(
            this.gameState.bonusGame.answers,
          );
        }

        this.broadcastState();
        break;
      }
      case "CHOOSE_BONUS_ANSWER": {
        if (
          this.gameState.status !== "bonus_round" ||
          !this.gameState.bonusGame ||
          sender.id !== this.gameState.bonusGame.drawerId
        ) {
          return;
        }

        const { authorId } = action.payload;
        const drawer = this.gameState.players.find(
          (p) => p.id === this.gameState.bonusGame?.drawerId,
        );

        if (authorId === "real") {
          // Correct answer! Nothing happens to the drawer
        } else {
          // Incorrect answer
          if (drawer) {
            const cardsToDraw = Array.from(
              { length: 3 }, // Fixed penalty to 3 cards
              () => drawRandomCard(),
            );
            drawer.hand.push(...cardsToDraw);
          }

          const author = this.gameState.players.find(
            (p) => p.id === authorId,
          );
          if (author && author.hand.length > 0) {
            const cardToRemoveIndex = Math.floor(
              Math.random() * author.hand.length,
            );
            author.hand.splice(cardToRemoveIndex, 1);
            if (author.hand.length === 0) {
              this.gameState.status = "round_over";
              this.gameState.winnerId = author.id;
              author.wins++;
              this.room.storage.setAlarm(Date.now() + 5000);
            }
          }
        }

        if (this.gameState.status !== "round_over") {
          this.gameState.status = "in_progress";
          this.gameState.bonusGame = null;
          this.advanceTurn(1); // Turn moves to the next player
        }
        this.broadcastState();
        break;
      }
      case "RESET_GAME": {
        this.resetGame();
        break;
      }
    }
  }

  handleCardPlay(
    playerId: string,
    cardId: string,
    selectedColor?: "red" | "yellow" | "green" | "blue" | "wild",
  ) {
    const playerIndex = this.gameState.players.findIndex(
      (p) => p.id === playerId,
    );
    const player = this.gameState.players[playerIndex];
    const cardIndex = player.hand.findIndex((c) => c.id === cardId);
    if (cardIndex === -1) return;

    const playedCard = player.hand[cardIndex];
    const isWild = playedCard.color === "wild";
    const matchesColor = playedCard.color === this.gameState.activeColor;
    const matchesValue = playedCard.value === this.gameState.topCard?.value;

    if (!isWild && !matchesColor && !matchesValue) return;

    player.hand.splice(cardIndex, 1);
    this.gameState.topCard = playedCard;
    this.gameState.activeColor = isWild
      ? selectedColor || "red"
      : playedCard.color;

    let skipNext = false;
    if (playedCard.value === "reverse") {
      this.gameState.direction =
        this.gameState.direction === "clockwise"
          ? "counterclockwise"
          : "clockwise";
      if (this.gameState.players.length === 2) skipNext = true;
    } else if (playedCard.value === "skip") {
      skipNext = true;
    } else if (playedCard.value === "draw2") {
      this.gameState.stackedDrawCount += 2;
      this.gameState.stackedCardType = "draw2";
    } else if (playedCard.value === "wild_draw4") {
      this.gameState.stackedDrawCount += 4;
      this.gameState.stackedCardType = "wild_draw4";
    }

    if (player.hand.length === 1 && !player.hasCalledUno) {
      const penaltyCards = Array.from({ length: 5 }, () => drawRandomCard());
      player.hand.push(...penaltyCards);
    } else if (player.hand.length > 1 && player.hasCalledUno) {
      player.hasCalledUno = false;
    }

    if (player.hand.length === 0) {
      this.gameState.status = "round_over";
      this.gameState.winnerId = player.id;
      player.wins++;
      this.room.storage.setAlarm(Date.now() + 5000); // 5 seconds to show winner
    } else {
      this.advanceTurn(skipNext ? 2 : 1);
    }

    this.broadcastState();
  }

  resetGame() {
    this.gameState.status = "waiting";
    this.gameState.topCard = null;
    this.gameState.stackedDrawCount = 0;
    this.gameState.stackedCardType = null; // Reset stacked card type
    this.gameState.winnerId = undefined;
    this.gameState.bonusGame = null;
    this.gameState.direction = "clockwise";
    this.gameState.players.forEach((p) => {
      p.hand = [];
      p.isReady = false;
      p.hasCalledUno = false;
    });
    this.broadcastState();
  }

  shuffle<T>(array: T[]): T[] {
    let currentIndex = array.length,
      randomIndex;

    // While there remain elements to shuffle.
    while (currentIndex != 0) {
      // Pick a remaining element.
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex--;

      // And swap it with the current element.
      [array[currentIndex], array[randomIndex]] = [
        array[randomIndex],
        array[currentIndex],
      ];
    }

    return array;
  }
}
