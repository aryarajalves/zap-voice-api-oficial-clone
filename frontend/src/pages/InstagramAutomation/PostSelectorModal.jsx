import React, { useState } from 'react';
import { FiX, FiSearch, FiCalendar, FiFileText, FiChevronLeft, FiChevronRight } from 'react-icons/fi';

export default function PostSelectorModal({
  isOpen,
  onClose,
  posts,
  selectedIds,
  onSelect,
  loading,
  error
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [mediaFilter, setMediaFilter] = useState('ALL'); // ALL, IMAGE, VIDEO, CAROUSEL_ALBUM
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  if (!isOpen) return null;

  // Filter posts by caption and media type
  const filteredPosts = posts.filter(post => {
    const matchesSearch = (post.caption || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    if (mediaFilter === 'ALL') return matchesSearch;
    if (mediaFilter === 'IMAGE') return matchesSearch && post.media_type === 'IMAGE';
    if (mediaFilter === 'VIDEO') return matchesSearch && post.media_type === 'VIDEO';
    if (mediaFilter === 'CAROUSEL_ALBUM') return matchesSearch && post.media_type === 'CAROUSEL_ALBUM';
    return matchesSearch;
  });

  // Pagination calculations
  const totalItems = filteredPosts.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  
  // Adjust current page if it exceeds bounds after filtering
  const activePage = Math.min(currentPage, totalPages);
  
  const startIndex = (activePage - 1) * pageSize;
  const paginatedPosts = filteredPosts.slice(startIndex, startIndex + pageSize);

  const handleTogglePost = (postId) => {
    // If "all" was selected, clear it when selecting a specific post
    let newSelection = selectedIds.includes('all') ? [] : [...selectedIds];
    
    if (newSelection.includes(postId)) {
      newSelection = newSelection.filter(id => id !== postId);
    } else {
      newSelection.push(postId);
    }

    // If everything is deselected, fallback to 'all'
    if (newSelection.length === 0) {
      newSelection = ['all'];
    }
    
    onSelect(newSelection);
  };

  const handleToggleSelectAll = () => {
    const isAllSelected = selectedIds.includes('all');
    if (isAllSelected) {
      // Se estava selecionado Qualquer Post (Todos), desmarca tudo.
      // Esvazia a seleção, o que fará com que o usuário precise selecionar posts específicos.
      // Para manter a segurança da automação, se desmarcar tudo, criamos uma lista vazia ou mantemos vazia.
      onSelect([]);
    } else {
      // Se não estava selecionado, marca Qualquer Post (Todos)
      onSelect(['all']);
    }
  };

  const isAllSelected = selectedIds.includes('all');

  const formatDate = (isoString) => {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return '';
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal Container */}
      <div className="relative w-full max-w-4xl h-[85vh] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-100 dark:border-gray-800 m-4 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/50">
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Selecionar Posts do Instagram</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Escolha para quais posts esta automação ficará ativa</p>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex flex-col md:flex-row gap-3 items-center bg-white dark:bg-gray-900">
          {/* Search bar */}
          <div className="relative flex-1 w-full">
            <FiSearch className="absolute left-3.5 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar pela legenda do post..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 border border-transparent focus:border-pink-500 outline-none text-sm font-semibold transition-all text-gray-950 dark:text-white"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* Media Type Filter Dropdown */}
            <select
              value={mediaFilter}
              onChange={(e) => {
                setMediaFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 border border-transparent focus:border-pink-500 outline-none text-xs font-bold transition-all text-gray-950 dark:text-white cursor-pointer"
            >
              <option value="ALL">Mídia: Todas</option>
              <option value="IMAGE">Fotos</option>
              <option value="VIDEO">Vídeos / Reels</option>
              <option value="CAROUSEL_ALBUM">Carrosséis</option>
            </select>

            {/* Page Size Dropdown */}
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-3 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 border border-transparent focus:border-pink-500 outline-none text-xs font-bold transition-all text-gray-950 dark:text-white cursor-pointer"
            >
              <option value={20}>20 por página</option>
              <option value={50}>50 por página</option>
              <option value={100}>100 por página</option>
              <option value={500}>500 por página</option>
            </select>

            {/* Quick Option */}
            <button
              type="button"
              onClick={handleToggleSelectAll}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                isAllSelected 
                  ? 'bg-pink-500 hover:bg-pink-600 border-pink-500 text-white shadow-lg shadow-pink-500/20' 
                  : 'bg-transparent border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              {isAllSelected ? 'Desmarcar Qualquer Post' : 'Qualquer Post (Todos)'}
            </button>
          </div>
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-gray-50/30 dark:bg-gray-950/20">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center space-y-3">
              <div className="w-8 h-8 border-4 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Carregando posts da sua conta...</p>
            </div>
          ) : error ? (
            <div className="h-full flex flex-col items-center justify-center p-6 text-center">
              <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-500 rounded-full mb-3">
                <FiX className="w-8 h-8" />
              </div>
              <h4 className="text-base font-bold text-gray-900 dark:text-white">Erro ao carregar posts</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mt-1">{error}</p>
            </div>
          ) : paginatedPosts.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-6 text-center">
              <div className="p-3 bg-gray-100 dark:bg-gray-800 text-gray-400 rounded-full mb-3">
                <FiFileText className="w-8 h-8" />
              </div>
              <h4 className="text-base font-bold text-gray-950 dark:text-white">Nenhum post encontrado</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mt-1">
                Tente buscar por outras palavras-chave ou alterar o filtro de mídia.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {paginatedPosts.map(post => {
                const isSelected = selectedIds.includes(post.id) && !isAllSelected;
                return (
                  <div
                    key={post.id}
                    onClick={() => handleTogglePost(post.id)}
                    className={`group relative rounded-xl border overflow-hidden cursor-pointer bg-white dark:bg-gray-800 transition-all flex flex-col ${
                      isSelected
                        ? 'border-pink-500 ring-2 ring-pink-500/20 shadow-lg'
                        : isAllSelected
                        ? 'border-gray-200 dark:border-gray-850 opacity-60 hover:opacity-100'
                        : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 shadow-sm'
                    }`}
                  >
                    {/* Media container */}
                    <div className="relative aspect-video w-full bg-gray-100 dark:bg-gray-900 overflow-hidden flex items-center justify-center">
                      {post.media_url ? (
                        post.media_type === 'VIDEO' ? (
                          <video 
                            src={post.media_url} 
                            className="w-full h-full object-cover"
                            muted
                            playsInline
                            disabled
                          />
                        ) : (
                          <img 
                            src={post.media_url} 
                            alt={post.caption || 'Instagram Post'} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                          />
                        )
                      ) : (
                        <div className="text-gray-400 flex flex-col items-center">
                          <FiFileText className="w-8 h-8" />
                        </div>
                      )}
                      
                      {/* Media type badge */}
                      <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-black/60 text-[9px] font-black text-white uppercase tracking-wider">
                        {post.media_type || 'POST'}
                      </span>

                      {/* Selection overlay */}
                      <div className="absolute top-2 right-2">
                        <input
                          type="checkbox"
                          checked={isSelected || isAllSelected}
                          readOnly
                          className="w-4.5 h-4.5 rounded border-gray-300 text-pink-600 focus:ring-pink-500 cursor-pointer"
                        />
                      </div>
                    </div>

                    {/* Metadata & Caption */}
                    <div className="p-3 flex-1 flex flex-col justify-between space-y-2">
                      <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 line-clamp-3 leading-relaxed flex-1">
                        {post.caption || <span className="italic text-gray-400">Sem legenda</span>}
                      </p>
                      
                      <div className="flex items-center justify-between pt-2 border-t border-gray-50 dark:border-gray-700/50 text-[10px] text-gray-400">
                        <div className="flex items-center gap-1">
                          <FiCalendar className="w-3 h-3" />
                          <span>{formatDate(post.timestamp)}</span>
                        </div>
                        <span className="font-mono text-[9px] truncate max-w-[80px]">ID: {post.id}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row gap-4 justify-between items-center bg-gray-50/50 dark:bg-gray-900/50">
          
          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={activePage === 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                className="p-1.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 disabled:opacity-40 transition-all hover:bg-gray-250 dark:hover:bg-gray-700"
              >
                <FiChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                Página {activePage} de {totalPages} ({totalItems} itens)
              </span>
              <button
                type="button"
                disabled={activePage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                className="p-1.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 disabled:opacity-40 transition-all hover:bg-gray-250 dark:hover:bg-gray-700"
              >
                <FiChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="flex items-center justify-between w-full sm:w-auto gap-4">
            <span className="text-xs text-gray-500 dark:text-gray-400 font-semibold">
              {isAllSelected 
                ? 'Qualquer post está selecionado' 
                : `${selectedIds.filter(id => id !== 'all').length} post(s) selecionado(s)`}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 bg-gray-950 dark:bg-white text-white dark:text-gray-950 hover:bg-gray-850 dark:hover:bg-gray-100 font-bold rounded-xl text-xs transition-all shadow-md"
            >
              Confirmar e Fechar
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
