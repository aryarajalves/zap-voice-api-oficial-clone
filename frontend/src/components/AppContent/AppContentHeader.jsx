import React from 'react';
import { FiZap } from 'react-icons/fi';
import ConnectionStatus from '../ConnectionStatus';
import GuideButton from './GuideButton';
import { SIMULATE_MESSAGING, VIEW_TITLES } from './constants';

export default function AppContentHeader({ logic }) {
  const currentTitle = VIEW_TITLES[logic.currentView];

  return (
    <header className="mb-8 flex justify-between items-start p-8 pb-0">
      <div>
        <div className="flex items-center gap-3">
          {currentTitle && (
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {currentTitle}
            </h1>
          )}

          {/* Guide Buttons */}
          {logic.currentView === 'funnels' && !logic.showBuilder && (
            <GuideButton onClick={() => logic.setIsFunnelGuideOpen(true)} color="#818cf8" bg="rgba(99,102,241,0.1)" border="rgba(99,102,241,0.3)" />
          )}
          {logic.currentView === 'schedules' && (
            <GuideButton onClick={() => logic.setIsScheduleGuideOpen(true)} color="#fbbf24" bg="rgba(251,191,36,0.1)" border="rgba(251,191,36,0.3)" />
          )}
          {logic.currentView === 'history' && (
            <GuideButton onClick={() => logic.setIsHistoryGuideOpen(true)} color="#38bdf8" bg="rgba(14,165,233,0.1)" border="rgba(14,165,233,0.3)" />
          )}
          {logic.currentView === 'blocked' && (
            <GuideButton onClick={() => logic.setIsBlockedGuideOpen(true)} color="#fb923c" bg="rgba(249,115,22,0.1)" border="rgba(249,115,22,0.3)" />
          )}
        </div>
        {logic.clientName && logic.currentView === 'bulk_sender' && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Api Oficial do WhatsApp do cliente {logic.clientName}</p>
        )}
      </div>
      <div className="flex items-center gap-3">
        {(SIMULATE_MESSAGING || logic.currentView === 'stress_test') && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500/10 dark:bg-yellow-500/20 border border-yellow-500/30 dark:border-yellow-500/40 text-yellow-700 dark:text-yellow-400 text-xs font-bold rounded-xl animate-pulse" title="Modo Simulação / Teste de Estresse Ativo">
            <FiZap size={14} className="animate-bounce" />
            <span>Modo Teste de Escala</span>
          </div>
        )}
        <ConnectionStatus refreshKey={logic.settingsRefreshKey} />
      </div>
    </header>
  );
}
