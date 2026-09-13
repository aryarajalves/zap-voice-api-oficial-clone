import React, { useState, useEffect } from 'react';
import { parseUtcDate } from '../utils/leadTableUtils';

/** Mostra quanto tempo falta para o contato sair do repouso, atualizando sozinho. */
export default function RestingCountdown({ expiresAt }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!expiresAt) return;
    // Sincroniza imediatamente ao montar/trocar de contato, e depois a cada 1s
    setNow(Date.now());
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  const expiresAtDate = parseUtcDate(expiresAt);
  if (!expiresAtDate) return null;

  const diffMs = expiresAtDate.getTime() - now;
  if (diffMs <= 0) return null;

  const totalSeconds = Math.floor(diffMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const label = hours > 0 ? `${hours}h ${minutes}min` : `${minutes}min`;

  return (
    <span
      className="text-[10px] text-amber-500 font-bold font-mono tracking-wide"
      title={`Volta a receber disparos em ${label}`}
    >
      😴 Repouso: {label} restantes
    </span>
  );
}
