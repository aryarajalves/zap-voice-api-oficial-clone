import React, { useState, useEffect } from 'react';

const CountdownTimer = ({ targetTime }) => {
    const [timeLeft, setTimeLeft] = useState(0);

    useEffect(() => {
        if (!targetTime) return;
        const calculate = () => {
            try {
                const target = new Date(targetTime).getTime();
                if (isNaN(target)) return;
                const diff = Math.ceil((target - new Date().getTime()) / 1000);
                setTimeLeft(Math.max(0, diff));
            } catch (e) {
                console.error("Countdown error:", e);
            }
        };
        calculate();
        const interval = setInterval(calculate, 1000);
        return () => clearInterval(interval);
    }, [targetTime]);

    if (!targetTime) return null;
    if (timeLeft <= 0) return <span className="text-emerald-500 font-black animate-pulse">Retomando...</span>;

    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    return (
        <span className="text-orange-500 font-mono font-black tracking-tighter">
            {minutes > 0 ? `${minutes}m ` : ''}{seconds}s p/ concluir
        </span>
    );
};

export default CountdownTimer;
