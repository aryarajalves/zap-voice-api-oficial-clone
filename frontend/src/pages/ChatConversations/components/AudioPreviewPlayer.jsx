import React, { useState, useRef, useEffect } from 'react';
import { FiPlay, FiPause, FiTrash2, FiSend, FiRefreshCw } from 'react-icons/fi';

/**
 * Componente para pré-escuta e envio de áudio gravado no chat.
 * Permite ao usuário ouvir o áudio antes de enviar, pausar, navegar pela timeline,
 * descartar a gravação ou disparar diretamente para o WhatsApp.
 */
export default function AudioPreviewPlayer({
    audioUrl,
    duration = 0,
    onCancel,
    onSend,
    isSending = false
}) {
    const audioRef = useRef(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [totalDuration, setTotalDuration] = useState(duration);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const updateTime = () => setCurrentTime(audio.currentTime);
        const handleLoadedMetadata = () => {
            if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
                setTotalDuration(audio.duration);
            }
        };
        const handleEnded = () => {
            setIsPlaying(false);
            setCurrentTime(0);
        };

        audio.addEventListener('timeupdate', updateTime);
        audio.addEventListener('loadedmetadata', handleLoadedMetadata);
        audio.addEventListener('ended', handleEnded);

        return () => {
            audio.removeEventListener('timeupdate', updateTime);
            audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
            audio.removeEventListener('ended', handleEnded);
        };
    }, [audioUrl]);

    const togglePlay = () => {
        const audio = audioRef.current;
        if (!audio) return;

        if (isPlaying) {
            audio.pause();
            setIsPlaying(false);
        } else {
            audio.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
        }
    };

    const handleSeek = (e) => {
        const audio = audioRef.current;
        if (!audio) return;
        const newTime = parseFloat(e.target.value);
        audio.currentTime = newTime;
        setCurrentTime(newTime);
    };

    const formatTime = (secs) => {
        if (isNaN(secs) || secs < 0) return '00:00';
        const m = Math.floor(secs / 60);
        const s = Math.floor(secs % 60);
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };

    return (
        <div className="flex-1 flex items-center gap-3 px-4 py-2 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-blue-500/10 border border-blue-500/30 dark:border-blue-400/20 rounded-xl animate-in fade-in slide-in-from-bottom-2 duration-200">
            <audio ref={audioRef} src={audioUrl} preload="auto" />

            {/* Botão de Play/Pause */}
            <button
                type="button"
                onClick={togglePlay}
                disabled={isSending}
                className="w-8 h-8 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shrink-0 transition-transform active:scale-95 shadow-md cursor-pointer disabled:opacity-50"
                title={isPlaying ? "Pausar áudio" : "Ouvir áudio gravado"}
            >
                {isPlaying ? <FiPause size={15} /> : <FiPlay size={15} className="ml-0.5" />}
            </button>

            {/* Barra de Progresso / Timeline */}
            <div className="flex-1 flex flex-col justify-center gap-1">
                <input
                    type="range"
                    min={0}
                    max={totalDuration || duration || 1}
                    step={0.1}
                    value={currentTime}
                    onChange={handleSeek}
                    disabled={isSending}
                    className="w-full h-1.5 bg-gray-300 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
                <div className="flex justify-between text-[10px] font-mono text-gray-500 dark:text-gray-400">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(totalDuration || duration)}</span>
                </div>
            </div>

            {/* Botão de Descartar / Lixeira */}
            <button
                type="button"
                onClick={onCancel}
                disabled={isSending}
                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition shrink-0 cursor-pointer disabled:opacity-50"
                title="Descartar gravação"
            >
                <FiTrash2 size={16} />
            </button>

            {/* Botão de Enviar Áudio */}
            <button
                type="button"
                onClick={onSend}
                disabled={isSending}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                title="Enviar áudio para o cliente"
            >
                {isSending ? (
                    <>
                        <FiRefreshCw className="animate-spin" size={13} />
                        <span>Enviando...</span>
                    </>
                ) : (
                    <>
                        <FiSend size={13} />
                        <span>Enviar</span>
                    </>
                )}
            </button>
        </div>
    );
}
