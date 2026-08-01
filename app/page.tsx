"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

function generateRoomId() {
  return Math.random().toString(36).substring(2, 9);
}

export default function HomePage() {
  const router = useRouter();
  const [roomId, setRoomId] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [showJoin, setShowJoin] = useState(false);

  const handleCreateRoom = () => {
    const newRoomId = generateRoomId();
    // We can pass player name as a query param to the waiting room
    router.push(`/play/${newRoomId}`);
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (roomId.trim() && playerName.trim()) {
      router.push(`/play/${roomId}?name=${playerName}`);
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-gray-900 text-white">
      <div className="text-center">
        <h1 className="text-6xl font-bold mb-8">UNO Online</h1>
        {!showJoin ? (
          <div className="space-y-4">
            <button
              onClick={() => router.push('/create')}
              className="w-64 bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-8 rounded-lg text-2xl transition duration-300"
            >
              Create Room
            </button>
            <button
              onClick={() => setShowJoin(true)}
              className="w-64 bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-8 rounded-lg text-2xl transition duration-300"
            >
              Join Room
            </button>
          </div>
        ) : (
          <form onSubmit={handleJoinRoom} className="space-y-4">
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Enter your name"
              className="w-full bg-gray-800 text-white py-3 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <input
              type="text"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              placeholder="Enter Room ID"
              className="w-full bg-gray-800 text-white py-3 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setShowJoin(false)}
                className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-6 rounded-lg transition duration-300"
              >
                Back
              </button>
              <button
                type="submit"
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition duration-300"
              >
                Join
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
