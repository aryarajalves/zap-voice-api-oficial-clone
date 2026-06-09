import React from 'react';
import { Handle, Position } from 'reactflow';
import { FiGift } from 'react-icons/fi';
import NodeHeader from '../components/NodeHeader';

const RouletteNode = ({ id, data }) => {
    const winChance = data.winChance !== undefined ? data.winChance : 10;
    const dailyLimit = data.dailyLimit !== undefined ? data.dailyLimit : 5;

    const handleChanceChange = (val) => {
        const parsed = Math.min(100, Math.max(0, parseInt(val) || 0));
        data.onChange(id, { winChance: parsed });
    };

    const handleLimitChange = (val) => {
        const parsed = Math.max(0, parseInt(val) || 0);
        data.onChange(id, { dailyLimit: parsed });
    };

    return (
        <div className="px-4 py-3 shadow-lg rounded-2xl bg-white dark:bg-gray-800 border-2 border-amber-500 min-w-[280px] transition-colors">
            <Handle type="target" position={Position.Top} className="w-3 h-3 bg-amber-500" />
            <NodeHeader
                label="Roleta / Sorteio"
                icon={FiGift}
                colorClass="bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400"
                onDelete={() => data.onDelete(id)}
                onDuplicate={() => data.onDuplicate(id)}
                isStart={data.isStart}
            />

            <div className="space-y-4 mt-2 px-1">
                {/* Win Chance Slider */}
                <div className="space-y-1">
                    <div className="flex justify-between items-center">
                        <label className="text-xs font-bold text-gray-700 dark:text-gray-300">Chance de Ganho:</label>
                        <span className="text-xs font-bold text-amber-500">{winChance}%</span>
                    </div>
                    <input
                        type="range"
                        min="0"
                        max="100"
                        value={winChance}
                        onChange={(e) => handleChanceChange(e.target.value)}
                        className="w-full accent-amber-500 nodrag"
                    />
                </div>

                {/* Daily Limit Input */}
                <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-gray-700 dark:text-gray-300">Limite Diário de Prêmios:</label>
                    <input
                        type="number"
                        min="0"
                        value={dailyLimit}
                        onChange={(e) => handleLimitChange(e.target.value)}
                        className="w-full text-xs p-1.5 border rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-700 focus:border-amber-500 nodrag"
                        placeholder="Ex: 5"
                    />
                </div>

                {/* Outputs Section */}
                <div className="space-y-3 pt-2 border-t border-gray-100 dark:border-gray-700">
                    <div className="relative flex items-center justify-between">
                        <span className="text-xs font-bold text-green-600 dark:text-green-400">🏆 GANHOU</span>
                        <Handle
                            id="ganhou"
                            type="source"
                            position={Position.Right}
                            className="w-3 h-3 bg-green-500 !-right-6"
                        />
                    </div>
                    <div className="relative flex items-center justify-between">
                        <span className="text-xs font-bold text-red-500">❌ PERDEU</span>
                        <Handle
                            id="perdeu"
                            type="source"
                            position={Position.Right}
                            className="w-3 h-3 bg-red-500 !-right-6"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RouletteNode;
