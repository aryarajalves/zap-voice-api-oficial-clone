import React from 'react';

export default function UserSetupStatusSection({ userData, setUserData }) {
  return (
    <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/30 space-y-3">
      <label className="block text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">
        Status da Configuração
      </label>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Página finalizada</span>
        <button
          type="button"
          onClick={() =>
            setUserData({
              ...userData,
              setup_completed: !userData.setup_completed,
              setup_percentage: !userData.setup_completed ? 100 : userData.setup_percentage
            })
          }
          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${userData.setup_completed ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${userData.setup_completed ? 'translate-x-5' : 'translate-x-0'}`}
          />
        </button>
      </div>

      {!userData.setup_completed && (
        <div className="space-y-1.5 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500 dark:text-gray-400">Percentual concluído</span>
            <span className="text-xs font-bold text-blue-600">{userData.setup_percentage ?? 0}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            step="5"
            value={userData.setup_percentage ?? 0}
            onChange={(e) => setUserData({ ...userData, setup_percentage: Number(e.target.value) })}
            className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
            <div
              className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${userData.setup_percentage ?? 0}%` }}
            />
          </div>
        </div>
      )}

      {userData.setup_completed && (
        <p className="text-xs text-green-600 dark:text-green-400 font-semibold flex items-center gap-1">
          ✓ Configuração 100% concluída
        </p>
      )}
    </div>
  );
}
