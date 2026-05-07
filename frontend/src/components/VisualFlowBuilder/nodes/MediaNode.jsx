import React, { useState } from 'react';
import { Handle, Position } from 'reactflow';
import { FiImage, FiUploadCloud, FiClock, FiTrash2 } from 'react-icons/fi';
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

const MediaNode = ({ id, data }) => {
    const { activeClient } = useClient();
    const [uploading, setUploading] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const portalContainer = React.useContext(PortalContext);

    const handleUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const allowedTypes = ['image/png', 'image/jpeg', 'application/pdf', 'video/mp4'];
        if (!allowedTypes.includes(file.type)) {
            toast.error(`Formato "${file.type}" não aceito. Use apenas: PNG, JPG, PDF ou MP4.`);
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
                data.onChange(id, { mediaUrl: result.url, fileName: result.filename, mediaType: file.type.split('/')[0] });
                toast.success("Upload concluído!");
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
                        <img src={resolveUrl(data.mediaUrl)} alt="Preview" className="w-full h-40 object-cover rounded-lg shadow-sm" />
                    ) : data.mediaType === 'video' ? (
                        <video src={resolveUrl(data.mediaUrl)} className="w-full h-40 object-cover rounded-lg shadow-sm" controls />
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
                    <div className="mt-2 relative">
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-[9px] font-bold text-gray-400 uppercase">Legenda (Opcional)</span>
                            <VariableSelector onSelect={(v) => data.onChange(id, { caption: (data.caption || '') + v })} />
                        </div>
                        <input
                            type="text"
                            placeholder="Legenda (opcional)"
                            className="nodrag nopan w-full text-xs p-2 border rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                            value={data.caption || ''}
                            onChange={(e) => data.onChange(id, { caption: e.target.value })}
                        />
                    </div>
                </div>
            ) : (
                <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900 transition group">
                    <FiUploadCloud className={`w-10 h-10 text-gray-400 group-hover:text-pink-500 transition ${uploading ? 'animate-bounce' : ''}`} />
                    <span className="text-sm text-gray-500 mt-2 font-medium group-hover:text-gray-700 dark:group-hover:text-gray-300">{uploading ? 'Enviando...' : 'Clique para Upload'}</span>
                    <span className="text-[10px] text-gray-400">PNG, JPG, PDF, MP4 (Máx 16MB)</span>
                    <input type="file" className="hidden nodrag" onChange={handleUpload} disabled={uploading} accept=".png,.jpg,.jpeg,.pdf,.mp4" />
                </label>
            )}

            <div className="mt-3 pt-2 border-t border-gray-100 dark:border-gray-700 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer select-none group/toggle">
                    <div className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={data.onlyBusinessHours || false}
                            onChange={(e) => data.onChange(id, { onlyBusinessHours: e.target.checked })}
                        />
                        <div className="w-8 h-4 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all dark:border-gray-600 peer-checked:bg-pink-600"></div>
                    </div>
                    <div className="flex items-center gap-1">
                        <FiClock size={10} className="text-pink-500 opacity-70" />
                        <span className="text-[10px] font-bold text-gray-500 uppercase group-hover/toggle:text-pink-600 transition-colors">Apenas Horário Comercial?</span>
                    </div>
                </label>
            </div>

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

export default MediaNode;
