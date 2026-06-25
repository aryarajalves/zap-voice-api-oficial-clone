import React from 'react';
import { Handle, Position } from 'reactflow';
import { FiShuffle, FiPlus, FiTrash2 } from 'react-icons/fi';
import NodeHeader from '../components/NodeHeader';

const RandomizerNode = ({ id, data }) => {
    // Modo de distribuição
    const mode = data.mode || 'random';

    // Verify paths structure -> Default to 2 paths (A/B) 50/50 if not exists
    const paths = data.paths || [
        { id: 'a', label: 'Caminho A', percent: 50 },
        { id: 'b', label: 'Caminho B', percent: 50 }
    ];

    const currentTotal = paths.reduce((acc, p) => acc + (parseInt(p.percent) || 0), 0);
    const isValid = mode === 'round_robin' || currentTotal === 100;

    const handleAddPath = () => {
        if (paths.length >= 15) return;
        
        // Find a unique path ID character
        let nextChar = 'a';
        for (let i = 0; i < 26; i++) {
            const char = String.fromCharCode(97 + i);
            if (!paths.some(p => p.id === char)) {
                nextChar = char;
                break;
            }
        }

        const newPaths = [...paths, { id: nextChar, label: `Caminho ${nextChar.toUpperCase()}`, percent: 0 }];
        data.onChange(id, { paths: newPaths });
    };

    const handleRemovePath = (pathId) => {
        if (paths.length <= 2) return;
        const newPaths = paths.filter(p => p.id !== pathId);
        data.onChange(id, { paths: newPaths });
    };

    const handlePercentChange = (pathId, val) => {
        const newPaths = paths.map(p => {
            if (p.id === pathId) return { ...p, percent: parseInt(val) || 0 };
            return p;
        });
        data.onChange(id, { paths: newPaths });
    };

    const distributeEvenly = () => {
        const count = paths.length;
        const split = Math.floor(100 / count);
        const remainder = 100 % count;

        const newPaths = paths.map((p, idx) => ({
            ...p,
            percent: idx === 0 ? split + remainder : split
        }));
        data.onChange(id, { paths: newPaths });
    };

    return (
        <div className={`px-4 py-3 shadow-lg rounded-2xl bg-white dark:bg-gray-800 border-2 min-w-[260px] transition-colors ${isValid ? 'border-indigo-500' : 'border-red-500'}`}>
            <Handle type="target" position={Position.Left} className="w-3 h-3 bg-indigo-500" />
            <NodeHeader
                label="Roteamento Dinâmico"
                icon={FiShuffle}
                colorClass="bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400"
                onDelete={() => data.onDelete(id)}
                onDuplicate={() => data.onDuplicate(id)}
                isStart={data.isStart}
            />

            <div className="space-y-3 px-1 mt-2">
                {/* Selector de modo */}
                <div className="flex flex-col gap-1 nodrag">
                    <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase">Modo de Distribuição</label>
                    <select
                        value={mode}
                        onChange={(e) => data.onChange(id, { mode: e.target.value })}
                        className="w-full text-xs p-1.5 border rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                    >
                        <option value="random">Aleatório por Porcentagem</option>
                        <option value="round_robin">Sequencial Alternado (Round Robin)</option>
                    </select>
                </div>

                {mode === 'random' && (
                    <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-900/50 p-2 rounded text-xs text-gray-500">
                        <span>Total: <span className={`font-bold ${isValid ? 'text-green-500' : 'text-red-500'}`}>{currentTotal}%</span></span>
                        <button onClick={distributeEvenly} className="text-blue-500 hover:underline cursor-pointer nodrag">Distribuir</button>
                    </div>
                )}

                {paths.map((path, idx) => (
                    <div key={path.id} className="relative">
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase">{path.label}</span>
                            <div className="flex items-center gap-2">
                                {mode === 'random' ? (
                                    <>
                                        <input
                                            type="number"
                                            min="0" max="100"
                                            className="w-12 text-center text-xs p-1 border rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-700 nodrag"
                                            value={path.percent}
                                            onChange={(e) => handlePercentChange(path.id, e.target.value)}
                                        />
                                        <span className="text-xs text-gray-400">%</span>
                                    </>
                                ) : (
                                    <span className="px-2.5 py-0.5 text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-full border border-indigo-200 dark:border-indigo-900">
                                        {idx + 1}º Fila
                                    </span>
                                )}
                                {paths.length > 2 && (
                                    <button
                                        onClick={() => handleRemovePath(path.id)}
                                        className="text-gray-400 hover:text-red-500 nodrag cursor-pointer"
                                        title="Remover Caminho"
                                    >
                                        <FiTrash2 size={10} />
                                    </button>
                                )}
                            </div>
                        </div>
                        <Handle
                            id={path.id}
                            type="source"
                            position={Position.Right}
                            className={`w-3 h-3 !-right-2 top-auto ${isValid ? 'bg-indigo-500' : 'bg-red-500'}`}
                            style={{ top: `${((idx + 1) / (paths.length + 1)) * 100}%` }}
                        />
                    </div>
                ))}

                {paths.length < 15 && (
                    <button
                        onClick={handleAddPath}
                        className="w-full py-1.5 text-xs font-bold text-indigo-500 border border-dashed border-indigo-300 rounded hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition flex items-center justify-center gap-1 nodrag cursor-pointer"
                    >
                        <FiPlus /> Adicionar Caminho
                    </button>
                )}
            </div>
        </div>
    );
};

export default RandomizerNode;
