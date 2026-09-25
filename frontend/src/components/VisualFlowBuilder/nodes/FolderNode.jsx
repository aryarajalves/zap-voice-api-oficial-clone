import React, { useState } from 'react';
import { NodeResizer } from '@reactflow/node-resizer';
import '@reactflow/node-resizer/dist/style.css';
import { FiFolder, FiTrash2, FiEdit3, FiCheck } from 'react-icons/fi';

const THEME_COLORS = {
    purple: {
        border: 'border-purple-500/60 dark:border-purple-400/50',
        bg: 'bg-purple-500/5 dark:bg-purple-950/20',
        header: 'bg-purple-100/90 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300',
        dot: '#8B5CF6',
        resizer: '#8B5CF6'
    },
    blue: {
        border: 'border-blue-500/60 dark:border-blue-400/50',
        bg: 'bg-blue-500/5 dark:bg-blue-950/20',
        header: 'bg-blue-100/90 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300',
        dot: '#3B82F6',
        resizer: '#3B82F6'
    },
    emerald: {
        border: 'border-emerald-500/60 dark:border-emerald-400/50',
        bg: 'bg-emerald-500/5 dark:bg-emerald-950/20',
        header: 'bg-emerald-100/90 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300',
        dot: '#10B981',
        resizer: '#10B981'
    },
    amber: {
        border: 'border-amber-500/60 dark:border-amber-400/50',
        bg: 'bg-amber-500/5 dark:bg-amber-950/20',
        header: 'bg-amber-100/90 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300',
        dot: '#F59E0B',
        resizer: '#F59E0B'
    },
    rose: {
        border: 'border-rose-500/60 dark:border-rose-400/50',
        bg: 'bg-rose-500/5 dark:bg-rose-950/20',
        header: 'bg-rose-100/90 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300',
        dot: '#F43F5E',
        resizer: '#F43F5E'
    },
    slate: {
        border: 'border-slate-500/60 dark:border-slate-400/50',
        bg: 'bg-slate-500/5 dark:bg-slate-950/20',
        header: 'bg-slate-100/90 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300',
        dot: '#64748B',
        resizer: '#64748B'
    }
};

const FolderNode = ({ id, data, selected }) => {
    const title = data?.title || 'Nova Pasta / Seção';
    const description = data?.description || '';
    const colorKey = data?.color && THEME_COLORS[data.color] ? data.color : 'purple';
    const theme = THEME_COLORS[colorKey];

    const [isEditing, setIsEditing] = useState(false);
    const [editTitle, setEditTitle] = useState(title);
    const [editDesc, setEditDesc] = useState(description);

    const handleSaveInfo = () => {
        data?.onChange?.(id, {
            title: editTitle.trim() || 'Pasta / Seção',
            description: editDesc.trim(),
            color: colorKey
        });
        setIsEditing(false);
    };

    const handleChangeColor = (newColor) => {
        data?.onChange?.(id, {
            title,
            description,
            color: newColor
        });
    };

    return (
        <div
            className={`relative rounded-3xl border-2 border-dashed ${theme.border} ${theme.bg} backdrop-blur-xs transition-all duration-200 h-full w-full min-w-[320px] min-h-[220px] flex flex-col group pointer-events-none ${selected ? 'ring-2 ring-purple-400/40 dark:ring-purple-500/40 shadow-md' : ''}`}
            data-testid={`folder-node-${id}`}
        >
            <NodeResizer
                minWidth={280}
                minHeight={180}
                isVisible={true}
                lineClassName={`folder-resizer-line !pointer-events-auto ${selected ? 'is-selected' : ''}`}
                handleClassName={`folder-resizer-handle !border-2 !border-white dark:!border-gray-900 !pointer-events-auto ${selected ? 'is-selected' : ''}`}
                color={theme.resizer}
            />

            {/* Cabeçalho Organizador */}
            <div className="p-3 bg-white/80 dark:bg-gray-900/80 rounded-t-3xl border-b border-gray-200/50 dark:border-gray-700/50 shadow-xs flex flex-col gap-1.5 pointer-events-auto">
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className={`p-1.5 rounded-lg shrink-0 ${theme.header}`}>
                            <FiFolder size={16} />
                        </div>
                        {isEditing ? (
                            <input
                                type="text"
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                className="text-xs font-bold text-gray-800 dark:text-gray-100 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded border border-gray-300 dark:border-gray-600 outline-none w-full"
                                placeholder="Nome da Seção / Pasta"
                                autoFocus
                                onKeyDown={(e) => e.key === 'Enter' && handleSaveInfo()}
                                data-testid="folder-title-input"
                            />
                        ) : (
                            <span
                                className="font-extrabold text-xs tracking-wide truncate text-gray-800 dark:text-gray-100 uppercase"
                                title={title}
                                data-testid="folder-title-display"
                            >
                                {title}
                            </span>
                        )}
                    </div>

                    {/* Ações: Editar, Cores e Excluir */}
                    <div className="flex items-center gap-1 shrink-0">
                        {isEditing ? (
                            <button
                                type="button"
                                onClick={handleSaveInfo}
                                className="p-1 rounded-md bg-green-500 text-white hover:bg-green-600 transition"
                                title="Salvar"
                                data-testid="folder-save-btn"
                            >
                                <FiCheck size={12} />
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={() => {
                                    setEditTitle(title);
                                    setEditDesc(description);
                                    setIsEditing(true);
                                }}
                                className="p-1 rounded-md text-gray-400 hover:text-purple-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                                title="Editar Nome e Descrição"
                                data-testid="folder-edit-btn"
                            >
                                <FiEdit3 size={13} />
                            </button>
                        )}

                        {/* Paleta de cores */}
                        <div className="flex items-center gap-1 px-1 bg-gray-100/70 dark:bg-gray-800/70 rounded-full py-0.5">
                            {Object.keys(THEME_COLORS).map((cKey) => (
                                <button
                                    key={cKey}
                                    type="button"
                                    onClick={() => handleChangeColor(cKey)}
                                    className={`w-2.5 h-2.5 rounded-full transition-transform ${colorKey === cKey ? 'scale-125 ring-1.5 ring-offset-1 ring-purple-500' : 'opacity-70 hover:opacity-100'}`}
                                    style={{ backgroundColor: THEME_COLORS[cKey].dot }}
                                    title={`Tema ${cKey}`}
                                    data-testid={`folder-color-${cKey}`}
                                />
                            ))}
                        </div>

                        {/* Excluir Pasta */}
                        {data?.onDelete && (
                            <button
                                type="button"
                                onClick={() => data.onDelete(id)}
                                className="p-1 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition"
                                title="Excluir Pasta / Seção"
                                data-testid="folder-delete-btn"
                            >
                                <FiTrash2 size={13} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Descrição */}
                {isEditing ? (
                    <textarea
                        value={editDesc}
                        onChange={(e) => setEditDesc(e.target.value)}
                        placeholder="Descreva o objetivo desta etapa (opcional)..."
                        className="text-[11px] text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 p-1.5 rounded border border-gray-300 dark:border-gray-600 outline-none w-full resize-none h-14"
                        data-testid="folder-desc-input"
                    />
                ) : (
                    description && (
                        <p
                            className="text-[10px] text-gray-500 dark:text-gray-400 line-clamp-2 italic px-0.5"
                            data-testid="folder-desc-display"
                        >
                            {description}
                        </p>
                    )
                )}
            </div>

            {/* Corpo interno translúcido onde os nós do funil são acomodados */}
            <div className="flex-1 pointer-events-none p-3" />
        </div>
    );
};

export default React.memo(FolderNode);
