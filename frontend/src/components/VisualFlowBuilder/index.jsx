import React, { useState, useEffect, useRef } from 'react';
import { ReactFlowProvider } from 'reactflow';
import FlowEditor from './FlowEditor';

export const PortalContext = React.createContext(null);
export const GlobalVarsContext = React.createContext([]);

const VisualFlowBuilder = ({ funnelId, onBack, onSave, refreshKey }) => {
    const validId = funnelId || 1;
    const wrapperRef = useRef(null);
    const [isFullScreen, setIsFullScreen] = useState(false);

    const toggleFullScreen = () => {
        if (!isFullScreen) {
            if (wrapperRef.current?.requestFullscreen) {
                wrapperRef.current.requestFullscreen().catch(() => {
                    console.warn("Fullscreen nativo bloqueado, usando apenas CSS.");
                });
            }
            setIsFullScreen(true);
        } else {
            if (document.fullscreenElement) {
                document.exitFullscreen().catch(() => { });
            }
            setIsFullScreen(false);
        }
    };

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && isFullScreen) {
                if (document.fullscreenElement) {
                    document.exitFullscreen().catch(() => { });
                }
                setIsFullScreen(false);
            }
        };

        const handleFsChange = () => {
            if (document.fullscreenElement === wrapperRef.current) {
                setIsFullScreen(true);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        document.addEventListener('fullscreenchange', handleFsChange);

        if (isFullScreen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('fullscreenchange', handleFsChange);
            document.body.style.overflow = '';
        };
    }, [isFullScreen]);

    return (
        <div
            ref={wrapperRef}
            className={`transition-all duration-300 ${isFullScreen
                ? 'fixed inset-0 z-[10000] w-screen h-screen bg-slate-50 dark:bg-gray-900'
                : 'w-full rounded-2xl border border-gray-200 dark:border-gray-800 h-[75vh] bg-white dark:bg-gray-800 relative overflow-hidden shadow-xl'
                }`}
            style={isFullScreen ? { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 } : {}}
        >
            <PortalContext.Provider value={wrapperRef.current}>
                <ReactFlowProvider>
                    <FlowEditor
                        funnelId={validId}
                        isFullScreen={isFullScreen}
                        toggleFullScreen={toggleFullScreen}
                        onBack={onBack}
                        onSave={onSave}
                        refreshKey={refreshKey}
                    />
                </ReactFlowProvider>
            </PortalContext.Provider>
        </div>
    );
};

export default VisualFlowBuilder;
