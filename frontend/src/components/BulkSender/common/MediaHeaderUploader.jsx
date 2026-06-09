import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { API_URL } from '../../../config';
import { useClient } from '../../../contexts/ClientContext';

/**
 * MediaHeaderUploader
 * Permite enviar um arquivo de mídia (vídeo, imagem ou documento) para o Backblaze
 * via endpoint /upload e preenche automaticamente o campo HEADER_0 com a URL pública.
 * Também aceita URL externa via aba "Link".
 */
const MediaHeaderUploader = ({ format, templateParams, handleParamChange }) => {
    const { activeClient } = useClient();
    const [mode, setMode] = useState('upload'); // 'upload' | 'url'
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadedFile, setUploadedFile] = useState(null); // { name, url, type }

    const mediaTypeLabel = format === 'IMAGE' ? 'Imagem' : format === 'VIDEO' ? 'Vídeo' : 'Documento';
    const mediaIcon = format === 'IMAGE' ? '🖼️' : format === 'VIDEO' ? '🎬' : '📄';
    const acceptAttr = format === 'IMAGE'
        ? '.jpg,.jpeg,.png'
        : format === 'VIDEO'
        ? '.mp4'
        : '.pdf';
    const placeholderUrl = format === 'IMAGE'
        ? 'https://exemplo.com/imagem.jpg'
        : format === 'VIDEO'
        ? 'https://exemplo.com/video.mp4'
        : 'https://exemplo.com/documento.pdf';

    const allowedTypes = format === 'IMAGE'
        ? ['image/jpeg', 'image/jpg', 'image/png']
        : format === 'VIDEO'
        ? ['video/mp4']
        : ['application/pdf'];

    const MAX_SIZE = 16 * 1024 * 1024; // 16MB

    const handleFileSelect = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validação de tipo
        if (!allowedTypes.includes(file.type)) {
            toast.error(
                `Formato "${file.type}" não aceito para ${mediaTypeLabel}.\nAceitos: ${acceptAttr}`,
                { duration: 5000, icon: '🚫', style: { borderRadius: '16px', background: '#1e293b', color: '#fff', border: '1px solid rgba(239,68,68,0.3)' } }
            );
            e.target.value = null;
            return;
        }

        // Validação de tamanho
        if (file.size > MAX_SIZE) {
            toast.error(
                `Arquivo muito grande (${(file.size / 1024 / 1024).toFixed(1)}MB).\nO limite do WhatsApp é de 16MB.`,
                { duration: 5000, icon: '⚠️', style: { borderRadius: '16px', background: '#1e293b', color: '#fff', border: '1px solid rgba(234,179,8,0.3)' } }
            );
            e.target.value = null;
            return;
        }

        const formData = new FormData();
        formData.append('file', file);
        setIsUploading(true);
        setUploadProgress(0);

        try {
            const token = localStorage.getItem('token');

            await new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                xhr.open('POST', `${API_URL}/upload`);
                xhr.setRequestHeader('Authorization', `Bearer ${token}`);
                if (activeClient?.id) {
                    xhr.setRequestHeader('X-Client-ID', activeClient.id.toString());
                }

                xhr.upload.onprogress = (event) => {
                    if (event.lengthComputable) {
                        setUploadProgress(Math.round((event.loaded / event.total) * 100));
                    }
                };

                xhr.onload = () => {
                    if (xhr.status === 200) {
                        const result = JSON.parse(xhr.responseText);
                        setUploadedFile({ name: file.name, url: result.url, type: format });
                        handleParamChange('HEADER_0', result.url);
                        toast.success(
                            `${mediaTypeLabel} enviada com sucesso! ✅`,
                            { style: { borderRadius: '16px', background: '#1e293b', color: '#fff', border: '1px solid rgba(34,197,94,0.3)' } }
                        );
                        resolve();
                    } else {
                        try {
                            const err = JSON.parse(xhr.responseText);
                            reject(new Error(err.detail || `Erro ${xhr.status}`));
                        } catch {
                            reject(new Error(`Erro ${xhr.status}`));
                        }
                    }
                };

                xhr.onerror = () => reject(new Error('Erro de conexão ao enviar arquivo'));
                xhr.send(formData);
            });
        } catch (error) {
            toast.error(
                error.message || 'Falha ao enviar arquivo. Tente novamente.',
                { duration: 5000, icon: '❌', style: { borderRadius: '16px', background: '#1e293b', color: '#fff', border: '1px solid rgba(239,68,68,0.3)' } }
            );
        } finally {
            setIsUploading(false);
            e.target.value = null;
        }
    };

    const handleRemoveUpload = () => {
        setUploadedFile(null);
        setUploadProgress(0);
        handleParamChange('HEADER_0', '');
    };

    const currentUrl = templateParams['HEADER_0'] || '';

    return (
        <div
            id="media-header-uploader"
            className="p-6 bg-amber-500/5 border border-amber-500/20 rounded-3xl space-y-4"
        >
            {/* Título */}
            <div className="flex items-center gap-3">
                <span className="text-2xl">{mediaIcon}</span>
                <div>
                    <h4 className="text-xs font-black text-amber-400 uppercase tracking-widest">
                        {mediaTypeLabel} do Cabeçalho — Obrigatório
                    </h4>
                    <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                        Faça upload do arquivo ou cole um link público
                    </p>
                </div>
            </div>

            {/* Seletor de modo */}
            <div className="flex gap-2 p-1 bg-black/30 rounded-2xl">
                <button
                    id="media-tab-upload"
                    type="button"
                    onClick={() => setMode('upload')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                        mode === 'upload'
                            ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
                            : 'text-slate-400 hover:text-white'
                    }`}
                >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    Upload do PC
                </button>
                <button
                    id="media-tab-url"
                    type="button"
                    onClick={() => setMode('url')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                        mode === 'url'
                            ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
                            : 'text-slate-400 hover:text-white'
                    }`}
                >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                    </svg>
                    Link Externo
                </button>
            </div>

            {/* Conteúdo das abas */}
            {mode === 'upload' ? (
                <div className="space-y-3">
                    {uploadedFile ? (
                        /* Preview do arquivo enviado */
                        <div className="flex items-center gap-4 p-4 bg-green-500/10 border border-green-500/20 rounded-2xl">
                            <div className="text-3xl flex-shrink-0">
                                {uploadedFile.type === 'IMAGE' ? '🖼️' : uploadedFile.type === 'VIDEO' ? '🎬' : '📄'}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-black text-green-400 truncate">{uploadedFile.name}</p>
                                <p className="text-[10px] text-slate-500 font-mono truncate mt-0.5">{uploadedFile.url}</p>
                            </div>
                            <button
                                id="media-remove-upload"
                                type="button"
                                onClick={handleRemoveUpload}
                                className="flex-shrink-0 p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-all"
                                title="Remover arquivo"
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                    <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                                </svg>
                            </button>
                        </div>
                    ) : isUploading ? (
                        /* Barra de progresso */
                        <div className="p-4 space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest">
                                    Enviando para Backblaze...
                                </span>
                                <span className="text-[10px] font-black text-white">{uploadProgress}%</span>
                            </div>
                            <div className="h-2 bg-black/40 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full transition-all duration-300"
                                    style={{ width: `${uploadProgress}%` }}
                                />
                            </div>
                        </div>
                    ) : (
                        /* Área de upload */
                        <label
                            id="media-upload-area"
                            className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-amber-500/30 hover:border-amber-500/60 rounded-2xl cursor-pointer hover:bg-amber-500/5 transition-all group"
                        >
                            <div className="w-14 h-14 bg-amber-500/10 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-amber-400">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                                </svg>
                            </div>
                            <p className="text-sm font-black text-white group-hover:text-amber-400 transition-colors">
                                Clique para selecionar {mediaTypeLabel}
                            </p>
                            <p className="text-[10px] text-slate-500 font-bold mt-1 uppercase tracking-wider">
                                {acceptAttr.replace(/\./g, '').toUpperCase().replace(/,/g, ', ')} — Máx. 16MB
                            </p>
                            <input
                                type="file"
                                className="hidden"
                                accept={acceptAttr}
                                onChange={handleFileSelect}
                                disabled={isUploading}
                                data-testid="media-file-input"
                            />
                        </label>
                    )}
                </div>
            ) : (
                /* Aba URL externa */
                <div className="space-y-2">
                    <input
                        id="media-url-input"
                        type="url"
                        className="w-full p-4 bg-black/40 border border-amber-500/30 rounded-2xl focus:border-amber-400/60 outline-none text-white text-xs font-bold transition-all shadow-inner placeholder:text-slate-700"
                        placeholder={placeholderUrl}
                        value={currentUrl}
                        onChange={(e) => handleParamChange('HEADER_0', e.target.value)}
                    />
                    <p className="text-[10px] text-slate-500 font-medium flex items-center gap-1.5">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-amber-500/60">
                            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                        </svg>
                        O link deve ser público e acessível pela internet. Links do Google Drive ou Dropbox não são aceitos.
                    </p>
                </div>
            )}

            {/* Indicador de status */}
            {!currentUrl && (
                <div className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-xl">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-red-400 flex-shrink-0">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                    </svg>
                    <p className="text-[10px] text-red-400 font-bold">
                        {mediaTypeLabel} pendente — necessário para avançar
                    </p>
                </div>
            )}
            {currentUrl && (
                <div className="flex items-center gap-2 px-3 py-2 bg-green-500/10 border border-green-500/20 rounded-xl">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-green-400 flex-shrink-0">
                        <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    <p className="text-[10px] text-green-400 font-bold">
                        {mediaTypeLabel} configurada — pronto para avançar!
                    </p>
                </div>
            )}
        </div>
    );
};

export default MediaHeaderUploader;
