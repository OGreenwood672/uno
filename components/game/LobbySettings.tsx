"use client";

import { GameSettings } from "@/types/game";
import { useEffect, useState } from "react";
import type { PartySocket } from "partysocket";

interface LobbySettingsProps {
  settings: GameSettings;
  socket: PartySocket;
  onSave: () => void;
  onCancel: () => void;
}

export default function LobbySettings({ settings, socket, onSave, onCancel }: LobbySettingsProps) {
  const [editableSettings, setEditableSettings] = useState<GameSettings>(settings);

  useEffect(() => {
    setEditableSettings(settings);
  }, [settings]);

  const handleSettingChange = (field: keyof GameSettings, value: any) => {
    setEditableSettings(prev => ({ ...prev, [field]: value }));
  };

  const sendUpdate = () => {
    socket.send(JSON.stringify({
      type: "UPDATE_SETTINGS",
      payload: editableSettings
    }));
  };

  const handleSave = () => {
    sendUpdate();
    onSave();
  }

  return (
    <div className="w-full max-w-md p-4 space-y-4 bg-gray-800/50 rounded-lg">
      <h3 className="text-2xl font-bold text-center">Edit Settings</h3>
      
      <div className="space-y-3">
        <div>
          <label className="flex items-center justify-between text-lg">
            <span>Starting Cards</span>
            <input
              type="number"
              value={editableSettings.startCards}
              onChange={(e) => handleSettingChange('startCards', parseInt(e.target.value, 10))}
              min="1"
              max="15"
              className="w-24 bg-gray-700 text-white py-1 px-2 rounded-lg text-center"
            />
          </label>
        </div>

        <div>
          <label className="flex items-center justify-between text-lg">
            <span>Timer per Turn (0 for none)</span>
             <input
              type="number"
              value={editableSettings.turnTimer}
              onChange={(e) => handleSettingChange('turnTimer', parseInt(e.target.value, 10))}
              min="0"
              max="120"
              step="5"
              className="w-24 bg-gray-700 text-white py-1 px-2 rounded-lg text-center"
            />
          </label>
        </div>

        <div className="flex items-center justify-between text-lg">
          <span>"Jump-In" Rule</span>
          <label className="switch">
            <input 
              type="checkbox" 
              checked={editableSettings.jumpIn} 
              onChange={(e) => handleSettingChange('jumpIn', e.target.checked)}
            />
            <span className="slider round"></span>
          </label>
        </div>

        <div className="flex items-center justify-between text-lg">
          <span>"Jack's Box" (Bonus Questions)</span>
          <label className="switch">
            <input 
              type="checkbox" 
              checked={editableSettings.bonusCards} 
              onChange={(e) => handleSettingChange('bonusCards', e.target.checked)}
            />
            <span className="slider round"></span>
          </label>
        </div>
      </div>

      <div className="flex gap-4">
        <button
          onClick={onCancel}
          className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg transition duration-300"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition duration-300"
        >
          Save Changes
        </button>
      </div>

      <style jsx>{`
        .switch {
          position: relative;
          display: inline-block;
          width: 50px;
          height: 28px;
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
          background-color: #4b5563; /* gray-600 */
          transition: .4s;
        }
        .slider:before {
          position: absolute;
          content: "";
          height: 20px;
          width: 20px;
          left: 4px;
          bottom: 4px;
          background-color: white;
          transition: .4s;
        }
        input:checked + .slider {
          background-color: #2563eb; /* blue-600 */
        }
        input:checked + .slider:before {
          transform: translateX(22px);
        }
        .slider.round {
          border-radius: 28px;
        }
        .slider.round:before {
          border-radius: 50%;
        }
      `}</style>
    </div>
  );
}
