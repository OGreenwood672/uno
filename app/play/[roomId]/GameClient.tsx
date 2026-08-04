"use client";

import { useState, useEffect, useMemo } from "react";
import usePartySocket from "partysocket/react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  ClientGameState,
  GameSettings,
  ThemeName,
  ClientPlayer,
} from "../../../types/game";
import Card from "../../../components/game/Card";
import { AnimatePresence, motion } from "framer-motion";
import LobbySettings from "@/components/game/LobbySettings";
import TurnTimer from "@/components/game/TurnTimer";
import BonusGame from "@/components/game/BonusGame";
import WinnerDisplay from "@/components/game/WinnerDisplay";
import ColorPicker from "@/components/game/ColorPicker";
import CardTable from "@/components/game/CardTable";
import { ServerMessage, UnoCard } from "@/types/game";

type SortStrategy = "color" | "number";

export default function GameClient({ roomId }: { roomId: string }) {
  const [gameState, setGameState] = useState<ClientGameState | null>(null);
  const [playerName, setPlayerName] = useState("");
  const [newPlayerName, setNewPlayerName] = useState("");
  const [theme, setTheme] = useState<ThemeName>("classic");
  const [sortStrategy, setSortStrategy] = useState<SortStrategy>("color");
  const [showSortOptions, setShowSortOptions] = useState(false);
  const [isEditingSettings, setIsEditingSettings] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isLinkCopied, setIsLinkCopied] = useState(false);
  const [announcement, setAnnouncement] = useState<ServerMessage | null>(null);
  const [pendingDrawnWildCard, setPendingDrawnWildCard] =
    useState<UnoCard | null>(null);
  const [pendingWildCard, setPendingWildCard] = useState<UnoCard | null>(null);
  const [viewportSize, setViewportSize] = useState({
    width: 1200,
    height: 800,
  });

  const searchParams = useSearchParams();
  const router = useRouter();

  const socket = usePartySocket({
    host: process.env.NEXT_PUBLIC_PARTYKIT_HOST || "localhost:1999",
    // party: "unoServer",
    room: roomId,
    onMessage(event) {
      const data = JSON.parse(event.data);
      if (data.type === "SYNC_STATE") {
        setGameState(data.state);
      } else if (data.type === "ANNOUNCEMENT") {
        setAnnouncement(data);
      }
    },
  });

  const localPlayer = useMemo(
    () =>
      (gameState?.players.find((p) => p.id === socket.id) as ClientPlayer) ??
      null,
    [gameState, socket.id],
  );

  useEffect(() => {
    if (announcement) {
      const timer = setTimeout(() => {
        setAnnouncement(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [announcement]);

  useEffect(() => {
    if (localPlayer) {
      setNewPlayerName(localPlayer.name);
    }
  }, [localPlayer]);

  const getSettingsFromUrl = () => {
    if (!searchParams.get("isHost")) return undefined;
    return {
      startCards: parseInt(searchParams.get("startCards") || "7", 10),
      turnTimer: parseInt(searchParams.get("timer") || "0", 10),
      jumpIn: searchParams.get("jumpIn") === "true",
      bonusCards: searchParams.get("bonus") === "true",
      rotate: searchParams.get("rotate") === "true",
    };
  };

  useEffect(() => {
    const nameFromUrl = searchParams.get("name");
    if (nameFromUrl && !localPlayer) {
      setPlayerName(nameFromUrl);
      const settings = getSettingsFromUrl();
      socket.send(
        JSON.stringify({
          type: "JOIN_GAME",
          payload: { name: nameFromUrl, preferredTheme: theme, settings },
        }),
      );
    }
  }, [searchParams, localPlayer, socket, theme]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    const updateViewportSize = () => {
      setViewportSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    updateViewportSize();
    window.addEventListener("resize", updateViewportSize);

    return () => {
      window.removeEventListener("resize", updateViewportSize);
    };
  }, []);

  useEffect(() => {
    if (!gameState?.turnExpiresAt) {
      setTimeRemaining(0);
      return;
    }

    const interval = setInterval(() => {
      const remaining = Math.max(
        0,
        (gameState.turnExpiresAt! - Date.now()) / 1000,
      );
      setTimeRemaining(remaining);
    }, 500);

    return () => clearInterval(interval);
  }, [gameState?.turnExpiresAt]);

  const opponents = useMemo(
    () => gameState?.players.filter((p) => p.id !== socket.id) ?? [],
    [gameState, socket.id],
  );

  const sortedHand = useMemo(() => {
    if (!localPlayer?.hand) return [];
    const hand = [...localPlayer.hand];

    switch (sortStrategy) {
      case "color":
        return hand.sort((a, b) => {
          if (a.color !== b.color) return a.color.localeCompare(b.color);
          return a.value.localeCompare(b.value);
        });
      case "number":
        return hand.sort((a, b) => {
          if (a.value !== b.value) return a.value.localeCompare(b.value);
          return a.color.localeCompare(b.color);
        });
      default:
        return hand;
    }
  }, [localPlayer?.hand, sortStrategy]);

  const handlePlayCard = (cardId: string, selectedColor?: string) => {
    const card = localPlayer?.hand?.find((c) => c.id === cardId);
    if (card?.color === "wild") {
      setPendingWildCard(card);
    } else {
      socket.send(
        JSON.stringify({
          type: "PLAY_CARD",
          payload: { cardId, selectedColor },
        }),
      );
    }
  };

  const handleJumpIn = (cardId: string) => {
    socket.send(
      JSON.stringify({
        type: "JUMP_IN",
        payload: { cardId },
      }),
    );
  };

  const handleLeaveGame = () => {
    socket.send(JSON.stringify({ type: "LEAVE_GAME" }));
    router.push("/");
  };

  const handleCopyLink = () => {
    const url = window.location.href.split("?")[0];
    navigator.clipboard.writeText(url).then(() => {
      setIsLinkCopied(true);
      setTimeout(() => setIsLinkCopied(false), 2000);
    });
  };

  const joinGame = () => {
    if (!playerName.trim()) return;

    let settings: Partial<GameSettings> | undefined = undefined;
    if (searchParams.get("isHost")) {
      settings = {
        startCards: parseInt(searchParams.get("startCards") || "7", 10),
        turnTimer: parseInt(searchParams.get("timer") || "30", 10),
        jumpIn: searchParams.get("jumpIn") === "true",
        bonusCards: searchParams.get("bonus") === "true",
      };
    }

    socket.send(
      JSON.stringify({
        type: "JOIN_GAME",
        payload: { name: playerName, preferredTheme: theme, settings },
      }),
    );
  };

  const handleChangeName = () => {
    if (newPlayerName.trim() && newPlayerName !== localPlayer?.name) {
      socket.send(
        JSON.stringify({
          type: "CHANGE_NAME",
          payload: { name: newPlayerName },
        }),
      );
    }
    setIsEditingName(false);
  };

  const startGame = () => {
    socket.send(JSON.stringify({ type: "START_GAME" }));
  };

  const isMyTurn = useMemo(() => {
    if (!gameState || !localPlayer) return false;
    return gameState.players[gameState.currentTurnIndex]?.id === localPlayer.id;
  }, [gameState, localPlayer]);

  const findJumpInCard = useMemo(() => {
    if (
      !gameState ||
      !gameState.settings.jumpIn ||
      !localPlayer?.hand ||
      !gameState.topCard
    ) {
      return null;
    }
    return localPlayer.hand.find(
      (card) =>
        card.color === gameState.topCard?.color &&
        card.value === gameState.topCard?.value,
    );
  }, [gameState, localPlayer?.hand]);

  const renderPlayer = (player: any, index: number, total: number) => {
    if (!gameState) return null;

    const isCurrentTurn =
      gameState.players[gameState.currentTurnIndex]?.id === player.id;
    const angle = (index / total) * 2 * Math.PI;
    const radius = Math.min(viewportSize.width, viewportSize.height) * 0.35;
    const x = radius * Math.cos(angle - Math.PI / 2);
    const y = radius * Math.sin(angle - Math.PI / 2);

    const cardCount = player.cardCount ?? 0;
    const maxVisibleCards = 10;

    const isChoosingSwap = gameState.playerChoosingSwapId === player.id;

    return (
      <motion.div
        key={player.id}
        className={`absolute ${isChoosingSwap ? "cursor-pointer" : ""}`}
        initial={{ x: 0, y: 0, scale: 0 }}
        animate={{
          x,
          y,
          scale: 1,
        }}
        transition={{ type: "spring", stiffness: 120, damping: 15 }}
        style={{
          filter: isCurrentTurn
            ? "drop-shadow(0 0 20px rgba(255, 255, 0, 0.9))"
            : "none",
          transition: "filter 0.3s ease-in-out",
        }}
        onClick={() => {
          if (isChoosingSwap) {
            socket.send(
              JSON.stringify({
                type: "SWAP_HAND",
                payload: { targetPlayerId: player.id },
              }),
            );
          }
        }}
      >
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-2">
            <div className="rounded-full bg-black/50 px-4 py-1 text-base font-bold text-white backdrop-blur-md">
              {player.name} ({cardCount})
            </div>
            {isCurrentTurn && gameState.settings.turnTimer > 0 && (
              <TurnTimer
                remaining={timeRemaining}
                duration={gameState.settings.turnTimer}
                size="small"
              />
            )}
          </div>
        </div>
      </motion.div>
    );
  };

  if (!gameState) {
    return (
      <div className="flex h-screen items-center justify-center bg-background font-bold text-2xl text-brand">
        Connecting to Server...
      </div>
    );
  }

  if (gameState.status === "waiting") {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-gray-900 text-white">
        <h1 className="text-5xl font-bold mb-4">Room: {roomId}</h1>
        <div className="flex items-center gap-4 mb-8">
          <p className="text-xl">Waiting for players to join...</p>
          {localPlayer?.isHost && (
            <button
              onClick={handleCopyLink}
              className="px-4 py-2 bg-blue-600/80 text-white font-bold rounded-lg shadow-lg backdrop-blur-md hover:bg-blue-700"
            >
              {isLinkCopied ? "Link Copied!" : "Copy Link"}
            </button>
          )}
        </div>
        <div className="mt-8">
          {!localPlayer && !searchParams.get("name") && (
            <div className="flex flex-col gap-2">
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Enter your name to join"
                className="rounded-md border-2 border-gray-700 bg-gray-800 px-4 py-2 text-white"
              />
              <button
                onClick={joinGame}
                className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
              >
                Join Game
              </button>
            </div>
          )}
          {localPlayer && (
            <div className="flex flex-col gap-4">
              {localPlayer.isHost ? (
                isEditingSettings ? (
                  <LobbySettings
                    settings={gameState.settings}
                    socket={socket}
                    onSave={() => setIsEditingSettings(false)}
                    onCancel={() => setIsEditingSettings(false)}
                  />
                ) : (
                  <div className="mb-4 text-left p-4 bg-gray-800/50 rounded-lg w-full max-w-md">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="text-xl font-bold">Game Settings</h3>
                      <button
                        onClick={() => setIsEditingSettings(true)}
                        className="text-sm bg-blue-600 px-3 py-1 rounded-md hover:bg-blue-700"
                      >
                        Edit
                      </button>
                    </div>
                    <ul className="list-disc list-inside">
                      <li>Start Cards: {gameState.settings.startCards}</li>
                      <li>
                        Turn Timer:{" "}
                        {gameState.settings.turnTimer > 0
                          ? `${gameState.settings.turnTimer}s`
                          : "Off"}
                      </li>
                      <li>
                        Jump-In Rule: {gameState.settings.jumpIn ? "On" : "Off"}
                      </li>
                      <li>
                        Jack's Box:{" "}
                        {gameState.settings.bonusCards ? "On" : "Off"}
                      </li>
                      <li>
                        Rotate Mode: {gameState.settings.rotate ? "On" : "Off"}
                      </li>
                    </ul>
                  </div>
                )
              ) : (
                <div className="mb-4 text-left p-4 bg-gray-800/50 rounded-lg">
                  <h3 className="text-xl font-bold">Game Settings:</h3>
                  <ul className="list-disc list-inside">
                    <li>Start Cards: {gameState.settings.startCards}</li>
                    <li>
                      Turn Timer:{" "}
                      {gameState.settings.turnTimer > 0
                        ? `${gameState.settings.turnTimer}s`
                        : "Off"}
                    </li>
                    <li>
                      Jump-In Rule: {gameState.settings.jumpIn ? "On" : "Off"}
                    </li>
                    <li>
                      Jack's Box: {gameState.settings.bonusCards ? "On" : "Off"}
                    </li>
                  </ul>
                </div>
              )}
              {localPlayer.isHost && (
                <button
                  onClick={startGame}
                  disabled={gameState.players.length < 2}
                  className="rounded-md bg-green-600 px-8 py-4 text-2xl text-white disabled:cursor-not-allowed disabled:opacity-50 hover:bg-green-700"
                >
                  Start Game ({gameState.players.length} players)
                </button>
              )}
            </div>
          )}
        </div>
        <div className="mt-8 w-1/2">
          <h2 className="text-3xl font-bold">Players:</h2>
          <ul className="mt-4 flex flex-col gap-2">
            {gameState.players.map((p) => (
              <li
                key={p.id}
                className={`text-lg bg-gray-800 p-2 rounded flex justify-between items-center ${p.id === localPlayer?.id ? "border-2 border-yellow-400" : ""}`}
              >
                {p.id === localPlayer?.id && isEditingName ? (
                  <div className="flex-grow flex items-center gap-2">
                    <input
                      type="text"
                      value={newPlayerName}
                      onChange={(e) => setNewPlayerName(e.target.value)}
                      className="bg-gray-700 text-white py-1 px-2 rounded-lg flex-grow"
                    />
                    <button
                      onClick={handleChangeName}
                      className="bg-green-600 hover:bg-green-700 text-white font-bold py-1 px-2 rounded-lg"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setIsEditingName(false)}
                      className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-1 px-2 rounded-lg"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <>
                    <span>
                      {p.name} {p.id === localPlayer?.id ? "(You)" : ""}{" "}
                      {p.isHost && "(Host)"}
                    </span>
                    <div className="flex items-center gap-4">
                      <span>Wins: {p.wins}</span>
                      {p.id === localPlayer?.id && (
                        <button
                          onClick={() => setIsEditingName(true)}
                          className="text-sm bg-blue-600 px-3 py-1 rounded-md hover:bg-blue-700"
                        >
                          Edit Name
                        </button>
                      )}
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[var(--color-background)] transition-colors duration-300">
      <AnimatePresence>
        {announcement && "message" in announcement && (
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            className="absolute top-20 z-50 bg-yellow-400 text-black font-bold py-2 px-6 rounded-lg shadow-lg"
          >
            {announcement.message}
          </motion.div>
        )}
      </AnimatePresence>

      {gameState.status === "round_over" && (
        <WinnerDisplay gameState={gameState} />
      )}
      <header className="absolute top-0 left-0 z-40 flex w-full items-center justify-between p-4">
        <div className="text-xl font-black tracking-wider shadow-sm text-[var(--color-brand)]">
          UNO ROOM: {roomId}
        </div>
        <div className="flex items-center gap-4">
          <select
            value={theme}
            onChange={(e) => setTheme(e.target.value as ThemeName)}
            className="rounded border border-[var(--color-brand)] bg-black/10 p-2 text-sm font-bold text-[var(--color-brand)] outline-none backdrop-blur-md"
          >
            <option value="classic">Classic</option>
            <option value="dark-mode">Dark Mode</option>
            <option value="neon">Neon</option>
          </select>
          <button
            onClick={handleLeaveGame}
            className="px-4 py-2 bg-red-600/80 text-white font-bold rounded-lg shadow-lg backdrop-blur-md hover:bg-red-700"
          >
            Rage Quit
          </button>
        </div>
      </header>

      {isMyTurn && gameState.settings.turnTimer > 0 && (
        <div className="absolute top-1/2 -translate-y-1/2 left-4 z-50">
          <TurnTimer
            remaining={timeRemaining}
            duration={gameState.settings.turnTimer}
            size="large"
          />
        </div>
      )}

      {gameState.playerChoosingSwapId === localPlayer?.id && (
        <div className="absolute top-1/2 -translate-y-1/2 z-50 bg-blue-600 text-white p-4 rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold">
            Choose a player to swap hands with!
          </h2>
        </div>
      )}

      <div className="absolute top-4 right-4 z-50">
        <AnimatePresence>
          {gameState.stackedDrawCount > 0 && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className="flex flex-col items-center justify-center bg-red-800/80 border-4 border-red-500 rounded-full w-24 h-24 shadow-2xl"
            >
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="text-white font-black text-4xl"
              >
                +{gameState.stackedDrawCount}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="absolute flex h-full w-full items-center justify-center">
        {opponents.map((p, i) => renderPlayer(p, i, opponents.length))}
      </div>

      <CardTable gameState={gameState} localPlayerId={socket.id} />

      <div className="z-10 flex flex-col items-center justify-center gap-6">
        <div className="flex items-center justify-center gap-4">
          {isMyTurn && gameState.stackedDrawCount > 0 ? (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() =>
                socket.send(JSON.stringify({ type: "ACCEPT_DRAW_STACK" }))
              }
              className="px-6 py-4 bg-red-600 text-white font-bold rounded-lg shadow-lg text-xl"
            >
              Draw {gameState.stackedDrawCount} Cards
            </motion.button>
          ) : (
            <motion.div
              className="relative cursor-pointer"
              whileHover={{ scale: 1.05, y: -5 }}
              whileTap={{ scale: 0.95 }}
              onClick={() =>
                isMyTurn &&
                gameState.stackedDrawCount === 0 &&
                socket.send(JSON.stringify({ type: "DRAW_CARD" }))
              }
            >
              <Card hidden layoutId="draw-pile-top" />
            </motion.div>
          )}

          <div className="flex flex-col items-center gap-2">
            <div className="relative h-48 w-32">
              <AnimatePresence>
                {gameState.topCard && (
                  <Card
                    key={gameState.topCard.id}
                    card={gameState.topCard}
                    activeColor={
                      gameState.topCard.color === "wild"
                        ? gameState.activeColor
                        : undefined
                    }
                    layoutId={gameState.topCard.id}
                    className="absolute top-0 left-0"
                    initial={{ rotate: Math.random() * 20 - 10, scale: 1.2 }}
                    animate={{ rotate: Math.random() * 10 - 5, scale: 1 }}
                    transition={{
                      type: "spring",
                      stiffness: 200,
                      damping: 20,
                    }}
                  />
                )}
              </AnimatePresence>
            </div>
            <span className="rounded-full bg-black/20 px-4 py-1 text-md font-bold capitalize text-[var(--color-brand)] backdrop-blur-sm">
              {gameState.activeColor.replace("wild", "")}
            </span>
          </div>
        </div>
      </div>

      {localPlayer && (
        <div className="absolute right-6 bottom-6 z-30">
          <div className="relative">
            <AnimatePresence>
              {showSortOptions && (
                <motion.div
                  className="absolute bottom-14 right-0 mb-2 flex flex-col gap-2"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                >
                  <button
                    onClick={() => {
                      setSortStrategy("color");
                      setShowSortOptions(false);
                    }}
                    className="w-28 rounded-md bg-black/60 px-3 py-2 text-sm font-bold text-white backdrop-blur-md hover:bg-black/80"
                  >
                    By Color
                  </button>
                  <button
                    onClick={() => {
                      setSortStrategy("number");
                      setShowSortOptions(false);
                    }}
                    className="w-28 rounded-md bg-black/60 px-3 py-2 text-sm font-bold text-white backdrop-blur-md hover:bg-black/80"
                  >
                    By Number
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
            <button
              onClick={() => setShowSortOptions((prev) => !prev)}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-black/60 text-2xl font-bold text-white backdrop-blur-md hover:bg-black/80"
            >
              ⇅
            </button>
          </div>
        </div>
      )}

      <AnimatePresence>
        {localPlayer &&
          localPlayer.hand &&
          localPlayer.hand.length === 2 &&
          isMyTurn && (
            <motion.button
              initial={{ scale: 0, opacity: 0 }}
              animate={{
                scale: 1,
                opacity: 1,
                transition: { delay: 0.5, type: "spring" },
              }}
              exit={{ scale: 0, opacity: 0 }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => socket.send(JSON.stringify({ type: "CALL_UNO" }))}
              className={`absolute bottom-40 font-bold py-4 px-6 rounded-full text-2xl shadow-lg ${
                localPlayer.hasCalledUno
                  ? "bg-green-500 text-white cursor-not-allowed"
                  : "bg-red-600 text-white animate-pulse"
              }`}
              disabled={localPlayer.hasCalledUno}
              style={{ left: "50%", transform: "translateX(-50%)" }}
            >
              {localPlayer.hasCalledUno ? "UNO CALLED!" : "CALL UNO!"}
            </motion.button>
          )}
      </AnimatePresence>

      <div
        className="pointer-events-none absolute bottom-0 left-0 z-20 flex w-full flex-col items-center pb-8"
        style={{
          filter: isMyTurn
            ? "drop-shadow(0 0 30px rgba(255, 255, 150, 0.7))"
            : "none",
          transition: "filter 0.5s ease-in-out",
        }}
      >
        <AnimatePresence>
          {pendingWildCard && (
            <ColorPicker
              onColorSelect={(color) => {
                handlePlayCard(pendingWildCard.id, color);
                setPendingWildCard(null);
              }}
              onCancel={() => setPendingWildCard(null)}
            />
          )}
          {pendingDrawnWildCard && (
            <ColorPicker
              onColorSelect={(color) => {
                socket.send(
                  JSON.stringify({
                    type: "PLAY_DRAWN_CARD",
                    payload: {
                      cardId: pendingDrawnWildCard.id,
                      selectedColor: color,
                    },
                  }),
                );
                setPendingDrawnWildCard(null);
              }}
              onCancel={() => setPendingDrawnWildCard(null)}
            />
          )}
        </AnimatePresence>
        {localPlayer?.hasDrawnCard &&
          localPlayer.hand &&
          isMyTurn &&
          (() => {
            const drawnCard = localPlayer.hand[localPlayer.hand.length - 1];
            const canPlayDrawnCard =
              drawnCard.color === "wild" ||
              drawnCard.color === gameState.activeColor ||
              drawnCard.value === gameState.topCard?.value;

            return (
              <div className="flex gap-4 mt-4">
                <button
                  onClick={() => {
                    if (drawnCard.color === "wild") {
                      setPendingDrawnWildCard(drawnCard);
                    } else {
                      socket.send(
                        JSON.stringify({
                          type: "PLAY_DRAWN_CARD",
                          payload: { cardId: drawnCard.id },
                        }),
                      );
                    }
                  }}
                  disabled={!canPlayDrawnCard}
                  className="px-6 py-3 bg-green-600 text-white font-bold rounded-lg shadow-lg disabled:bg-gray-500"
                >
                  Play Card
                </button>
                <button
                  onClick={() =>
                    socket.send(JSON.stringify({ type: "SKIP_TURN" }))
                  }
                  className="px-6 py-3 bg-yellow-500 text-black font-bold rounded-lg shadow-lg"
                >
                  Skip
                </button>
              </div>
            );
          })()}
      </div>
      {gameState.status === "bonus_round" && localPlayer && (
        <BonusGame
          gameState={gameState}
          localPlayer={localPlayer}
          socket={socket}
        />
      )}
    </div>
  );
}
