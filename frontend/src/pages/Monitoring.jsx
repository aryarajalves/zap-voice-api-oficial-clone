import React, { useState, useEffect, useMemo } from 'react';
import { WS_URL } from '../config';
import { useAuth } from '../AuthContext';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area
} from 'recharts';
import { FiActivity, FiCpu, FiHardDrive, FiLayers, FiCheckCircle, FiAlertCircle, FiClock, FiSend, FiCalendar } from 'react-icons/fi';
import { useClient } from '../contexts/ClientContext';

const Monitoring = () => {
    const { user } = useAuth();
    const { activeClient } = useClient();
    const [stats, setStats] = useState(null);
    const [connected, setConnected] = useState(false);

    // Formatação de bytes para KB/MB/GB
    const formatBytes = (bytes) => {
        if (!bytes || bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    useEffect(() => {
        let ws;
        const connectWS = () => {
            try {
                const wsBase = WS_URL.endsWith('/ws') ? WS_URL : `${WS_URL}/ws`;
                const wsToken = localStorage.getItem('token');
                const wsFinalUrl = wsToken ? `${wsBase}?token=${wsToken}` : wsBase;
                ws = new WebSocket(wsFinalUrl);

                ws.onopen = () => {
                    setConnected(true);
                    if (activeClient) {
                        ws.send(JSON.stringify({
                            event: 'subscribe_client',
                            client_id: activeClient.id
                        }));
                    }
                };
                ws.onclose = () => {
                    setConnected(false);
                    setTimeout(connectWS, 5000);
                };

                ws.onmessage = (event) => {
                    try {
                        const payload = JSON.parse(event.data);
                        if (payload.event === "system_stats") {
                            setStats(payload.data);
                        }
                    } catch (e) {
                        console.error("Erro ao processar mensagem do WebSocket:", e);
                    }
                };
            } catch (e) {
                console.error("Falha ao conectar no WebSocket de monitoramento:", e);
            }
        };

        connectWS();
        return () => ws && ws.close();
    }, [activeClient]);

    if (user?.role !== 'super_admin') {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <FiAlertCircle className="text-amber-500 text-6xl mb-4" />
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Acesso Restrito</h2>
                <p className="text-gray-500 max-w-md mt-2">Apenas administradores de sistema podem visualizar as estatísticas de integridade.</p>
            </div>
        );
    }

    if (!stats) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] animate-pulse">
                <div className="relative">
                    <FiActivity size={64} className="text-blue-500 animate-bounce" />
                    <div className="absolute inset-0 bg-blue-400/20 blur-2xl rounded-full" />
                </div>
                <h3 className="mt-6 text-xl font-bold text-gray-700 dark:text-gray-300">Conectando ao Monitor...</h3>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                        <FiActivity className="text-blue-600" /> Monitoramento de Sistema
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Acompanhe o consumo de recursos em tempo real.</p>
                </div>
                <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold ${connected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    <div className={`w-2 h-2 rounded-full animate-pulse ${connected ? 'bg-green-600' : 'bg-red-600'}`} />
                    {connected ? 'LIVE' : 'DESCONECTADO'}
                </div>
            </div>

            {/* Main Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <StatusCard
                    title="Uso de CPU"
                    value={`${stats?.cpu?.toFixed(1) || 0}%`}
                    icon={<FiCpu />}
                    color="blue"
                    percent={stats?.cpu}
                />
                <StatusCard
                    title="Memória RAM"
                    value={formatBytes(stats?.ram?.used)}
                    subValue={`de ${formatBytes(stats?.ram?.total)} (${stats?.ram?.percent || 0}%)`}
                    icon={<FiHardDrive />}
                    color="purple"
                    percent={stats?.ram?.percent}
                />
            </div>
        </div>
    );
};

const StatusCard = ({ title, value, subValue, icon, color, percent }) => {
    const colors = {
        blue: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20',
        purple: 'text-purple-600 bg-purple-50 dark:bg-purple-900/20',
    };

    return (
        <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-xl">
            <div className="flex justify-between items-start mb-6">
                <div className={`p-4 rounded-2xl ${colors[color] || 'bg-gray-50'}`}>
                    {React.cloneElement(icon, { size: 32 })}
                </div>
                {percent !== undefined && (
                    <span className={`text-xs font-black px-3 py-1 rounded-full ${percent > 80 ? 'bg-red-100 text-red-600' : percent > 50 ? 'bg-amber-100 text-amber-600' : 'bg-green-100 text-green-600'}`}>
                        {percent > 80 ? 'CRÍTICO' : percent > 50 ? 'ALTO' : 'SAUDÁVEL'}
                    </span>
                )}
            </div>
            <div>
                <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest leading-none">{title}</h3>
                <div className="text-5xl font-black text-gray-900 dark:text-white mt-4">{value}</div>
                {subValue && <div className="text-xs text-gray-500 mt-2 font-medium">{subValue}</div>}
            </div>
            {percent !== undefined && (
                <div className="mt-8 h-3 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                        className={`h-full transition-all duration-1000 rounded-full ${percent > 80 ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : percent > 50 ? 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]' : 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]'}`}
                        style={{ width: `${percent}%` }}
                    ></div>
                </div>
            )}
        </div>
    );
};
export default Monitoring;
