"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

function generateRoomId() {
  return Math.random().toString(36).substring(2, 9);
}

export default function CreateRoomPage() {
  const router = useRouter();
  const [playerName, setPlayerName] = useState("");
  const [startCards, setStartCards] = useState(7);
  const [turnTimer, setTurnTimer] = useState(30);
  const [jumpIn, setJumpIn] = useState(true);
  // Bonus cards can be a more complex object if needed
  const [bonusCards, setBonusCards] = useState(false);

  const handleCreateRoom = () => {
    const newRoomId = generateRoomId();

    const settings = new URLSearchParams({
      name: playerName,
      startCards: startCards.toString(),
      timer: turnTimer.toString(),
      jumpIn: jumpIn.toString(),
      bonus: bonusCards.toString(),
      isHost: "true", // Mark this user as the host
    });

    router.push(`/play/${newRoomId}?${settings.toString()}`);
  };

  return (
    <div className="flex h-screen items-center justify-center bg-gray-900 text-white">
      <div className="w-full max-w-lg p-8 space-y-8 bg-gray-800 rounded-lg shadow-lg">
        <h1 className="text-4xl font-bold text-center">Create Custom Game</h1>

        <div className="space-y-4">
          <div>
            <label className="block mb-2 text-lg font-bold">Your Name</label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Enter your name"
              className="w-full bg-gray-700 text-white py-3 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block mb-2 text-lg font-bold">Starting Cards</label>
            <input
              type="number"
              value={startCards}
              onChange={(e) => setStartCards(parseInt(e.target.value, 10))}
              min="1"
              max="15"
              className="w-full bg-gray-700 text-white py-3 px-4 rounded-lg"
            />
          </div>

          <div>
            <label className="block mb-2 text-lg font-bold">Timer per Turn (0 for none)</label>
            <input
              type="number"
              value={turnTimer}
              onChange={(e) => setTurnTimer(parseInt(e.target.value, 10))}
              min="0"
              max="120"
              step="5"
              className="w-full bg-gray-700 text-white py-3 px-4 rounded-lg"
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-lg font-bold">"Jump-In" Rule</span>
            <label className="switch">
              <input type="checkbox" checked={jumpIn} onChange={(e) => setJumpIn(e.target.checked)} />
              <span className="slider round"></span>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-lg font-bold">Bonus Cards</span>
            <label className="switch">
              <input type="checkbox" checked={bonusCards} onChange={(e) => setBonusCards(e.target.checked)} />
              <span className="slider round"></span>
            </label>
          </div>
        </div>

        <div className="flex gap-4 pt-4">
            <button
              onClick={() => router.push('/')}
              className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-6 rounded-lg transition duration-300"
            >
              Back
            </button>
            <button
              onClick={handleCreateRoom}
              disabled={!playerName.trim()}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition duration-300 disabled:opacity-50"
            >
              Create and Play
            </button>
        </div>
      </div>
      <style jsx>{`
        .switch {
          position: relative;
          display: inline-block;
          width: 60px;
          height: 34px;
        }
        .switch input {
          opacity: 0;
          width: 0;
          height: 0;
        }
        .slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: #ccc;
          transition: .4s;
        }
        .slider:before {
          position: absolute;
          content: "";
          height: 26px;
          width: 26px;
          left: 4px;
          bottom: 4px;
          background-color: white;
          transition: .4s;
        }
        input:checked + .slider {
          background-color: #2196F3;
        }
        input:checked + .slider:before {
          transform: translateX(26px);
        }
        .slider.round {
          border-radius: 34px;
        }
        .slider.round:before {
          border-radius: 50%;
        }
      `}</style>
    </div>
  );
}
