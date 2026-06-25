import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'react-hot-toast';
import { API_URL } from '../../../config';
import { useClient } from '../../../contexts/ClientContext';

/**
 * MediaHeaderUploader
 * Permite enviar um arquivo de mídia (vídeo, imagem ou documento) para o MinIO
 * via endpoint /upload e preenche automaticamente o campo HEADER_0 com a URL pública.
 * Também permite gerenciar, visualizar, renomear e deletar arquivos salvos.
 */
const MediaHeaderUploader = ({ format, templateParams, handleParamChange }) => {
    const { activeClient } = useClient();
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadedFile, setUploadedFile] = useState(null); // { name, url, type }
    
    // Estados das mídias salvas
    const [pastMedias, setPastMedias] = useState([]);
    const [totalItems, setTotalItems] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [totalPages, setTotalPages] = useState(1);
    
    const [showPastSelector, setShowPastSelector] = useState(false);
    
    // Estados para renomear
    const [editingMediaId, setEditingMediaId] = useState(null);
    const [editingName, setEditingName] = useState('');

    // Estado para popup de exclusão
    const [mediaToDelete, setMediaToDelete] = useState(null);

    useEffect(() => {
        const url = templateParams?.['HEADER_0'] || '';
        if (url) {
            if (!uploadedFile || uploadedFile.url !== url) {
                const parts = url.split('/');
                const name = parts[parts.length - 1] || 'arquivo-mapeado';
                setUploadedFile({ name, url, type: format });
            }
        } else {
            setUploadedFile(null);
        }
    }, [templateParams?.['HEADER_0'], format]);

    useEffect(() => {
        setShowPastSelector(false);
        setPastMedias([]);
        setCurrentPage(1);
    }, [format]);

    const fetchPastMedias = async (page = currentPage, size = pageSize) => {
        try {
            const token = localStorage.getItem('token');
            const headers = {
                'Authorization': `Bearer ${token}`
            };
            if (activeClient?.id) {
                headers['X-Client-ID'] = activeClient.id.toString();
            }
            const res = await fetch(`${API_URL}/uploads/list?media_type=${format}&page=${page}&limit=${size}`, { headers });
            if (res.ok) {
                const data = await res.json();
                setPastMedias(data.items || []);
                setTotalItems(data.total || 0);
                setTotalPages(data.pages || 1);
            } else {
                toast.error('Erro ao carregar mídias anteriores');
            }
        } catch (error) {
            console.error('Erro ao buscar mídias:', error);
        }
    };

    // Recarregar mídias quando a página ou o tamanho mudar
    useEffect(() => {
        if (showPastSelector) {
            fetchPastMedias(currentPage, pageSize);
        }
    }, [currentPage, pageSize, showPastSelector]);

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage);
        }
    };

    const handlePageSizeChange = (e) => {
        const newSize = parseInt(e.target.value, 10);
        setPageSize(newSize);
        setCurrentPage(1); // Resetar para a primeira página
    };

    // Iniciar fluxo para renomear
    const startRename = (e, media) => {
        e.stopPropagation();
        setEditingMediaId(media.id);
        setEditingName(media.filename);
    };

    // Salvar renomeação
    const saveRename = async (e, mediaId) => {
        e.stopPropagation();
        if (!editingName.trim()) {
            toast.error('O nome do arquivo não pode ser vazio');
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const headers = {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            };
            if (activeClient?.id) {
                headers['X-Client-ID'] = activeClient.id.toString();
            }

            const res = await fetch(`${API_URL}/uploads/${mediaId}/rename`, {
                method: 'PATCH',
                headers,
                body: JSON.stringify({ filename: editingName.trim() })
            });

            if (res.ok) {
                toast.success('Mídia renomeada com sucesso!');
                setEditingMediaId(null);
                fetchPastMedias(currentPage, pageSize);
            } else {
                toast.error('Erro ao renomear arquivo');
            }
        } catch (err) {
            console.error('Erro ao salvar nome:', err);
            toast.error('Falha de comunicação com o servidor');
        }
    };

    // Excluir mídia
    const handleDeleteMedia = async () => {
        if (!mediaToDelete) return;
        try {
            const token = localStorage.getItem('token');
            const headers = {
                'Authorization': `Bearer ${token}`
            };
            if (activeClient?.id) {
                headers['X-Client-ID'] = activeClient.id.toString();
            }

            const res = await fetch(`${API_URL}/uploads/${mediaToDelete.id}`, {
                method: 'DELETE',
                headers
            });

            if (res.ok) {
                toast.success('Mídia excluída com sucesso! 🗑️');
                
                // Se a mídia excluída for a configurada atualmente, removemos ela do template
                if (currentUrl === mediaToDelete.url) {
                    handleRemoveUpload();
                }

                // Ajustar página se necessário
                const updatedItemsCount = totalItems - 1;
                const maxPagesPossible = Math.max(1, Math.ceil(updatedItemsCount / pageSize));
                const targetPage = currentPage > maxPagesPossible ? maxPagesPossible : currentPage;
                setCurrentPage(targetPage);
                
                setMediaToDelete(null);
                fetchPastMedias(targetPage, pageSize);
            } else {
                toast.error('Erro ao excluir mídia do servidor');
            }
        } catch (err) {
            console.error('Erro ao deletar mídia:', err);
            toast.error('Falha de conexão com o servidor');
        }
    };

    const mediaTypeLabel = format === 'IMAGE' ? 'Imagem' : format === 'VIDEO' ? 'Vídeo' : 'Documento';
    const mediaIcon = format === 'IMAGE' ? '🖼️' : format === 'VIDEO' ? '🎬' : '📄';
    const acceptAttr = format === 'IMAGE'
        ? '.jpg,.jpeg,.png'
        : format === 'VIDEO'
        ? '.mp4'
        : '.pdf';

    const allowedTypes = format === 'IMAGE'
        ? ['image/jpeg', 'image/jpg', 'image/png']
        : format === 'VIDEO'
        ? ['video/mp4']
        : ['application/pdf'];

    const MAX_SIZE = 16 * 1024 * 1024; // 16MB

    const handleFileSelect = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!allowedTypes.includes(file.type)) {
            toast.error(
                `Formato "${file.type}" não aceito para ${mediaTypeLabel}.\nAceitos: ${acceptAttr}`,
                { duration: 5000, icon: '🚫', style: { borderRadius: '16px', background: '#1e293b', color: '#fff', border: '1px solid rgba(239,68,68,0.3)' } }
            );
            e.target.value = null;
            return;
        }

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
            className="p-6 bg-amber-500/5 border border-amber-500/20 rounded-3xl space-y-4 relative"
        >
            {/* Título */}
            <div className="flex items-center gap-3">
                <span className="text-2xl">{mediaIcon}</span>
                <div>
                    <h4 className="text-xs font-black text-amber-400 uppercase tracking-widest">
                        {mediaTypeLabel} do Cabeçalho — Obrigatório
                    </h4>
                    <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                        Selecione um arquivo já enviado ou faça um novo upload
                    </p>
                </div>
            </div>

            {/* Alternador de Modos */}
            <div className="flex gap-2 border-b border-slate-700/50 pb-3">
                <button
                    type="button"
                    onClick={() => setShowPastSelector(false)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${!showPastSelector ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'text-slate-400 hover:text-white'}`}
                >
                    Fazer Novo Upload
                </button>
                <button
                    type="button"
                    onClick={() => {
                        setShowPastSelector(true);
                        fetchPastMedias(1, pageSize);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${showPastSelector ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'text-slate-400 hover:text-white'}`}
                >
                    Mídias Salvas (S3/MinIO)
                </button>
            </div>

            <div className="space-y-3">
                {showPastSelector ? (
                    /* Lista de mídias enviadas anteriormente */
                    <div className="space-y-2">
                        {pastMedias.length === 0 ? (
                            <p className="text-xs text-slate-500 text-center py-6 font-medium">
                                Nenhuma {mediaTypeLabel.toLowerCase()} salva encontrada para este cliente.
                            </p>
                        ) : (
                            <>
                                <div className="max-h-80 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                                    {pastMedias.map((media) => (
                                        <div
                                            key={media.id}
                                            onClick={() => {
                                                if (editingMediaId === media.id) return; // Evitar clique ao renomear
                                                setUploadedFile({ name: media.filename, url: media.url, type: format });
                                                handleParamChange('HEADER_0', media.url);
                                                toast.success('Mídia selecionada! 🎯', {
                                                    style: { borderRadius: '16px', background: '#1e293b', color: '#fff', border: '1px solid rgba(34,197,94,0.3)' }
                                                });
                                            }}
                                            className={`flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer ${
                                                currentUrl === media.url
                                                    ? 'bg-amber-500/10 border-amber-500/40 text-amber-400'
                                                    : 'bg-black/30 border-slate-700/50 text-slate-300 hover:border-slate-600'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3 min-w-0 flex-1">
                                                {/* Mini thumbnail / preview para vídeos */}
                                                {format === 'VIDEO' ? (
                                                    <video
                                                        src={media.url}
                                                        className="w-16 h-12 rounded-lg object-cover bg-black/50 border border-slate-700/50 flex-shrink-0"
                                                        muted
                                                        playsInline
                                                        preload="metadata"
                                                    />
                                                ) : (
                                                    <span className="text-xl flex-shrink-0">{mediaIcon}</span>
                                                )}
                                                
                                                <div className="min-w-0 flex-1">
                                                    {editingMediaId === media.id ? (
                                                        <div className="flex items-center gap-1.5 mt-0.5" onClick={(e) => e.stopPropagation()}>
                                                            <input
                                                                type="text"
                                                                className="px-2 py-1 bg-black/40 text-xs text-white border border-amber-500/50 rounded-lg outline-none w-full"
                                                                value={editingName}
                                                                onChange={(e) => setEditingName(e.target.value)}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter') saveRename(e, media.id);
                                                                    if (e.key === 'Escape') setEditingMediaId(null);
                                                                }}
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={(e) => saveRename(e, media.id)}
                                                                className="p-1 text-green-400 bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 rounded-md transition-all text-[10px]"
                                                                title="Salvar nome"
                                                            >
                                                                💾
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setEditingMediaId(null);
                                                                }}
                                                                className="p-1 text-slate-400 bg-slate-500/10 hover:bg-slate-500/20 border border-slate-500/20 rounded-md transition-all text-[10px]"
                                                                title="Cancelar"
                                                            >
                                                                ❌
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <div className="flex items-center gap-1.5">
                                                                <p className="text-xs font-black truncate">{media.filename}</p>
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => startRename(e, media)}
                                                                    className="opacity-40 hover:opacity-100 p-0.5 text-slate-400 hover:text-white transition-opacity"
                                                                    title="Renomear mídia"
                                                                >
                                                                    ✏️
                                                                </button>
                                                            </div>
                                                            <p className="text-[9px] text-slate-500 font-mono truncate mt-0.5">{media.url}</p>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                            
                                            <div className="flex items-center gap-3 ml-2 flex-shrink-0">
                                                <div className="text-[10px] text-slate-500 font-bold">
                                                    {(media.size / 1024 / 1024).toFixed(2)} MB
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setMediaToDelete(media);
                                                    }}
                                                    className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-all"
                                                    title="Deletar mídia"
                                                >
                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                                        <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Controles de Paginação */}
                                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-700/50 text-[11px] text-slate-400 font-medium">
                                    <div className="flex items-center gap-2">
                                        <span>Mostrar:</span>
                                        <select
                                            className="bg-black/40 border border-slate-700/80 rounded-lg px-2 py-1 text-white text-xs outline-none focus:border-amber-500/40"
                                            value={pageSize}
                                            onChange={handlePageSizeChange}
                                        >
                                            <option value="10">10 itens</option>
                                            <option value="20">20 itens</option>
                                            <option value="50">50 itens</option>
                                            <option value="100">100 itens</option>
                                        </select>
                                    </div>

                                    <div className="flex items-center gap-1">
                                        <button
                                            type="button"
                                            onClick={() => handlePageChange(currentPage - 1)}
                                            disabled={currentPage === 1}
                                            className="px-2 py-1 bg-black/30 border border-slate-700/60 rounded-lg text-white hover:bg-black/60 disabled:opacity-30 disabled:hover:bg-black/30 font-bold transition-all"
                                        >
                                            ◀
                                        </button>
                                        <span className="px-2">Pág. {currentPage} de {totalPages}</span>
                                        <button
                                            type="button"
                                            onClick={() => handlePageChange(currentPage + 1)}
                                            disabled={currentPage === totalPages}
                                            className="px-2 py-1 bg-black/30 border border-slate-700/60 rounded-lg text-white hover:bg-black/60 disabled:opacity-30 disabled:hover:bg-black/30 font-bold transition-all"
                                        >
                                            ▶
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                ) : uploadedFile ? (
                    /* Preview do arquivo enviado */
                    <div className="flex items-center gap-4 p-4 bg-green-500/10 border border-green-500/20 rounded-2xl">
                        {format === 'VIDEO' ? (
                            <video
                                src={uploadedFile.url}
                                className="w-16 h-12 rounded-lg object-cover bg-black/50 border border-green-500/20 flex-shrink-0"
                                muted
                                playsInline
                                preload="metadata"
                            />
                        ) : (
                            <div className="text-3xl flex-shrink-0">
                                {uploadedFile.type === 'IMAGE' ? '🖼️' : uploadedFile.type === 'VIDEO' ? '🎬' : '📄'}
                            </div>
                        )}
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
                                Enviando...
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

            {/* Popup/Modal de confirmação de exclusão centralizado (conforme as regras) */}
            {mediaToDelete && createPortal(
                <div className="fixed inset-0 top-0 left-0 w-screen h-screen z-[99999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div 
                        className="w-full max-w-md bg-slate-900 border border-red-500/20 rounded-3xl p-6 shadow-2xl relative space-y-4"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="text-center space-y-2">
                            <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center mx-auto text-xl">
                                ⚠️
                            </div>
                            <h3 className="text-md font-black text-white uppercase tracking-wider">
                                Confirmar Exclusão de Mídia
                            </h3>
                            <p className="text-xs text-slate-400 font-medium leading-relaxed">
                                Você tem certeza que deseja excluir permanentemente o arquivo <span className="text-red-400 font-bold font-mono">"{mediaToDelete.filename}"</span>?
                            </p>
                            <p className="text-[10px] text-slate-500">
                                Esta ação não pode ser desfeita e removerá a mídia fisicamente do S3/MinIO.
                            </p>
                        </div>

                        {/* Botões do Popup - 1 de ação e 1 de fechar/cancelar */}
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => setMediaToDelete(null)}
                                className="flex-1 px-4 py-2.5 bg-slate-800 text-slate-300 font-bold rounded-xl text-xs hover:bg-slate-700 transition-all border border-slate-700/50"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={handleDeleteMedia}
                                className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl text-xs transition-all shadow-lg shadow-red-500/10"
                            >
                                Excluir Permanentemente
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default MediaHeaderUploader;
