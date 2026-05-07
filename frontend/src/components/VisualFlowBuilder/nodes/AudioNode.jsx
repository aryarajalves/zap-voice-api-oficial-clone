import React, { useState } from 'react';
import { Handle, Position } from 'reactflow';
import { FiMic, FiUploadCloud, FiClock, FiTrash2 } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { useClient } from '../../../contexts/ClientContext';
import { API_URL } from '../../../config';
import NodeHeader from '../components/NodeHeader';
import VariableSelector from '../components/VariableSelector';
import ConfirmModal from '../../ConfirmModal';
import { PortalContext } from '../index';

const resolveUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    const baseUrl = API_URL.replace(/\/api\/*$/, '');
    return `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
};

const AudioNode = ({ id, data }) => {
    const { activeClient } = useClient();
    const [uploading, setUploading] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const portalContainer = React.useContext(PortalContext);

    const handleUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const allowedTypes = ['audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/mp4', 'audio/aac'];
        if (!allowedTypes.includes(file.type)) {
            toast.error(`Formato "${file.type}" não aceito. Use apenas: MP3, OGG, WAV ou AAC.`);
            return;
        }

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
                        <audio src={resolveUrl(data.mediaUrl)} controls className="w-full h-8" style={{ minWidth: '200px' }} />
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
                        <div className="flex flex-col gap-2">
                            <label className="flex items-center gap-2 cursor-pointer select-none group/toggle">
                                <div className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="sr-only peer"
                                        checked={data.sendPrivateNote || false}
                                        onChange={(e) => data.onChange(id, { ...data, sendPrivateNote: e.target.checked })}
                                    />
                                    <div className="w-8 h-4 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all dark:border-gray-600 peer-checked:bg-cyan-600"></div>
                                </div>
                                <span className="text-[10px] font-bold text-gray-500 uppercase group-hover/toggle:text-cyan-600 transition-colors">Enviar Nota Privada?</span>
                            </label>

                            <label className="flex items-center gap-2 cursor-pointer select-none group/toggle">
                                <div className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="sr-only peer"
                                        checked={data.onlyBusinessHours || false}
                                        onChange={(e) => data.onChange(id, { onlyBusinessHours: e.target.checked })}
                                    />
                                    <div className="w-8 h-4 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all dark:border-gray-600 peer-checked:bg-cyan-600"></div>
                                </div>
                                <div className="flex items-center gap-1">
                                    <FiClock size={10} className="text-cyan-500 opacity-70" />
                                    <span className="text-[10px] font-bold text-gray-500 uppercase group-hover/toggle:text-cyan-600 transition-colors">Apenas Horário Comercial?</span>
                                </div>
                            </label>
                        </div>

                        {data.sendPrivateNote && (
                            <div className="mt-1">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-[9px] font-bold text-gray-400 uppercase">Nota Privada</span>
                                    <VariableSelector onSelect={(v) => data.onChange(id, { ...data, privateNoteContent: (data.privateNoteContent || '') + v })} />
                                </div>
                                <textarea
                                    className="w-full text-xs p-2 rounded border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-cyan-500 resize-none nodrag"
                                    rows={3}
                                    placeholder="Conteúdo da nota privada..."
                                    value={data.privateNoteContent || ''}
                                    onChange={(e) => data.onChange(id, { ...data, privateNoteContent: e.target.value })}
                                />
                            </div>
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

export default AudioNode;
