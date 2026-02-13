import React, { useState, useEffect, useMemo } from 'react';
import { WS_URL } from '../config';
import { useAuth } from '../AuthContext';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area
} from 'recharts';
import { FiActivity, FiCpu, FiHardDrive, FiLayers, FiCheckCircle, FiAlertCircle, FiClock } from 'react-icons/fi';

const Monitoring = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState(null);
    const [history, setHistory] = useState([]);
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
                const wsFinalUrl = WS_URL.endsWith('/ws') ? WS_URL : `${WS_URL}/ws`;
                ws = new WebSocket(wsFinalUrl);

                ws.onopen = () => setConnected(true);
                ws.onclose = () => {
                    setConnected(false);
                    // Tentar reconectar em 5 segundos
                    setTimeout(connectWS, 5000);
                };

                ws.onmessage = (event) => {
                    try {
                        const payload = JSON.parse(event.data);
                        if (payload.event === "system_stats") {
                            const newStats = payload.data;
                            setStats(newStats);

                            // Adiciona ao histórico (máximo 30 pontos)
                            setHistory(prev => {
                                const newPoint = {
                                    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                                    cpu: newStats.cpu,
                                    ram: newStats.ram.percent,
                                    queue: newStats.queue_size
                                };
                                const newHistory = [...prev, newPoint];
                                if (newHistory.length > 30) return newHistory.slice(1);
                                return newHistory;
                            });
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
    }, []);

    if (user?.role !== 'super_admin') {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <FiAlertCircle className="text-amber-500 text-6xl mb-4" />
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Acesso Restrito</h2>
                <p className="text-gray-500 max-w-md mt-2">Apenas administradores de sistema podem visualizar as estatísticas de integridade.</p>
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
                    <p className="text-sm text-gray-500 dark:text-gray-400">Acompanhe a saúde da infraestrutura em tempo real.</p>
                </div>
                <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold ${connected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    <div className={`w-2 h-2 rounded-full animate-pulse ${connected ? 'bg-green-600' : 'bg-red-600'}`} />
                    {connected ? 'LIVE' : 'DESCONECTADO'}
                </div>
            </div>

            {/* Top Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                <StatusCard
                    title="Mensagens na Fila"
                    value={stats?.queue_size || 0}
                    subValue="Aguardando processamento"
                    icon={<FiLayers />}
                    color="amber"
                />
                <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Serviços</h3>
                    <div className="space-y-2">
                        <ServiceStatus label="Database" status={stats?.services?.database} />
                        <ServiceStatus label="RabbitMQ" status={stats?.services?.rabbitmq} />
                        <ServiceStatus label="Worker Engine" status={stats?.services?.worker} />
                    </div>
                </div>
            </div>

            {/* Graphs Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* CPU Graph */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
                            <FiCpu className="text-blue-500" /> Histórico de CPU (%)
                        </h3>
                    </div>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={history}>
                                <defs>
                                    <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                <XAxis dataKey="time" hide />
                                <YAxis domain={[0, 100]} hide />
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                                    labelClassName="text-gray-400 text-xs"
                                />
                                <Area type="monotone" dataKey="cpu" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorCpu)" animationDuration={300} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* RAM Graph */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
                            <FiHardDrive className="text-purple-500" /> Memória RAM (%)
                        </h3>
                    </div>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={history}>
                                <defs>
                                    <linearGradient id="colorRam" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                <XAxis dataKey="time" hide />
                                <YAxis domain={[0, 100]} hide />
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                                    labelClassName="text-gray-400 text-xs"
                                />
                                <Area type="monotone" dataKey="ram" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorRam)" animationDuration={300} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Queue Size Graph */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
                        <FiLayers className="text-amber-500" /> Fluxo de Fila (Mensagens Pendentes)
                    </h3>
                </div>
                <div className="h-48 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={history}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                            <XAxis dataKey="time" hide />
                            <YAxis hide />
                            <Tooltip
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                                labelClassName="text-gray-400 text-xs"
                            />
                            <Line type="step" dataKey="queue" stroke="#f59e0b" strokeWidth={3} dot={false} animationDuration={300} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

const StatusCard = ({ title, value, subValue, icon, color, percent }) => {
    const colors = {
        blue: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20',
        purple: 'text-purple-600 bg-purple-50 dark:bg-purple-900/20',
        amber: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20',
    };

    return (
        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="flex justify-between items-start mb-4">
                <div className={`p-2 rounded-xl ${colors[color] || 'bg-gray-50'}`}>
                    {React.cloneElement(icon, { size: 24 })}
                </div>
                {percent !== undefined && (
                    <span className={`text-xs font-bold ${percent > 80 ? 'text-red-500' : percent > 50 ? 'text-amber-500' : 'text-green-500'}`}>
                        {percent > 80 ? 'CRÍTICO' : percent > 50 ? 'ALTO' : 'SAUDÁVEL'}
                    </span>
                )}
            </div>
            <div>
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">{title}</h3>
                <div className="text-2xl font-black text-gray-800 dark:text-white mt-1">{value}</div>
                {subValue && <div className="text-[10px] text-gray-400 mt-0.5">{subValue}</div>}
            </div>
            {percent !== undefined && (
                <div className="mt-4 h-1.5 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                        className={`h-full transition-all duration-1000 ${percent > 80 ? 'bg-red-500' : percent > 50 ? 'bg-amber-500' : 'bg-green-500'}`}
                        style={{ width: `${percent}%` }}
                    />
                </div>
            )}
        </div>
    );
};

const ServiceStatus = ({ label, status }) => (
    <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-600 dark:text-gray-300">{label}</span>
        <div className="flex items-center gap-1.5">
            <span className={`text-[10px] font-bold ${status === 'online' ? 'text-green-600' : 'text-red-600'}`}>
                {status?.toUpperCase() || 'UNKNOWN'}
            </span>
            <div className={`w-2 h-2 rounded-full ${status === 'online' ? 'bg-green-500' : 'bg-red-500'}`} />
        </div>
    </div>
);

export default Monitoring;
