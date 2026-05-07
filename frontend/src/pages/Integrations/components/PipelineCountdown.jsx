import React, { useState, useEffect } from 'react';

const PipelineCountdown = ({ targetTime }) => {
  const [timeLeft, setTimeLeft] = useState(0);
  const totalDuration = 10; // Definimos 10s como padrão para o progresso visual

  useEffect(() => {
    const calculate = () => {
      if (!targetTime) {
        setTimeLeft(0);
        return;
      }
      const diff = Math.ceil((new Date(targetTime).getTime() - Date.now()) / 1000);
      setTimeLeft(isNaN(diff) ? 0 : Math.max(0, diff));
    };
    calculate();
    const timer = setInterval(calculate, 1000);
    return () => clearInterval(timer);
  }, [targetTime]);

  const progress = Math.min(100, Math.max(0, (timeLeft / totalDuration) * 100));

  if (timeLeft <= 0) {
    return (
      <div className="flex items-center gap-2 animate-pulse">
        <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
        <span className="text-emerald-400 text-[10px] font-black uppercase tracking-widest">Finalizando...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 w-full max-w-[200px]">
      <div className="flex justify-between items-center px-1">
        <span className="text-[10px] font-bold text-amber-500/80 uppercase tracking-tighter">Aguardando Sincronia</span>
        <span className="font-mono text-amber-400 font-black text-xs">{timeLeft}s</span>
      </div>
      <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/5 p-[1px]">
        <div 
          className="h-full bg-gradient-to-r from-amber-600 to-amber-400 rounded-full transition-all duration-1000 ease-linear shadow-[0_0_10px_rgba(245,158,11,0.2)]"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};

export default PipelineCountdown;
