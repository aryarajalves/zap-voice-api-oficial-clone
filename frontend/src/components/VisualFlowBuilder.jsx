import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import ReactFlow, {
    addEdge,
    Background,
    Controls,
    Handle,
    Position,
    applyEdgeChanges,
    applyNodeChanges,
    Panel,
    ReactFlowProvider,
    useReactFlow
} from 'reactflow';
import 'reactflow/dist/style.css';
import { FiMessageSquare, FiClock, FiCpu, FiImage, FiShuffle, FiLink, FiCalendar, FiSave, FiTrash2, FiUploadCloud, FiMaximize, FiMinimize, FiPlus, FiPlay, FiFlag, FiArrowLeft, FiFileText, FiTag, FiMic, FiInfo } from 'react-icons/fi';
import { useClient } from '../contexts/ClientContext';
import { fetchWithAuth } from '../AuthContext';
import { API_URL } from '../config';
import { toast } from 'react-hot-toast';
import ConfirmModal from './ConfirmModal';

export const PortalContext = React.createContext(null);

// --- Shared Components ---

const NodeHeader = ({ label, icon: Icon, colorClass, onDelete, isStart, onSetStart }) => (
    <div className={`flex items-center justify-between gap-2 mb-2 border-b border-gray-100 dark:border-gray-700 pb-2`}>
        <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg ${colorClass}`}>
                <Icon size={16} />
            </div>
            <span className="text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">{label}</span>
            {isStart ? (
                <span className="bg-green-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase shadow-sm flex items-center gap-1">
                    <FiPlay size={8} fill="currentColor" /> Início
                </span>
            ) : (
                onSetStart && (
                    <button
                        onClick={onSetStart}
                        className="nodrag text-gray-300 hover:text-green-500 transition p-1 group relative"
                        title="Definir como Início"
                    >
                        <FiFlag size={12} />
                        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-1 py-0.5 bg-gray-800 text-white text-[8px] rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none">
                            Definir Início
                        </span>
                    </button>
                )
            )}
        </div>
        {!isStart && onDelete && (
            <button
                onClick={onDelete}
                className="nodrag text-gray-400 hover:text-red-500 transition p-1 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20"
                title="Excluir nó"
            >
                <FiTrash2 size={14} />
            </button>
        )}
    </div>
);

// --- Custom Node Components ---

const LegacyDateNode = ({ id, data }) => (
    <div className="px-4 py-2 shadow-sm rounded-lg bg-gray-100 dark:bg-gray-800 border border-dashed border-gray-400 opacity-60 min-w-[200px]">
        <Handle type="target" position={Position.Top} className="w-2 h-2 bg-gray-400" />
        <div className="flex items-center gap-2 text-gray-500 italic text-[10px]">
            <FiAlertTriangle />
            <span>Nó de Agendamento Antigo</span>
            <button
                onClick={() => data.onDelete(id)}
                className="ml-auto text-red-500 hover:text-red-700"
            >
                <FiTrash2 size={12} />
            </button>
        </div>
        <p className="text-[9px] text-gray-400 mt-1">Este nó foi substituído pela "Condição Inteligente". Pode deletá-lo.</p>
        <Handle type="source" position={Position.Bottom} className="w-2 h-2 bg-gray-400" />
    </div>
);

const MessageNode = ({ id, data }) => {
    const variations = data.variations || [];

    const handleAddVariation = () => {
        if (variations.length >= 4) {
            toast.error("Máximo de 5 versões (1 principal + 4 variações).");
            return;
        }
        data.onChange(id, { variations: [...variations, ''] });
    };

    const handleRemoveVariation = (index) => {
        const newVariations = variations.filter((_, i) => i !== index);
        data.onChange(id, { variations: newVariations });
    };

    const handleVariationChange = (index, val) => {
        const newVariations = [...variations];
        newVariations[index] = val;
        data.onChange(id, { variations: newVariations });
    };

    return (
        <div className="px-4 py-3 shadow-lg rounded-xl bg-white dark:bg-gray-800 border-2 border-blue-500 min-w-[300px] transition-all hover:shadow-2xl hover:border-blue-400">
            {!data.isStart && <Handle type="target" position={Position.Top} className="w-3 h-3 bg-blue-500" />}
            <NodeHeader
                label="Mensagem"
                icon={FiMessageSquare}
                colorClass="bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400"
                onDelete={() => data.onDelete(id)}
                isStart={data.isStart}
                onSetStart={() => data.onSetStart(id, 'messageNode')}
            />

            <div className="space-y-3">
                <div className="relative">
                    <span className="text-[10px] font-bold text-blue-500 uppercase mb-1 block">Versão 1 (Principal)</span>
                    <textarea
                        className="nodrag nopan w-full text-base p-3 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 outline-none resize-none min-h-[80px]"
                        placeholder="Digite a mensagem..."
                        value={data.content || ''}
                        onChange={(evt) => data.onChange(id, { content: evt.target.value })}
                    />
                </div>

                {variations.map((v, idx) => (
                    <div key={idx} className="relative animate-fade-in group">
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-[10px] font-bold text-gray-400 uppercase">Versão {idx + 2}</span>
                            <button
                                onClick={() => handleRemoveVariation(idx)}
                                className="text-gray-400 hover:text-red-500 transition nodrag"
                                title="Remover Variação"
                            >
                                <FiTrash2 size={10} />
                            </button>
                        </div>
                        <textarea
                            className="nodrag nopan w-full text-sm p-2 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg border border-gray-100 dark:border-gray-800 focus:ring-2 focus:ring-blue-400 outline-none resize-none min-h-[60px]"
                            placeholder={`Digite a variação ${idx + 2}...`}
                            value={v}
                            onChange={(e) => handleVariationChange(idx, e.target.value)}
                        />
                    </div>
                ))}

                {variations.length < 4 && (
                    <button
                        onClick={handleAddVariation}
                        className="w-full py-2 text-xs font-bold text-blue-500 border border-dashed border-blue-200 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition flex items-center justify-center gap-1 nodrag"
                    >
                        <FiPlus /> Adicionar Versão A/B
                    </button>
                )}
            </div>

            <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-blue-500" />
        </div>
    );
};

const MediaNode = ({ id, data }) => {
    const { activeClient } = useClient();
    const [uploading, setUploading] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const portalContainer = React.useContext(PortalContext);

    const handleUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // 1. Validar Tipo (PNG, JPG, PDF, MP4)
        const allowedTypes = ['image/png', 'image/jpeg', 'application/pdf', 'video/mp4'];
        if (!allowedTypes.includes(file.type)) {
            toast.error(`Formato "${file.type}" não aceito. Use apenas: PNG, JPG, PDF ou MP4.`);
            return;
        }

        // 2. Validar Tamanho (16MB)
        const MAX_SIZE = 16 * 1024 * 1024;
        if (file.size > MAX_SIZE) {
            toast.error(`Arquivo muito grande (${(file.size / 1024 / 1024).toFixed(2)}MB). O limite do WhatsApp é de 16MB.`);
            return;
        }

        const formData = new FormData();
        formData.append('file', file);
        setUploading(true);

        try {
            const token = localStorage.getItem('token');
            const uploadUrl = `${API_URL}/upload`;
            console.log('Initiating upload to:', uploadUrl);

            const res = await fetch(uploadUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    ...(activeClient?.id ? { 'X-Client-ID': activeClient.id.toString() } : {})
                },
                body: formData
            });

            if (res.ok) {
                const result = await res.json();
                data.onChange(id, { mediaUrl: result.url, fileName: result.filename, mediaType: file.type.split('/')[0] });
                toast.success("Upload concluído!");
            } else {
                console.error("Upload response:", res);
                toast.error(`Erro ${res.status}: ${res.statusText}`);
            }
        } catch (error) {
            console.error("Upload error:", error);
            toast.error("Erro de conexão ao enviar arquivo");
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="px-4 py-3 shadow-lg rounded-xl bg-white dark:bg-gray-800 border-2 border-pink-500 min-w-[280px] transition-all hover:shadow-2xl">
            {!data.isStart && <Handle type="target" position={Position.Top} className="w-3 h-3 bg-pink-500" />}
            <NodeHeader
                label="Mídia"
                icon={FiImage}
                colorClass="bg-pink-100 dark:bg-pink-900/40 text-pink-600 dark:text-pink-400"
                onDelete={() => data.onDelete(id)}
                isStart={data.isStart}
                onSetStart={() => data.onSetStart(id, 'mediaNode')}
            />

            {data.mediaUrl ? (
                <div className="mb-2 relative group">
                    {data.mediaType === 'image' ? (
                        <img src={data.mediaUrl} alt="Preview" className="w-full h-40 object-cover rounded-lg shadow-sm" />
                    ) : data.mediaType === 'video' ? (
                        <video src={data.mediaUrl} className="w-full h-40 object-cover rounded-lg shadow-sm" controls />
                    ) : (
                        <div className="p-4 bg-gray-100 dark:bg-gray-900 rounded-lg text-center text-sm break-all">{data.fileName}</div>
                    )}
                    <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="nodrag absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full shadow-md hover:bg-red-600 transition z-10"
                        title="Remover Mídia"
                    >
                        <FiTrash2 size={14} />
                    </button>
                    <input
                        type="text"
                        placeholder="Legenda (opcional)"
                        className="nodrag nopan w-full mt-2 text-xs p-2 border rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                        value={data.caption || ''}
                        onChange={(e) => data.onChange(id, { caption: e.target.value })}
                    />
                </div>
            ) : (
                <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900 transition group">
                    <FiUploadCloud className={`w-10 h-10 text-gray-400 group-hover:text-pink-500 transition ${uploading ? 'animate-bounce' : ''}`} />
                    <span className="text-sm text-gray-500 mt-2 font-medium group-hover:text-gray-700 dark:group-hover:text-gray-300">{uploading ? 'Enviando...' : 'Clique para Upload'}</span>
                    <span className="text-[10px] text-gray-400">PNG, JPG, PDF, MP4 (Máx 16MB)</span>
                    <input type="file" className="hidden nodrag" onChange={handleUpload} disabled={uploading} accept=".png,.jpg,.jpeg,.pdf,.mp4" />
                </label>
            )}
            <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-pink-500" />

            <ConfirmModal
                isOpen={showDeleteConfirm}
                onClose={() => setShowDeleteConfirm(false)}
                onConfirm={() => {
                    data.onChange(id, { mediaUrl: null, fileName: null });
                    toast.success("Mídia removida!");
                }}
                title="Remover Mídia?"
                message="Tem certeza que deseja remover este arquivo de mídia?"
                confirmText="Remover"
                cancelText="Cancelar"
                isDangerous={true}
                container={portalContainer || document.body}
            />
        </div>
    );
};

const AudioNode = ({ id, data }) => {
    const { activeClient } = useClient();
    const [uploading, setUploading] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const portalContainer = React.useContext(PortalContext);

    const handleUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // 1. Validar Tipo (MP3, OGG, WAV, AAC/MP4)
        const allowedTypes = ['audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/mp4', 'audio/aac'];
        if (!allowedTypes.includes(file.type)) {
            toast.error(`Formato "${file.type}" não aceito. Use apenas: MP3, OGG, WAV ou AAC.`);
            return;
        }

        // 2. Validar Tamanho (16MB)
        const MAX_SIZE = 16 * 1024 * 1024;
        if (file.size > MAX_SIZE) {
            toast.error(`Arquivo muito grande (${(file.size / 1024 / 1024).toFixed(2)}MB). O limite do WhatsApp é de 16MB.`);
            return;
        }

        const formData = new FormData();
        formData.append('file', file);
        setUploading(true);

        try {
            const token = localStorage.getItem('token');
            const uploadUrl = `${API_URL}/upload`;

            const res = await fetch(uploadUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    ...(activeClient?.id ? { 'X-Client-ID': activeClient.id.toString() } : {})
                },
                body: formData
            });

            if (res.ok) {
                const result = await res.json();
                data.onChange(id, { mediaUrl: result.url, fileName: result.filename, mediaType: 'audio' });
                toast.success("Upload de áudio concluído!");
            } else {
                toast.error(`Erro ${res.status}: ${res.statusText}`);
            }
        } catch (error) {
            console.error("Upload error:", error);
            toast.error("Erro de conexão ao enviar arquivo");
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="px-3 py-2 shadow-md rounded-xl bg-white dark:bg-gray-800 border-2 border-cyan-500 min-w-[240px] max-w-[280px] transition-all hover:shadow-lg hover:border-cyan-400">
            {!data.isStart && <Handle type="target" position={Position.Top} className="w-3 h-3 bg-cyan-500" />}
            <NodeHeader
                label="Áudio"
                icon={FiMic}
                colorClass="bg-cyan-100 dark:bg-cyan-900/40 text-cyan-600 dark:text-cyan-400"
                onDelete={() => data.onDelete(id)}
                isStart={data.isStart}
                onSetStart={() => data.onSetStart(id, 'audioNode')}
            />

            {data.mediaUrl ? (
                <div className="mb-2 relative group flex flex-col items-center">
                    <div className="w-full bg-gray-50 dark:bg-gray-900/50 rounded-lg p-2 flex flex-col items-center gap-1 overflow-hidden">
                        <audio src={data.mediaUrl} controls className="w-full h-8" style={{ minWidth: '200px' }} />
                        <div className="text-[10px] text-gray-500 truncate w-full text-center">{data.fileName}</div>
                    </div>

                    <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="nodrag absolute -top-2 -right-2 bg-red-500 text-white p-1.5 rounded-full shadow-md hover:bg-red-600 transition z-10"
                        title="Remover Áudio"
                    >
                        <FiTrash2 size={12} />
                    </button>

                    <div className="mt-2 w-full flex flex-col gap-2">
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                            <div className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={data.sendPrivateNote || false}
                                    onChange={(e) => data.onChange(id, { ...data, sendPrivateNote: e.target.checked })}
                                />
                                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-cyan-600"></div>
                            </div>
                            <span className="text-xs text-gray-600 dark:text-gray-300">Enviar Nota Privada?</span>
                        </label>

                        {data.sendPrivateNote && (
                            <textarea
                                className="w-full text-xs p-2 rounded border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-cyan-500 resize-none nodrag"
                                rows={3}
                                placeholder="Conteúdo da nota privada..."
                                value={data.privateNoteContent || ''}
                                onChange={(e) => data.onChange(id, { ...data, privateNoteContent: e.target.value })}
                            />
                        )}
                    </div>
                </div>
            ) : (
                <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900 transition group">
                    <FiUploadCloud className={`w-8 h-8 text-gray-400 group-hover:text-cyan-500 transition ${uploading ? 'animate-bounce' : ''}`} />
                    <span className="text-xs text-gray-500 mt-1 font-medium group-hover:text-gray-700 dark:group-hover:text-gray-300">{uploading ? '...' : 'Upload MP3/OGG'}</span>
                    <span className="text-[10px] text-gray-400">MP3, OGG, WAV (Máx 16MB)</span>
                    <input type="file" className="hidden nodrag" onChange={handleUpload} disabled={uploading} accept=".mp3,.ogg,.wav,.aac,.mp4" />
                </label>
            )}
            <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-cyan-500" />

            <ConfirmModal
                isOpen={showDeleteConfirm}
                onClose={() => setShowDeleteConfirm(false)}
                onConfirm={() => {
                    data.onChange(id, { mediaUrl: null, fileName: null });
                    toast.success("Áudio removido!");
                }}
                title="Remover Áudio?"
                message="Tem certeza que deseja remover este arquivo de áudio?"
                confirmText="Remover"
                cancelText="Cancelar"
                isDangerous={true}
                container={portalContainer || document.body}
            />
        </div>
    );
};

const RandomizerNode = ({ id, data }) => {
    // Verify paths structure -> Default to 2 paths (A/B) 50/50 if not exists
    const paths = data.paths || [
        { id: 'a', label: 'Caminho A', percent: 50 },
        { id: 'b', label: 'Caminho B', percent: 50 }
    ];

    const currentTotal = paths.reduce((acc, p) => acc + (parseInt(p.percent) || 0), 0);
    const isValid = currentTotal === 100;

    const handleAddPath = () => {
        if (paths.length >= 5) return;
        const nextChar = String.fromCharCode(97 + paths.length); // c, d, e...
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
            <Handle type="target" position={Position.Top} className="w-3 h-3 bg-indigo-500" />
            <NodeHeader
                label="Teste A/B (Random)"
                icon={FiShuffle}
                colorClass="bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400"
                onDelete={() => data.onDelete(id)}
                isStart={data.isStart}
            // No onSetStart
            />

            <div className="space-y-3 px-1">
                <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-900/50 p-2 rounded text-xs text-gray-500">
                    <span>Total: <span className={`font-bold ${isValid ? 'text-green-500' : 'text-red-500'}`}>{currentTotal}%</span></span>
                    <button onClick={distributeEvenly} className="text-blue-500 hover:underline cursor-pointer nodrag">Distribuir</button>
                </div>

                {paths.map((path, idx) => (
                    <div key={path.id} className="relative">
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase">{path.label}</span>
                            <div className="flex items-center gap-2">
                                <input
                                    type="number"
                                    min="0" max="100"
                                    className="w-12 text-center text-xs p-1 border rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 nodrag"
                                    value={path.percent}
                                    onChange={(e) => handlePercentChange(path.id, e.target.value)}
                                />
                                <span className="text-xs text-gray-400">%</span>
                                {paths.length > 2 && (
                                    <button
                                        onClick={() => handleRemovePath(path.id)}
                                        className="text-gray-400 hover:text-red-500 nodrag"
                                        title="Remover Caminho"
                                    >
                                        <FiTrash2 size={10} />
                                    </button>
                                )}
                            </div>
                        </div>
                        {/* Dynamic Handle Position approx */}
                        <Handle
                            id={path.id}
                            type="source"
                            position={Position.Right}
                            className={`w-3 h-3 !-right-2 top-auto ${isValid ? 'bg-indigo-500' : 'bg-red-500'}`}
                            style={{ top: `${((idx + 1) / (paths.length + 1)) * 100}%` }}
                        />
                    </div>
                ))}

                {paths.length < 5 && (
                    <button
                        onClick={handleAddPath}
                        className="w-full py-1.5 text-xs font-bold text-indigo-500 border border-dashed border-indigo-300 rounded hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition flex items-center justify-center gap-1 nodrag"
                    >
                        <FiPlus /> Adicionar Caminho
                    </button>
                )}
            </div>
        </div>
    );
};

const LinkFunnelNode = ({ id, data }) => {
    const { activeClient } = useClient();
    const [funnels, setFunnels] = useState([]);

    useEffect(() => {
        if (!activeClient) return;
        fetchWithAuth(`${API_URL}/funnels`, { headers: { 'X-Client-ID': activeClient.id } })
            .then(res => res.json())
            .then(setFunnels)
            .catch(console.error);
    }, [activeClient]);

    return (
        <div className="px-4 py-3 shadow-lg rounded-xl bg-white dark:bg-gray-800 border-2 border-orange-500 min-w-[240px]">
            <Handle type="target" position={Position.Top} className="w-3 h-3 bg-orange-500" />
            <NodeHeader
                label="Conectar Funil"
                icon={FiLink}
                colorClass="bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400"
                onDelete={() => data.onDelete(id)}
                isStart={data.isStart}
            // No onSetStart
            />

            <select
                className="nodrag nopan w-full text-sm p-2 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded border border-gray-200 outline-none"
                value={data.funnelId || ''}
                onChange={(e) => data.onChange(id, { funnelId: e.target.value })}
            >
                <option value="">Selecione um Funil...</option>
                {funnels.map(f => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                ))}
            </select>
        </div>
    );
};

const TemplateNode = ({ id, data }) => {
    const { activeClient } = useClient();
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!activeClient) return;
        setLoading(true);
        fetchWithAuth(`${API_URL}/whatsapp/templates`, {}, activeClient.id)
            .then(res => res.json())
            .then(setTemplates)
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [activeClient]);

    return (
        <div className="px-4 py-3 shadow-lg rounded-xl bg-white dark:bg-gray-800 border-2 border-emerald-500 min-w-[280px] max-w-[320px] transition-all hover:shadow-2xl hover:border-emerald-400">
            {/* Template nodes have no handles: they cannot be connected to others */}
            <NodeHeader
                label="Template WhatsApp"
                icon={FiFileText}
                colorClass="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400"
                onDelete={() => data.onDelete(id)}
                isStart={data.isStart}
                onSetStart={() => data.onSetStart(id, 'templateNode')}
            />

            <div className="space-y-3">
                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-100 dark:border-blue-900/30">
                    <p className="text-[10px] text-blue-700 dark:text-blue-400 leading-tight">
                        Este nó é <strong>isolado</strong>. Para funcionar, ele deve ser definido como o <strong>Ponto de Início</strong> (ícone de bandeira).
                    </p>
                </div>

                <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Modelo (Template)</label>
                    <select
                        className={`nodrag nopan w-full text-sm p-2 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded border border-gray-200 outline-none ${loading ? 'opacity-50 cursor-wait' : ''}`}
                        value={data.templateName || ''}
                        onChange={(e) => {
                            const selectedName = e.target.value;
                            const t = templates.find(temp => temp.name === selectedName);
                            data.onChange(id, {
                                templateName: selectedName,
                                language: t ? t.language : 'pt_BR'
                            });
                        }}
                        disabled={loading}
                    >
                        {loading ? (
                            <option value="">🔄 Carregando templates...</option>
                        ) : (
                            <>
                                <option value="">Selecione um Template...</option>
                                {Array.isArray(templates) && templates.map(t => (
                                    <option key={t.id || t.name} value={t.name}>{t.name} ({t.language})</option>
                                ))}
                            </>
                        )}
                    </select>
                </div>

                {/* Preview Section */}
                {data.templateName && templates.find(t => t.name === data.templateName) && (() => {
                    const t = templates.find(t => t.name === data.templateName);
                    const body = t.components?.find(c => c.type === 'BODY')?.text || '';
                    const header = t.components?.find(c => c.type === 'HEADER');
                    const buttons = t.components?.find(c => c.type === 'BUTTONS')?.buttons || [];

                    return (
                        <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-100 dark:border-gray-800 animate-in fade-in duration-300">
                            {/* Categoria */}
                            <div className="flex items-center gap-1.5 mb-2">
                                <span className="px-2 py-0.5 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-[9px] font-bold rounded uppercase tracking-wider flex items-center gap-1">
                                    <FiTag size={10} /> {t.category}
                                </span>
                                <span className="text-[9px] text-gray-400 font-medium">{t.language}</span>
                            </div>

                            {/* Header Media Badge */}
                            {header && header.format !== 'TEXT' && (
                                <div className="flex items-center gap-1 text-blue-500 mb-2">
                                    <FiImage size={12} />
                                    <span className="text-[10px] font-bold uppercase">{header.format}</span>
                                </div>
                            )}

                            {/* Body Text Preview */}
                            <div className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed italic border-l-2 border-emerald-500/30 pl-2 py-1 mb-3">
                                {body || 'Sem conteúdo de texto'}
                            </div>

                            {/* Buttons Preview */}
                            {buttons.length > 0 && (
                                <div className="space-y-1">
                                    <span className="text-[9px] font-bold text-gray-400 uppercase block mb-1">Botões Interativos</span>
                                    {buttons.map((btn, idx) => (
                                        <div key={idx} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-center py-1.5 rounded-md text-[10px] font-medium text-blue-600 dark:text-blue-400 shadow-sm">
                                            {btn.text}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })()}
                {/* 24h Window Check Toggle */}
                <div className="mt-4 border-t border-gray-100 dark:border-gray-700 pt-3">
                    <label className="flex items-center gap-2 cursor-pointer mb-2">
                        <input
                            type="checkbox"
                            className="w-3 h-3 text-purple-500 rounded border-gray-300 focus:ring-purple-500"
                            checked={data.check24hWindow || false}
                            onChange={(e) => data.onChange(id, { check24hWindow: e.target.checked })}
                        />
                        <span className="text-[10px] font-bold text-gray-500 uppercase">Verificar Janela 24h?</span>
                    </label>

                    {data.check24hWindow && (
                        <div className="animate-fade-in space-y-2 p-2 bg-purple-50 dark:bg-purple-900/10 rounded-lg border border-purple-100 dark:border-purple-800">
                            <div className="flex items-start gap-1.5 mb-2">
                                <FiInfo className="text-purple-500 mt-0.5 shrink-0" size={12} />
                                <p className="text-[9px] text-purple-700 dark:text-purple-300 leading-tight">
                                    Se houver interação nas últimas 24h, o sistema enviará a mensagem abaixo (sessão 24h) em vez do template pago.
                                </p>
                            </div>

                            <div className="flex gap-2 mb-2">
                                <button
                                    onClick={() => {
                                        if (data.templateName) {
                                            const t = templates.find(temp => temp.name === data.templateName);
                                            if (t) {
                                                const body = t.components?.find(c => c.type === 'BODY')?.text || '';
                                                data.onChange(id, { fallbackMessage: body });
                                                toast.success("Texto do template copiado!");
                                            }
                                        }
                                    }}
                                    className="text-[9px] px-2 py-1 bg-purple-100 hover:bg-purple-200 dark:bg-purple-900/40 dark:hover:bg-purple-800 text-purple-700 dark:text-purple-300 rounded transition flex items-center gap-1"
                                    title="Preencher com o texto do template selecionado acima"
                                >
                                    <FiFileText size={10} /> Copiar do Template
                                </button>
                            </div>

                            <div className="relative group/fb">
                                <textarea
                                    className="nodrag nopan w-full text-xs p-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded border border-purple-200 dark:border-purple-700 focus:ring-1 focus:ring-purple-500 outline-none resize-none min-h-[80px]"
                                    placeholder="Mensagem alternativa (Opcional). Se vazio, envia o template mesmo com janela aberta."
                                    value={data.fallbackMessage || ''}
                                    onChange={(e) => data.onChange(id, { fallbackMessage: e.target.value })}
                                />
                                <button
                                    onClick={() => data.onChange(id, { isFallbackExpanded: true })}
                                    className="absolute top-1 right-1 p-1 text-gray-400 hover:text-purple-500 bg-white/50 dark:bg-black/20 rounded opacity-0 group-hover/fb:opacity-100 transition"
                                    title="Maximizar"
                                >
                                    <FiMaximize size={12} />
                                </button>
                            </div>

                            {/* Buttons for Fallback Message */}
                            <div className="mt-2 space-y-2">
                                {(data.fallbackButtons || []).map((btn, idx) => (
                                    <div key={idx} className="flex gap-1 group">
                                        <input
                                            type="text"
                                            className="nodrag nopan flex-1 text-[10px] p-1.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded border border-purple-200 dark:border-purple-700 outline-none focus:border-purple-500"
                                            placeholder={`Botão ${idx + 1}`}
                                            value={btn}
                                            onChange={(e) => {
                                                const newButtons = [...(data.fallbackButtons || [])];
                                                newButtons[idx] = e.target.value;
                                                data.onChange(id, { fallbackButtons: newButtons });
                                            }}
                                            maxLength={20}
                                        />
                                        <button
                                            onClick={() => {
                                                const newButtons = (data.fallbackButtons || []).filter((_, i) => i !== idx);
                                                data.onChange(id, { fallbackButtons: newButtons });
                                            }}
                                            className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition nodrag"
                                        >
                                            <FiTrash2 size={12} />
                                        </button>
                                    </div>
                                ))}
                                {(data.fallbackButtons || []).length < 3 && (
                                    <button
                                        onClick={() => {
                                            const newButtons = [...(data.fallbackButtons || []), ''];
                                            data.onChange(id, { fallbackButtons: newButtons });
                                        }}
                                        className="w-full py-1.5 border border-dashed border-purple-300 dark:border-purple-700 rounded text-[10px] text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/20 transition flex items-center justify-center gap-1 nodrag"
                                    >
                                        <FiPlus size={12} /> Adicionar Botão
                                    </button>
                                )}
                            </div>

                            {/* Expanded Modal for Fallback */}
                            {data.isFallbackExpanded && (
                                <div className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                                    <div className="bg-white dark:bg-gray-800 w-full max-w-2xl rounded-xl shadow-2xl flex flex-col max-h-[90vh]">
                                        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700">
                                            <h3 className="font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                                                <FiMessageSquare /> Mensagem Alternativa (Expandida)
                                            </h3>
                                            <button
                                                onClick={() => data.onChange(id, { isFallbackExpanded: false })}
                                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition"
                                            >
                                                <FiMinimize size={18} />
                                            </button>
                                        </div>
                                        <div className="p-4 flex-1">
                                            <textarea
                                                className="w-full h-[60vh] text-base p-4 bg-purple-50 dark:bg-purple-900/10 text-gray-800 dark:text-gray-200 rounded-lg border border-purple-200 dark:border-purple-800 focus:ring-2 focus:ring-purple-500 outline-none resize-none"
                                                value={data.fallbackMessage || ''}
                                                onChange={(e) => data.onChange(id, { fallbackMessage: e.target.value })}
                                                placeholder="Escreva a mensagem alternativa..."
                                                autoFocus
                                            />
                                        </div>
                                        <div className="p-4 border-t border-gray-100 dark:border-gray-700 flex justify-end">
                                            <button
                                                onClick={() => data.onChange(id, { isFallbackExpanded: false })}
                                                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-bold text-sm"
                                            >
                                                Concluir
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Private Message Toggle */}
                <div className="mt-4 border-t border-gray-100 dark:border-gray-700 pt-3">
                    <label className="flex items-center gap-2 cursor-pointer mb-2">
                        <input
                            type="checkbox"
                            className="w-3 h-3 text-emerald-500 rounded border-gray-300 focus:ring-emerald-500"
                            checked={data.sendPrivateMessage || false}
                            onChange={(e) => data.onChange(id, { sendPrivateMessage: e.target.checked })}
                        />
                        <span className="text-[10px] font-bold text-gray-500 uppercase">Enviar Nota Privada no Chatwoot?</span>
                    </label>

                    {data.sendPrivateMessage && (
                        <div className="animate-fade-in space-y-2">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="w-3 h-3 text-blue-500 rounded border-gray-300 focus:ring-blue-500"
                                    checked={data.useTemplateBody || false}
                                    onChange={(e) => {
                                        const useBody = e.target.checked;
                                        let newMsg = data.privateMessage;

                                        if (useBody && data.templateName) {
                                            const t = templates.find(temp => temp.name === data.templateName);
                                            if (t) {
                                                const body = t.components?.find(c => c.type === 'BODY')?.text || '';
                                                newMsg = body;
                                            }
                                        }
                                        data.onChange(id, { useTemplateBody: useBody, privateMessage: newMsg });
                                    }}
                                />
                                <span className="text-[9px] text-gray-400">Usar texto do template automaticamente</span>
                            </label>

                            <div className="relative group">
                                <textarea
                                    className={`nodrag nopan w-full text-xs p-2 bg-yellow-50 dark:bg-yellow-900/10 text-gray-800 dark:text-gray-200 rounded border border-yellow-200 dark:border-yellow-800 focus:ring-1 focus:ring-yellow-500 outline-none resize-none min-h-[60px] ${data.useTemplateBody ? 'opacity-60 cursor-not-allowed' : ''}`}
                                    placeholder="Escreva a nota interna para o agente..."
                                    value={data.privateMessage || ''}
                                    onChange={(e) => data.onChange(id, { privateMessage: e.target.value })}
                                    readOnly={data.useTemplateBody}
                                />
                                <button
                                    onClick={() => data.onChange(id, { isExpanded: true })}
                                    className="absolute top-1 right-1 p-1 text-gray-400 hover:text-blue-500 bg-white/50 dark:bg-black/20 rounded opacity-0 group-hover:opacity-100 transition"
                                    title="Maximizar"
                                >
                                    <FiMaximize size={12} />
                                </button>
                            </div>

                            {/* Expanded Modal */}
                            {data.isExpanded && (
                                <div className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                                    <div className="bg-white dark:bg-gray-800 w-full max-w-2xl rounded-xl shadow-2xl flex flex-col max-h-[90vh]">
                                        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700">
                                            <h3 className="font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                                                <FiFileText /> Nota Interna (Expandida)
                                            </h3>
                                            <button
                                                onClick={() => data.onChange(id, { isExpanded: false })}
                                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition"
                                            >
                                                <FiMinimize size={18} />
                                            </button>
                                        </div>
                                        <div className="p-4 flex-1">
                                            <textarea
                                                className={`w-full h-[60vh] text-base p-4 bg-yellow-50 dark:bg-yellow-900/10 text-gray-800 dark:text-gray-200 rounded-lg border border-yellow-200 dark:border-yellow-800 focus:ring-2 focus:ring-yellow-500 outline-none resize-none ${data.useTemplateBody ? 'opacity-80 cursor-not-allowed' : ''}`}
                                                value={data.privateMessage || ''}
                                                onChange={(e) => data.onChange(id, { privateMessage: e.target.value })}
                                                readOnly={data.useTemplateBody}
                                                placeholder="Escreva a nota interna para o agente..."
                                                autoFocus
                                            />
                                        </div>
                                        <div className="p-4 border-t border-gray-100 dark:border-gray-700 flex justify-end">
                                            <button
                                                onClick={() => data.onChange(id, { isExpanded: false })}
                                                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition font-bold text-sm"
                                            >
                                                Concluir
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
            {/* TemplateNode is terminal: no source handle at the bottom */}
        </div>
    );
};


const ChatwootLabelNode = ({ id, data }) => {
    const { activeClient } = useClient();
    const [labels, setLabels] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!activeClient) return;
        setLoading(true);
        fetchWithAuth(`${API_URL}/chatwoot/labels`, { headers: { 'X-Client-ID': activeClient.id } })
            .then(res => res.json())
            .then(setLabels)
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [activeClient]);

    return (
        <div className="px-4 py-3 shadow-lg rounded-xl bg-white dark:bg-gray-800 border-2 border-slate-600 min-w-[240px] transition-all hover:shadow-2xl hover:border-slate-400">
            <Handle type="target" position={Position.Top} className="w-3 h-3 bg-slate-600" />
            <NodeHeader
                label="Etiquetar Chatwoot"
                icon={FiTag}
                colorClass="bg-slate-100 dark:bg-slate-900/40 text-slate-600 dark:text-slate-400"
                onDelete={() => data.onDelete(id)}
                isStart={data.isStart}
            />

            <div className="space-y-3">
                <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Etiqueta (Chatwoot)</label>
                    <select
                        className={`nodrag nopan w-full text-sm p-2 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded border border-gray-200 outline-none ${loading ? 'opacity-50 cursor-wait' : ''}`}
                        value={data.label || ''}
                        onChange={(e) => data.onChange(id, { label: e.target.value })}
                        disabled={loading}
                    >
                        {loading ? (
                            <option value="">🔄 Carregando etiquetas...</option>
                        ) : (
                            <>
                                <option value="">Selecione uma Etiqueta...</option>
                                {Array.isArray(labels) && labels.map(l => (
                                    <option key={l.id} value={l.title}>{l.title}</option>
                                ))}
                            </>
                        )}
                    </select>
                </div>
            </div>

            <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-slate-600" />
        </div>
    );
};

const DelayNode = ({ id, data }) => {
    const useRandom = data.useRandom ?? false;

    return (
        <div className="px-4 py-3 shadow-lg rounded-xl bg-white dark:bg-gray-800 border-2 border-yellow-500 min-w-[240px]">
            <Handle type="target" position={Position.Top} className="w-3 h-3 bg-yellow-500" />
            <NodeHeader
                label="Smart Delay"
                icon={FiClock}
                colorClass="bg-yellow-100 dark:bg-yellow-900/40 text-yellow-600 dark:text-yellow-400"
                onDelete={() => data.onDelete(id)}
                isStart={data.isStart}
            />

            <div className="space-y-3">
                {/* Toggle Mode */}
                <div className="flex bg-gray-100 dark:bg-gray-900 p-1 rounded-lg">
                    <button
                        onClick={() => data.onChange(id, { useRandom: false })}
                        className={`flex-1 py-1 text-[10px] font-bold rounded-md transition ${!useRandom ? 'bg-white dark:bg-gray-700 shadow-sm text-yellow-600' : 'text-gray-400'}`}
                    >
                        FIXO
                    </button>
                    <button
                        onClick={() => data.onChange(id, { useRandom: true })}
                        className={`flex-1 py-1 text-[10px] font-bold rounded-md transition ${useRandom ? 'bg-white dark:bg-gray-700 shadow-sm text-yellow-600' : 'text-gray-400'}`}
                    >
                        ALEATÓRIO
                    </button>
                </div>

                {!useRandom ? (
                    <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Tempo de Espera</label>
                        <input
                            type="number"
                            className="nodrag nopan w-full p-2 text-sm border rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-bold text-center"
                            value={data.time || 10}
                            onChange={(e) => data.onChange(id, { time: e.target.value })}
                        />
                    </div>
                ) : (
                    <div className="flex items-center gap-2 animate-fade-in">
                        <div className="flex-1">
                            <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Mínimo</label>
                            <input
                                type="number"
                                className="nodrag nopan w-full p-2 text-sm border rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-bold text-center"
                                value={data.minTime || data.time || 10}
                                onChange={(e) => data.onChange(id, { minTime: e.target.value })}
                            />
                        </div>
                        <div className="flex-1">
                            <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Máximo</label>
                            <input
                                type="number"
                                className="nodrag nopan w-full p-2 text-sm border rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-bold text-center"
                                value={data.maxTime || data.minTime || data.time || 10}
                                onChange={(e) => data.onChange(id, { maxTime: e.target.value })}
                            />
                        </div>
                    </div>
                )}

                <select
                    className="nodrag nopan w-full text-sm border rounded p-1.5 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                    value={data.unit || 'seconds'}
                    onChange={(e) => data.onChange(id, { unit: e.target.value })}
                >
                    <option value="seconds">Segundos</option>
                    <option value="minutes">Minutos</option>
                    <option value="hours">Horas</option>
                    <option value="days">Dias</option>
                </select>

                {useRandom && (
                    <p className="text-[9px] text-yellow-600 dark:text-yellow-400 font-medium italic animate-pulse text-center">
                        🎲 Sorteando tempo no intervalo
                    </p>
                )}
            </div>
            <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-yellow-500" />
        </div>
    );
};

const ConditionNode = ({ id, data }) => {
    const conditionType = data.conditionType || 'text';
    const isRange = conditionType === 'datetime_range';

    return (
        <div className="px-4 py-3 shadow-lg rounded-2xl bg-white dark:bg-gray-800 border-2 border-purple-500 min-w-[300px]">
            <Handle type="target" position={Position.Top} className="w-3 h-3 bg-purple-500" />
            <NodeHeader
                label="Condição Inteligente"
                icon={FiCpu}
                colorClass="bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400"
                onDelete={() => data.onDelete(id)}
                isStart={data.isStart}
            />

            <div className="space-y-4">
                {/* Seletor de Tipo */}
                <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Tipo de Validação</label>
                    <select
                        className="nodrag nopan w-full text-sm border rounded p-2 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-semibold focus:ring-2 focus:ring-purple-500 outline-none"
                        value={conditionType}
                        onChange={(e) => data.onChange(id, { conditionType: e.target.value })}
                    >
                        <option value="text">Busca por Texto (Simples)</option>
                        <option value="tag">Tag no Chatwoot</option>
                        <option value="datetime_range">Período de Data/Hora (Antes/Durante/Depois)</option>
                        <option value="weekday">Dias da Semana</option>
                    </select>
                </div>

                {/* Campos Específicos */}
                {conditionType === 'text' && (
                    <div className="animate-fade-in">
                        <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Palavra ou Frase</label>
                        <input
                            type="text"
                            placeholder="Ex: Clicou 'Promo'?"
                            className="nodrag nopan w-full text-sm p-2 border rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm"
                            value={data.condition || ''}
                            onChange={(e) => data.onChange(id, { condition: e.target.value })}
                        />
                    </div>
                )}

                {conditionType === 'tag' && (
                    <div className="animate-fade-in">
                        <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Nome da Tag (sem #)</label>
                        <input
                            type="text"
                            placeholder="ex: interessado"
                            className="nodrag nopan w-full text-sm p-2 border rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-mono shadow-sm"
                            value={data.tag || ''}
                            onChange={(e) => data.onChange(id, { tag: e.target.value })}
                        />
                        <p className="text-[9px] text-gray-400 mt-1 italic">Dica: O sistema ignora acentos e maiúsculas automaticamente.</p>
                    </div>
                )}

                {isRange && (
                    <div className="space-y-3 animate-fade-in">
                        <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Data/Hora Início (Brasília)</label>
                            <input
                                type="datetime-local"
                                className="nodrag nopan w-full p-2 text-sm border rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm"
                                value={data.startDateTime || ''}
                                onChange={(e) => data.onChange(id, { startDateTime: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Data/Hora Fim (Brasília)</label>
                            <input
                                type="datetime-local"
                                className="nodrag nopan w-full p-2 text-sm border rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm"
                                value={data.endDateTime || ''}
                                onChange={(e) => data.onChange(id, { endDateTime: e.target.value })}
                            />
                        </div>
                    </div>
                )}

                {conditionType === 'weekday' && (
                    <div className="grid grid-cols-2 gap-2 animate-fade-in bg-gray-50 dark:bg-gray-900/50 p-2 rounded-lg">
                        {['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'].map((day, index) => {
                            const dayVal = index.toString();
                            const isSelected = (data.allowedDays || []).includes(dayVal);
                            return (
                                <label key={dayVal} className="flex items-center gap-2 cursor-pointer group">
                                    <input
                                        type="checkbox"
                                        className="w-3 h-3 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
                                        checked={isSelected}
                                        onChange={(e) => {
                                            const newDays = e.target.checked
                                                ? [...(data.allowedDays || []), dayVal]
                                                : (data.allowedDays || []).filter(d => d !== dayVal);
                                            data.onChange(id, { allowedDays: newDays });
                                        }}
                                    />
                                    <span className={`text-[10px] font-bold ${isSelected ? 'text-purple-600' : 'text-gray-400'} group-hover:text-purple-400 transition`}>{day}</span>
                                </label>
                            );
                        })}
                    </div>
                )}

                <div className="h-px bg-gray-100 dark:bg-gray-700 my-2"></div>

                <div className="flex flex-col gap-3 mt-4">
                    {/* Render logic changes based on conditionType */}
                    {isRange ? (
                        <>
                            {/* ANTES */}
                            <div className="space-y-1">
                                <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 p-2 rounded-lg relative border border-blue-100 dark:border-blue-900 shadow-sm">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black text-blue-700 dark:text-blue-400 uppercase">🕒 Antes</span>
                                        <select
                                            className="text-[9px] bg-transparent border-none outline-none font-bold text-blue-600 cursor-pointer"
                                            value={data.beforeAction || 'follow'}
                                            onChange={(e) => data.onChange(id, { beforeAction: e.target.value })}
                                        >
                                            <option value="follow">SEGUIR FLUXO</option>
                                            <option value="wait">AGUARDAR INÍCIO</option>
                                        </select>
                                    </div>
                                    {(data.beforeAction === 'follow' || !data.beforeAction) && (
                                        <Handle id="before" type="source" position={Position.Right} className="w-3 h-3 bg-blue-500 !-right-2" />
                                    )}
                                </div>
                            </div>

                            {/* DURANTE */}
                            <div className="space-y-1">
                                <div className="flex items-center justify-between bg-green-50 dark:bg-green-900/20 p-2 rounded-lg relative border border-green-100 dark:border-green-900 shadow-sm">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black text-green-700 dark:text-green-400 uppercase">✅ Durante</span>
                                        <select
                                            className="text-[9px] bg-transparent border-none outline-none font-bold text-green-600 cursor-pointer"
                                            value={data.betweenAction || 'follow'}
                                            onChange={(e) => data.onChange(id, { betweenAction: e.target.value })}
                                        >
                                            <option value="follow">SEGUIR FLUXO</option>
                                            <option value="wait">AGUARDAR FIM</option>
                                        </select>
                                    </div>
                                    {(data.betweenAction === 'follow' || !data.betweenAction) && (
                                        <Handle id="between" type="source" position={Position.Right} className="w-3 h-3 bg-green-500 !-right-2" />
                                    )}
                                </div>
                            </div>

                            {/* DEPOIS */}
                            <div className="space-y-1">
                                <div className="flex items-center justify-between bg-red-50 dark:bg-red-900/20 p-2 rounded-lg relative border border-red-100 dark:border-red-900 shadow-sm">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black text-red-700 dark:text-red-400 uppercase">🚫 Depois</span>
                                        <select
                                            className="text-[9px] bg-transparent border-none outline-none font-bold text-red-600 cursor-pointer"
                                            value={data.afterAction || 'follow'}
                                            onChange={(e) => data.onChange(id, { afterAction: e.target.value })}
                                        >
                                            <option value="follow">SEGUIR FLUXO</option>
                                            <option value="stop">ENCERRAR FLUXO</option>
                                        </select>
                                    </div>
                                    {(data.afterAction === 'follow' || !data.afterAction) && (
                                        <Handle id="after" type="source" position={Position.Right} className="w-3 h-3 bg-red-500 !-right-2" />
                                    )}
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="flex items-center justify-between bg-green-50 dark:bg-green-900/20 p-2 rounded-lg relative border border-green-100 dark:border-green-900 shadow-sm">
                                <span className="text-xs font-black text-green-700 dark:text-green-400 uppercase flex items-center gap-1">✅ Sim / Válido</span>
                                <Handle id="yes" type="source" position={Position.Right} className="w-3 h-3 bg-green-500 !-right-2" />
                            </div>
                            <div className="flex items-center justify-between bg-red-50 dark:bg-red-900/20 p-2 rounded-lg relative border border-red-100 dark:border-red-900 shadow-sm">
                                <span className="text-xs font-black text-red-700 dark:text-red-400 uppercase flex items-center gap-1">❌ Não / Inválido</span>
                                <Handle id="no" type="source" position={Position.Right} className="w-3 h-3 bg-red-500 !-right-2" />
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

// --- Context Menu Component ---

const ContextMenu = ({ top, left, onClose, onAddNode }) => {
    return (
        <div
            style={{ top, left }}
            className="absolute z-50 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 w-52 overflow-hidden animate-fade-in"
            onMouseLeave={onClose}
        >
            <div className="px-3 py-2 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-gray-500 tracking-wider">Adicionar Nó</span>
                <kbd className="text-[10px] text-gray-400 font-mono">ESC</kbd>
            </div>
            <div className="flex flex-col p-1 gap-0.5">
                <button onClick={() => onAddNode('messageNode')} className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 rounded-md transition text-left group">
                    <div className="bg-blue-100 dark:bg-blue-900/50 p-1 rounded group-hover:bg-blue-200 transition"><FiMessageSquare className="text-blue-500" /></div> Mensagem
                </button>
                <button onClick={() => onAddNode('mediaNode')} className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-pink-50 dark:hover:bg-pink-900/30 hover:text-pink-600 rounded-md transition text-left group">
                    <div className="bg-pink-100 dark:bg-pink-900/50 p-1 rounded group-hover:bg-pink-200 transition"><FiImage className="text-pink-500" /></div> Mídia
                </button>
                <button onClick={() => onAddNode('audioNode')} className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-cyan-50 dark:hover:bg-cyan-900/30 hover:text-cyan-600 rounded-md transition text-left group">
                    <div className="bg-cyan-100 dark:bg-cyan-900/50 p-1 rounded group-hover:bg-cyan-200 transition"><FiMic className="text-cyan-500" /></div> Áudio
                </button>
                <button onClick={() => onAddNode('delayNode')} className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-yellow-50 dark:hover:bg-yellow-900/30 hover:text-yellow-600 rounded-md transition text-left group">
                    <div className="bg-yellow-100 dark:bg-yellow-900/50 p-1 rounded group-hover:bg-yellow-200 transition"><FiClock className="text-yellow-500" /></div> Delay
                </button>
                <div className="h-px bg-gray-100 dark:bg-gray-700 my-1"></div>
                <button onClick={() => onAddNode('conditionNode')} className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-purple-50 dark:hover:bg-purple-900/30 hover:text-purple-600 rounded-md transition text-left group">
                    <div className="bg-purple-100 dark:bg-purple-900/50 p-1 rounded group-hover:bg-purple-200 transition"><FiCpu className="text-purple-500" /></div> Condição
                </button>
                <button onClick={() => onAddNode('randomizerNode')} className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600 rounded-md transition text-left group">
                    <div className="bg-indigo-100 dark:bg-indigo-900/50 p-1 rounded group-hover:bg-indigo-200 transition"><FiShuffle className="text-indigo-500" /></div> Teste A/B
                </button>
                <button onClick={() => onAddNode('templateNode')} className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 hover:text-emerald-600 rounded-md transition text-left group">
                    <div className="bg-emerald-100 dark:bg-emerald-900/50 p-1 rounded group-hover:bg-emerald-200 transition"><FiFileText className="text-emerald-500" /></div> Template WhatsApp
                </button>
                <button onClick={() => onAddNode('linkFunnelNode')} className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-orange-50 dark:hover:bg-orange-900/30 hover:text-orange-600 rounded-md transition text-left group">
                    <div className="bg-orange-100 dark:bg-orange-900/50 p-1 rounded group-hover:bg-orange-200 transition"><FiLink className="text-orange-500" /></div> Conectar Funil
                </button>
                <button onClick={() => onAddNode('chatwoot_label')} className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-slate-100 dark:hover:bg-slate-900/30 hover:text-slate-600 rounded-md transition text-left group">
                    <div className="bg-slate-200 dark:bg-slate-800 p-1 rounded group-hover:bg-slate-300 transition"><FiTag className="text-slate-500" /></div> Etiquetar Chatwoot
                </button>
            </div>
        </div>
    );
};

// --- NodeTypes Definition ---
const nodeTypes = {
    messageNode: MessageNode,
    mediaNode: MediaNode,
    audioNode: AudioNode,
    delayNode: DelayNode,
    conditionNode: ConditionNode,
    randomizerNode: RandomizerNode,
    linkFunnelNode: LinkFunnelNode,
    templateNode: TemplateNode,
    chatwoot_label: ChatwootLabelNode,
    dateNode: LegacyDateNode
};

// --- Editor Logic ---
const FlowEditor = ({ funnelId, isFullScreen, toggleFullScreen, onBack, onSave }) => {
    const { activeClient } = useClient();
    const portalContainer = React.useContext(PortalContext);
    const [nodes, setNodes] = useState([]);
    const [edges, setEdges] = useState([]);
    const [saving, setSaving] = useState(false);
    const [currentFunnelId, setCurrentFunnelId] = useState(funnelId);

    // Funnel Metadata State
    const [funnelName, setFunnelName] = useState('');
    const [triggerPhrase, setTriggerPhrase] = useState('');

    // Context Menu State
    const [menu, setMenu] = useState(null);
    const [nodeToDelete, setNodeToDelete] = useState(null);
    const reactFlowWrapper = useRef(null);
    const { project } = useReactFlow();

    // Connection State
    const connectingNodeId = useRef(null);
    const connectingHandleId = useRef(null);

    // Stable Handlers
    const updateNodeData = useCallback((id, newData) => {
        setNodes((nds) => nds.map((node) => {
            if (node.id === id) {
                return { ...node, data: { ...node.data, ...newData } };
            }
            return node;
        }));
    }, []);

    const handleDeleteRequest = useCallback((id) => {
        setNodeToDelete(id);
    }, []);

    const confirmDelete = useCallback(() => {
        if (!nodeToDelete) return;
        const id = nodeToDelete;
        setNodes((nds) => nds.filter((n) => n.id !== id));
        setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
        setNodeToDelete(null);
        toast.success("Nó removido com sucesso!");
    }, [nodeToDelete]);

    const cancelDelete = useCallback(() => {
        setNodeToDelete(null);
    }, []);

    const setStartNode = useCallback((id, type) => {
        // Validation: Only messageNode, mediaNode, audioNode or templateNode allowed
        if (type !== 'messageNode' && type !== 'mediaNode' && type !== 'audioNode' && type !== 'templateNode') {
            toast.error("Apenas 'Mensagem', 'Mídia', 'Áudio' ou 'Template' podem ser o nó inicial! 🚫");
            return;
        }

        // Update Start Node Flag
        setNodes((nds) => nds.map((node) => ({
            ...node,
            data: {
                ...node.data,
                isStart: node.id === id
            }
        })));

        // Remove ANY existing connections pointing TO this node
        setEdges((eds) => eds.filter(e => e.target !== id));

        toast.success("Nó inicial atualizado! 🏁");
    }, []);

    const onPaneContextMenu = useCallback(
        (event) => {
            event.preventDefault();
            const pane = reactFlowWrapper.current.getBoundingClientRect();

            let top = event.clientY - pane.top;
            let left = event.clientX - pane.left;

            // Constantes para prever espaço do menu (aprox)
            const menuWidth = 220;
            const menuHeight = 350;

            // Ajustar se extrapolar bordas
            if (left + menuWidth > pane.width) left -= menuWidth;
            if (top + menuHeight > pane.height) top -= menuHeight;

            // Garantir que não seja negativo
            left = Math.max(10, left);
            top = Math.max(10, top);

            setMenu({ top, left });
        },
        [setMenu]
    );

    const onPaneClick = useCallback(() => {
        setMenu(null);
        connectingNodeId.current = null;
    }, []);

    const handleAddNode = useCallback((type) => {
        if (!menu) return;

        const position = project({
            x: menu.left,
            y: menu.top,
        });

        const defaultData = {
            onChange: updateNodeData,
            onDelete: setNodeToDelete,
            onSetStart: setStartNode
        };

        // Add type-specific defaults
        if (type === 'delayNode') {
            defaultData.time = 10;
            defaultData.unit = 'seconds';
            defaultData.useRandom = false;
        } else if (type === 'messageNode') {
            defaultData.content = '';
            defaultData.variations = [];
        } else if (type === 'randomizerNode') {
            defaultData.percentA = 50;
        } else if (type === 'conditionNode') {
            defaultData.conditionType = 'text';
        }

        const newNode = {
            id: `node_${Date.now()}`,
            type,
            position,
            data: defaultData
        };

        setNodes((nds) => nds.concat(newNode));

        // If connecting from connection drop
        if (menu.sourceNodeId) {
            setEdges((eds) => addEdge({
                id: `e${menu.sourceNodeId}-${newNode.id}`,
                source: menu.sourceNodeId,
                sourceHandle: menu.sourceHandleId,
                target: newNode.id,
                animated: true
            }, eds));
        }

        setMenu(null);
        connectingNodeId.current = null;
    }, [menu, project, updateNodeData, handleDeleteRequest, setStartNode]);

    // Initial Load & Funnel Resolution
    useEffect(() => {
        if (!activeClient) return;

        const loadFunnel = async () => {
            let targetId = funnelId;

            // 1. Resolve ID if missing
            if (!targetId) {
                try {
                    const listRes = await fetchWithAuth(`${API_URL}/funnels`, {}, activeClient.id);
                    if (listRes.ok) {
                        const funnels = await listRes.json();
                        if (funnels.length > 0) {
                            targetId = funnels[0].id;
                        } else {
                            // Create default funnel if none exists
                            const createRes = await fetchWithAuth(`${API_URL}/funnels`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    name: "Meu Primeiro Funil",
                                    description: "Funil criado automaticamente",
                                    steps: []
                                })
                            }, activeClient.id);
                            if (createRes.ok) {
                                const newFunnel = await createRes.json();
                                targetId = newFunnel.id;
                                toast.success("Novo funil criado!");
                            }
                        }
                    }
                } catch (e) {
                    console.error("Erro ao resolver funil:", e);
                }
            }

            if (!targetId) {
                toast.error("Nenhum funil encontrado ou criado.");
                return;
            }

            setCurrentFunnelId(targetId);

            // 2. Fetch Content
            const res = await fetchWithAuth(`${API_URL}/funnels/${targetId}`, {}, activeClient.id);
            if (res.ok) {
                const data = await res.json();

                // Set Metadata
                setFunnelName(data.name || '');
                setTriggerPhrase(data.trigger_phrase || '');

                if (data.steps && data.steps.nodes && data.steps.nodes.length > 0) {
                    const loadedNodes = data.steps.nodes.map(n => ({
                        ...n,
                        data: {
                            ...n.data,
                            onChange: updateNodeData,
                            onDelete: handleDeleteRequest,
                            onSetStart: setStartNode
                        }
                    }));

                    const hasStart = loadedNodes.some(n => n.data.isStart);
                    if (!hasStart && loadedNodes.length > 0) {
                        loadedNodes[0].data.isStart = true;
                    }

                    setNodes(loadedNodes);
                    setEdges(data.steps.edges || []);
                } else {
                    const startNode = {
                        id: 'start',
                        type: 'messageNode',
                        position: { x: 250, y: 150 },
                        data: {
                            label: 'Início',
                            isStart: true,
                            content: 'Olá! Bem-vindo.',
                            onChange: updateNodeData,
                            onDelete: handleDeleteRequest,
                            onSetStart: setStartNode
                        }
                    };
                    setNodes([startNode]);
                    setEdges([]);
                }
            } else {
                toast.error(`Erro ao carregar funil #${targetId}`);
            }
        };
        loadFunnel();
    }, [funnelId, activeClient, updateNodeData, handleDeleteRequest, setStartNode]);

    const onNodesChange = useCallback((changes) => setNodes((nds) => applyNodeChanges(changes, nds)), []);
    const onEdgesChange = useCallback((changes) => setEdges((eds) => applyEdgeChanges(changes, eds)), []);

    // Connection Handlers
    const onConnect = useCallback((params) => {
        setEdges((eds) => {
            // Regra: Apenas 1 conexão por saída (sourceHandle)
            // Se já existe uma conexão saindo desse ponto, removemos antes de adicionar a nova
            const filteredEdges = eds.filter(e =>
                !(e.source === params.source && e.sourceHandle === params.sourceHandle)
            );
            return addEdge({ ...params, animated: true }, filteredEdges);
        });
    }, []);

    const onConnectStart = useCallback((_, { nodeId, handleId }) => {
        connectingNodeId.current = nodeId;
        connectingHandleId.current = handleId;
    }, []);

    const onConnectEnd = useCallback(
        () => {
            // Reset connection state
            connectingNodeId.current = null;
            connectingHandleId.current = null;
        },
        []
    );

    const handleSave = async () => {
        if (!currentFunnelId) {
            toast.error("Erro: Nenhum funil selecionado para salvar.");
            return;
        }

        if (!funnelName.trim()) {
            toast.error("Por favor, dê um nome para o funil.");
            return;
        }

        setSaving(true);
        try {
            const cleanNodes = nodes.map(n => {
                const { onChange, onDelete, onSetStart, ...restData } = n.data;
                return { ...n, data: restData };
            });

            const stepsPayload = { nodes: cleanNodes, edges };

            // 1. Fetch current funnel data to merge (preserve name, etc)
            const getRes = await fetchWithAuth(`${API_URL}/funnels/${currentFunnelId}`, {}, activeClient.id);

            if (!getRes.ok) {
                if (getRes.status === 404) {
                    throw new Error(`Funil #${currentFunnelId} não encontrado no servidor.`);
                }
                const errText = await getRes.text();
                throw new Error(`Erro ao buscar dados do funil: ${getRes.status} - ${errText}`);
            }

            const currentFunnel = await getRes.json();

            // 2. Prepare Update Payload (Backend expects FunnelCreate schema)
            const updatePayload = {
                name: funnelName, // Use state value
                description: currentFunnel.description,
                trigger_phrase: triggerPhrase, // Use state value
                allowed_phone: currentFunnel.allowed_phone,
                steps: stepsPayload
            };

            // 3. Send PUT Request
            const res = await fetchWithAuth(`${API_URL}/funnels/${currentFunnelId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatePayload)
            }, activeClient.id);

            if (res.ok) {
                toast.success("Fluxo salvo com sucesso! 💾");
                if (onSave) onSave(); // Notify parent
            } else {
                const errJson = await res.json().catch(() => null);
                let errText = 'Erro desconhecido';

                if (errJson) {
                    if (errJson.detail) {
                        errText = typeof errJson.detail === 'string'
                            ? errJson.detail
                            : JSON.stringify(errJson.detail);
                    } else {
                        errText = JSON.stringify(errJson);
                    }
                } else {
                    const text = await res.text();
                    if (text) errText = text;
                }

                console.error("Save Error Response:", errText);
                toast.error(`Erro ao salvar: ${String(errText).substring(0, 100)}...`);
            }
        } catch (e) {
            console.error("HandleSave Exception:", e);
            toast.error(e.message || "Erro de conexão desconhecido");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="flex h-full w-full" ref={reactFlowWrapper}>
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onConnectStart={onConnectStart}
                onConnectEnd={onConnectEnd}
                nodeTypes={nodeTypes}
                onPaneContextMenu={onPaneContextMenu}
                onPaneClick={onPaneClick}
                defaultEdgeOptions={{ animated: true, style: { strokeWidth: 2 } }}
                connectionLineStyle={{ stroke: '#3b82f6', strokeWidth: 3 }}
                proOptions={{ hideAttribution: true }}
                fitView
                fitViewOptions={{ padding: 0.2, includeHiddenNodes: true }}
                minZoom={0.1}
            >
                <Background color="#aaa" gap={20} />
                <Controls fitViewOptions={{ padding: 0.2, includeHiddenNodes: true }} />

                {/* Top Left: Metadata Inputs */}
                <Panel position="top-left" className="flex flex-col gap-2 p-3 bg-white/90 dark:bg-gray-800/90 backdrop-blur rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 w-72">
                    <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">Nome do Funil</label>
                        <input
                            type="text"
                            className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded px-2 py-1 text-sm font-semibold text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none"
                            value={funnelName}
                            onChange={(e) => setFunnelName(e.target.value)}
                            placeholder="Ex: Funil de Boas Vindas"
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 block flex items-center gap-1">
                            Palavra-Chave (Gatilho) <FiFlag size={10} />
                        </label>
                        <input
                            type="text"
                            className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded px-2 py-1 text-sm font-mono text-blue-600 dark:text-blue-400 focus:ring-2 focus:ring-blue-500 outline-none"
                            value={triggerPhrase}
                            onChange={(e) => setTriggerPhrase(e.target.value)}
                            placeholder="Ex: #promo2024"
                        />
                        <span className="text-[9px] text-gray-400 mt-0.5 block">Digite a palavra exata para iniciar este fluxo.</span>
                    </div>
                </Panel>

                <Panel position="top-right" className="flex gap-2">
                    {onBack && !isFullScreen && (
                        <button onClick={onBack} className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-lg shadow border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition font-medium">
                            <FiArrowLeft /> Voltar para Lista
                        </button>
                    )}
                    <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition font-bold">
                        <FiSave /> {saving ? 'Salvando...' : 'Salvar Fluxo'}
                    </button>
                    <button onClick={toggleFullScreen} className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg shadow hover:bg-gray-200 transition">
                        {isFullScreen ? <FiMinimize /> : <FiMaximize />}
                    </button>
                </Panel>

                {menu && <ContextMenu top={menu.top} left={menu.left} onClose={() => setMenu(null)} onAddNode={handleAddNode} />}

                <Panel position="bottom-center" className="bg-white/80 dark:bg-gray-800/80 backdrop-blur px-4 py-2 rounded-full border border-gray-200 dark:border-gray-700 shadow-sm mb-4">
                    <span className="text-xs text-gray-500 dark:text-gray-400 font-medium flex items-center gap-2">
                        <FiPlus /> Clique com o Botão Direito para adicionar novos nós
                    </span>
                </Panel>

                <ConfirmModal
                    isOpen={!!nodeToDelete}
                    onClose={cancelDelete}
                    onConfirm={confirmDelete}
                    title="Excluir Nó"
                    message="Tem certeza que deseja excluir este nó? Esta ação não pode ser desfeita."
                    confirmText="Excluir"
                    cancelText="Cancelar"
                    isDangerous={true}
                    container={portalContainer || document.body}
                />
            </ReactFlow>
        </div>
    );
};

// --- Main Wrapper ---
const VisualFlowBuilder = ({ funnelId, onBack, onSave }) => {
    const validId = funnelId || 1;
    const wrapperRef = useRef(null);
    const [isFullScreen, setIsFullScreen] = useState(false);

    const toggleFullScreen = () => {
        if (!isFullScreen) {
            // Tenta entrar no modo nativo do navegador
            if (wrapperRef.current?.requestFullscreen) {
                wrapperRef.current.requestFullscreen().catch(() => {
                    console.warn("Fullscreen nativo bloqueado, usando apenas CSS.");
                });
            }
            setIsFullScreen(true);
        } else {
            // Sai do modo nativo se estiver nele
            if (document.fullscreenElement) {
                document.exitFullscreen().catch(() => { });
            }
            setIsFullScreen(false);
        }
    };

    useEffect(() => {
        const handleKeyDown = (e) => {
            // ESC agora é inteligente: 
            // 1. Se estiver no upload, o browser já saiu do nativo, mas a interface continua grande.
            // 2. Apertar ESC com a página focada minimiza a interface.
            if (e.key === 'Escape' && isFullScreen) {
                if (document.fullscreenElement) {
                    document.exitFullscreen().catch(() => { });
                }
                setIsFullScreen(false);
            }
        };

        const handleFsChange = () => {
            // Se o usuário entrar via F11 ou atalho do browser, sincronizamos
            if (document.fullscreenElement === wrapperRef.current) {
                setIsFullScreen(true);
            }
            // NOTA: Não setamos false aqui automaticamente para evitar fechar no upload
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
                    />
                </ReactFlowProvider>
            </PortalContext.Provider>
        </div>
    );
};

export default VisualFlowBuilder;
