import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { API_URL } from '../../../config';
import { useClient } from '../../../contexts/ClientContext';

// Subcomponentes Modulares
import MediaUploadArea from './MediaHeaderUploader/MediaUploadArea';
import SavedMediasList from './MediaHeaderUploader/SavedMediasList';
import DeleteMediaModal from './MediaHeaderUploader/DeleteMediaModal';

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

  const currentUrl = templateParams?.['HEADER_0'] || '';

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
    setCurrentPage(1);
  };

  const startRename = (e, media) => {
    e.stopPropagation();
    setEditingMediaId(media.id);
    setEditingName(media.filename);
  };

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
        if (currentUrl === mediaToDelete.url) {
          handleRemoveUpload();
        }

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
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${!showPastSelector ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'text-slate-400 hover:text-white'}`}
        >
          Fazer Novo Upload
        </button>
        <button
          type="button"
          onClick={() => {
            setShowPastSelector(true);
            fetchPastMedias(1, pageSize);
          }}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${showPastSelector ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'text-slate-400 hover:text-white'}`}
        >
          Mídias Salvas (S3/MinIO)
        </button>
      </div>

      <div className="space-y-3">
        {showPastSelector ? (
          <SavedMediasList
            pastMedias={pastMedias}
            format={format}
            mediaTypeLabel={mediaTypeLabel}
            mediaIcon={mediaIcon}
            currentUrl={currentUrl}
            editingMediaId={editingMediaId}
            setEditingMediaId={setEditingMediaId}
            editingName={editingName}
            setEditingName={setEditingName}
            startRename={startRename}
            saveRename={saveRename}
            setMediaToDelete={setMediaToDelete}
            setUploadedFile={setUploadedFile}
            handleParamChange={handleParamChange}
            currentPage={currentPage}
            totalPages={totalPages}
            pageSize={pageSize}
            handlePageSizeChange={handlePageSizeChange}
            handlePageChange={handlePageChange}
          />
        ) : (
          <MediaUploadArea
            uploadedFile={uploadedFile}
            format={format}
            mediaTypeLabel={mediaTypeLabel}
            acceptAttr={acceptAttr}
            isUploading={isUploading}
            uploadProgress={uploadProgress}
            handleRemoveUpload={handleRemoveUpload}
            handleFileSelect={handleFileSelect}
          />
        )}
      </div>

      {/* Indicador de status */}
      {isUploading && (
        <div className="flex items-center gap-2 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl animate-pulse">
          <span className="text-amber-400 text-xs">⚙️</span>
          <p className="text-[10px] text-amber-400 font-bold">
            Aguarde... finalizando otimização da mídia no servidor.
          </p>
        </div>
      )}
      {!isUploading && !currentUrl && (
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

      {/* Modal de confirmação de exclusão */}
      <DeleteMediaModal
        mediaToDelete={mediaToDelete}
        onClose={() => setMediaToDelete(null)}
        onConfirm={handleDeleteMedia}
      />
    </div>
  );
};

export default MediaHeaderUploader;
