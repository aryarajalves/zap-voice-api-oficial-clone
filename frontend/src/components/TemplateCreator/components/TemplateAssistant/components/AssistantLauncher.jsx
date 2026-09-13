import React from 'react';
import { FiZap } from 'react-icons/fi';

export default function AssistantLauncher({ onOpen }) {
  return (
    <button
      onClick={onOpen}
      className="w-14 h-14 bg-gradient-to-tr from-blue-600 to-indigo-600 dark:from-blue-500 dark:to-indigo-500 rounded-full flex items-center justify-center text-white shadow-2xl hover:scale-110 active:scale-95 transition-all duration-300 group border border-blue-400/30 relative"
      title="Assistente de Criação com IA"
    >
      <div className="absolute inset-0 rounded-full bg-blue-500/20 blur-md group-hover:blur-lg transition-all duration-300" />
      <FiZap className="w-6 h-6 animate-pulse group-hover:rotate-12 transition-transform duration-300" />
    </button>
  );
}
