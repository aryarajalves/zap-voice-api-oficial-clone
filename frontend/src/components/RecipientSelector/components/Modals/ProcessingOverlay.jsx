
import React from 'react';
import { createPortal } from 'react-dom';

const ProcessingOverlay = ({ isVisible, title, message, type = 'blue', progress = null }) => {
    if (!isVisible) return null;

    const colors = {
        blue: {
            border: 'border-blue-500',
            bg: 'bg-blue-500/20',
            text: 'text-blue-500'
        },
        emerald: {
            border: 'border-emerald-500',
            bg: 'bg-emerald-500/20',
            text: 'text-emerald-500'
        }
    };

    const color = colors[type] || colors.blue;

    return createPortal(
        <div className="fixed inset-0 z-[10000] bg-black/80 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in duration-300">
            <div className="bg-slate-900 w-full max-w-md p-10 rounded-[3rem] border border-white/10 shadow-[0_0_100px_rgba(0,0,0,0.8)] text-center space-y-8">
                {progress ? (
                    <div className="relative w-32 h-32 mx-auto">
                        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                            <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="4" className="text-slate-800" />
                            <circle
                                cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="6"
                                className={`${color.text} transition-all duration-300`}
                                strokeDasharray="282.7"
                                strokeDashoffset={282.7 - (282.7 * (progress.current / progress.total || 0))}
                            />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-3xl font-black text-white">{Math.round((progress.current / progress.total) * 100 || 0)}%</span>
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{progress.current}/{progress.total}</span>
                        </div>
                    </div>
                ) : (
                    <div className="relative w-24 h-24 mx-auto">
                        <div className={`absolute inset-0 border-4 ${color.bg} rounded-full`}></div>
                        <div className={`absolute inset-0 border-4 ${color.text} border-t-transparent rounded-full animate-spin`}></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                            {type === 'blue' ? (
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={`${color.text} animate-pulse`}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                            ) : (
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={`${color.text} animate-pulse`}><path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" /></svg>
                            )}
                        </div>
                    </div>
                )}
                <div className="space-y-2">
                    <h3 className="text-2xl font-black text-white">{title}</h3>
                    <p className="text-sm text-slate-400 font-medium">{message}</p>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default ProcessingOverlay;
