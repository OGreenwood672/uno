"use client";

import { ClientGameState, ClientPlayer } from "@/types/game";
import { useState } from "react";
import type { PartySocket } from "partysocket";

interface BonusGameProps {
  gameState: ClientGameState;
  localPlayer: ClientPlayer;
  socket: PartySocket;
}

export default function BonusGame({
  gameState,
  localPlayer,
  socket,
}: BonusGameProps) {
  const [answer, setAnswer] = useState("");

  if (!gameState.bonusGame) return null;

  const { drawerId, question, answers, submittedAnswers, chosenAnswer, isCorrect } = gameState.bonusGame;
  const drawer = gameState.players.find((p) => p.id === drawerId);

  const isDrawer = localPlayer.id === drawerId;
  const hasSubmitted = submittedAnswers.includes(localPlayer.id);

  const otherPlayersCount = gameState.players.length - 1;
  const areAllAnswersIn = submittedAnswers.length === otherPlayersCount;

  const handleSubmitAnswer = () => {
    console.log("Submitting answer:", answer);
    if (answer.trim()) {
      socket.send(
        JSON.stringify({ type: "SUBMIT_BONUS_ANSWER", payload: { answer } }),
      );
    }
  };

  const handleChooseAnswer = (answer: string, authorId: string) => {
    socket.send(
      JSON.stringify({
        type: "CHOOSE_BONUS_ANSWER",
        payload: { answer, authorId },
      }),
    );
  };

  const renderContent = () => {
    if(chosenAnswer) {
      const realAnswer = answers.find(a => a.authorId === 'real')?.answer;
      return (
        <div>
          <h2 className="text-xl font-bold mb-4">
            {drawer?.name} chose: "{chosenAnswer.answer}"
          </h2>
          {isCorrect ? (
            <p className="text-3xl font-bold text-green-400">Correct!</p>
          ) : (
            <div>
              <p className="text-3xl font-bold text-red-400">Incorrect!</p>
              <p className="text-xl mt-4">The real answer was: "{realAnswer}"</p>
            </div>
          )}
        </div>
      );
    }

    if (isDrawer) {
      if (areAllAnswersIn) {
        return (
          <div>
            <h2 className="text-xl font-bold mb-4">Choose the REAL answer:</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {answers.map(({ answer, authorId }, i) => (
                <button
                  key={i}
                  onClick={() => handleChooseAnswer(answer, authorId)}
                  className="p-4 bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
                >
                  {answer}
                </button>
              ))}
            </div>
          </div>
        );
      } else {
        return (
          <h2 className="text-xl font-bold animate-pulse">
            Waiting for other players to submit their fake answers...
          </h2>
        );
      }
    } else {
      if (hasSubmitted) {
        return (
          <h2 className="text-xl font-bold animate-pulse">
            Waiting for {drawer?.name} to choose...
          </h2>
        );
      } else {
        return (
          <div className="flex flex-col gap-4">
            <input
              type="text"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Enter your clever fake answer..."
              className="p-4 rounded-md bg-gray-800 border-2 border-gray-700"
            />
            <button
              onClick={handleSubmitAnswer}
              className="p-4 bg-green-600 rounded-md hover:bg-green-700 font-bold"
            >
              Submit Answer
            </button>
          </div>
        );
      }
    }
  };

  return (
    <div className="absolute inset-0 bg-black/80 z-50 flex flex-col items-center justify-center text-white">
      <div className="bg-gray-900 p-8 rounded-lg shadow-2xl max-w-2xl w-full text-center">
        <h1 className="text-3xl font-bold mb-4">✨ Bonus Round! ✨</h1>
        <p className="text-xl mb-2">
          <span className="font-bold text-yellow-400">{drawer?.name}</span> has
          to draw cards!
        </p>
        <p className="text-lg mb-6">
          But they can escape if they guess the right answer to this question:
        </p>
        <p className="text-2xl font-bold text-cyan-400 mb-8 p-4 bg-gray-800 rounded-md">
          "{question}"
        </p>

        {renderContent()}
        
      </div>
    </div>
  );
}

