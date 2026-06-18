import React, { useEffect, useState } from 'react';
import { FiClock, FiFileText, FiCheckCircle, FiAlertTriangle, FiLoader, FiEdit2, FiCheck, FiX, FiRefreshCw, FiTrash2, FiTrash } from 'react-icons/fi';
import { useClient } from '../../contexts/ClientContext';
import { API_URL } from '../../config';
import { fetchWithAuth } from '../../AuthContext';
import { toast } from 'react-hot-toast';
import { parseDateSafe } from './utils/importHistoryUtils';

export default function ImportHistoryPage() {
  const { activeClient } = useClient();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [renaming, setRenaming] = useState(false);

  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);

  // States para deleção e seleção
  const [selectedIds, setSelectedIds] = useState([]);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, type: null, targetId: null });
  const [deleting, setDeleting] = useState(false);

  const fetchHistory = async (showLoading = false) => {
    if (!activeClient?.id) return;
    if (showLoading) setLoading(true);
    try {
      const currentLimit = limit === 'all' ? 999999 : limit;
      const skipValue = limit === 'all' ? 0 : page * limit;

      const response = await fetchWithAuth(
        `${API_URL}/leads/import/history?skip=${skipValue}&limit=${currentLimit}`,
        {},
        activeClient.id
      );
      if (response && response.ok) {
        const data = await response.json();
        if (data && typeof data === 'object' && 'items' in data) {
          setHistory(data.items);
          setTotal(data.total);
        } else if (Array.isArray(data)) {
          setHistory(data);
          setTotal(data.length);
        }
      }
    } catch (err) {
      console.error("Erro ao carregar histórico:", err);
      toast.error("Erro ao carregar histórico de importação.");
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory(true);
    setSelectedIds([]);
  }, [activeClient, page, limit]);

  // Polling a cada 4 segundos se houver alguma importação ativa
  useEffect(() => {
    const hasActiveImport = history.some(item => item.status === 'pending' || item.status === 'processing');
    if (!hasActiveImport) return;

    const interval = setInterval(() => {
      fetchHistory(false);
    }, 4000);

    return () => clearInterval(interval);
  }, [history]);

  const handleRename = async (id) => {
    if (!editName.trim()) {
      toast.error("O nome da lista não pode ser vazio.");
      return;
    }
    setRenaming(true);
    try {
      const response = await fetchWithAuth(`${API_URL}/leads/import/${id}/rename`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ filename: editName })
      }, activeClient.id);

      if (response && response.ok) {
        toast.success("Lista renomeada com sucesso!");
        setEditingId(null);
        fetchHistory(false);
      } else {
        toast.error("Erro ao renomear lista.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Erro ao renomear lista.");
    } finally {
      setRenaming(false);
    }
  };

  const executeDelete = async () => {
    setDeleting(true);
    try {
      if (deleteModal.type === 'single') {
        const response = await fetchWithAuth(`${API_URL}/leads/import/${deleteModal.targetId}`, {
          method: 'DELETE'
        }, activeClient.id);
        if (response && response.ok) {
          toast.success("Histórico deletado com sucesso!");
          setSelectedIds(prev => prev.filter(id => id !== deleteModal.targetId));
          fetchHistory(false);
        } else {
          toast.error("Erro ao deletar histórico.");
        }
      } else if (deleteModal.type === 'bulk') {
        const response = await fetchWithAuth(`${API_URL}/leads/import/bulk-delete`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ import_ids: selectedIds })
        }, activeClient.id);
        if (response && response.ok) {
          toast.success("Históricos selecionados deletados com sucesso!");
          setSelectedIds([]);
          fetchHistory(false);
        } else {
          toast.error("Erro ao deletar históricos selecionados.");
        }
      }
    } catch (err) {
      console.error(err);
      toast.error("Erro na operação de deleção.");
    } finally {
      setDeleting(false);
      setDeleteModal({ isOpen: false, type: null, targetId: null });
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(history.map(item => item.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectItem = (id, checked) => {
    if (checked) {
      setSelectedIds(prev => [...prev, id]);
    } else {
      setSelectedIds(prev => prev.filter(item => item !== id));
    }
  };

  const allSelected = history.length > 0 && selectedIds.length === history.length;

  return (
    <div className="p-8 max-w-7xl mx-auto animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-xl shadow-lg shadow-blue-500/20">
              <FiClock className="text-white" />
            </div>
            Histórico de Importação de Contatos
          </h1>
          <p className="text-gray-550 dark:text-gray-400 mt-2">
            Acompanhe o progresso e gerencie os nomes das listas carregadas em segundo plano.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Mostrar:</span>
            <select
              value={limit}
              onChange={(e) => {
                const val = e.target.value;
                setLimit(val === 'all' ? 'all' : parseInt(val, 10));
                setPage(0);
              }}
              className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer shadow-sm text-gray-700 dark:text-gray-200"
            >
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={500}>500</option>
              <option value="all">Tudo</option>
            </select>
          </div>

          <button 
            onClick={() => fetchHistory(true)}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-all shadow-sm"
          >
            <FiRefreshCw className={loading ? 'animate-spin' : ''} />
            Atualizar
          </button>
        </div>
      </div>

      {selectedIds.length > 0 && (
        <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30 p-4 rounded-2xl mb-6 animate-in slide-in-from-top-4 duration-200">
          <span className="text-xs font-semibold text-blue-700 dark:text-blue-400">
            {selectedIds.length} lista(s) selecionada(s)
          </span>
          <button
            onClick={() => setDeleteModal({ isOpen: true, type: 'bulk', targetId: null })}
            className="flex items-center gap-2 px-4 py-2 bg-red-650 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
          >
            <FiTrash2 size={14} />
            Excluir Selecionados
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-500 dark:text-gray-400">
          <FiLoader size={36} className="animate-spin text-blue-500 mb-4" />
          <p className="text-sm font-semibold">Carregando histórico de importações...</p>
        </div>
      ) : history.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400 border border-dashed border-gray-200 dark:border-gray-700 rounded-2xl">
          <FiFileText size={48} className="mb-4 text-gray-300 dark:text-gray-600" />
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Nenhuma lista carregada</p>
          <p className="text-xs text-gray-500 mt-1">As importações que você realizar por planilha ou CSV aparecerão aqui.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-3 px-6 py-2 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
            <input 
              type="checkbox"
              checked={allSelected}
              onChange={handleSelectAll}
              className="rounded border-gray-300 dark:border-gray-700 text-blue-600 focus:ring-blue-500 h-4 w-4 cursor-pointer"
            />
            <span>Selecionar todos</span>
          </div>

          <div className="bg-white/5 dark:bg-gray-800/20 border border-gray-150 dark:border-gray-700/60 rounded-2xl overflow-hidden divide-y divide-gray-100 dark:divide-gray-700/40 shadow-sm backdrop-blur-md">
            {history.map((item) => {
              const total = item.total_rows || 0;
              const processed = (item.imported_rows || 0) + (item.error_rows || 0);
              const percentage = total > 0 ? Math.min(Math.round((processed / total) * 100), 100) : 0;
              // Para importações concluídas/falhas, exibe quando TERMINOU (updated_at).
              // Para importações em andamento, exibe quando foi INICIADA (created_at).
              const isFinished = item.status === 'completed' || item.status === 'failed';
              const dateLabel = isFinished ? 'Concluída em' : 'Iniciada em';
              const dateSource = isFinished && item.updated_at ? item.updated_at : item.created_at;
              const dateStr = parseDateSafe(dateSource);
              const isSelected = selectedIds.includes(item.id);

              return (
                <div key={item.id} className="p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6 hover:bg-white/10 dark:hover:bg-gray-800/10 transition-all">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="flex items-center h-12">
                      <input 
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => handleSelectItem(item.id, e.target.checked)}
                        className="rounded border-gray-300 dark:border-gray-700 text-blue-600 focus:ring-blue-500 h-4 w-4 cursor-pointer"
                      />
                    </div>
                    
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl border border-blue-100 dark:border-blue-800/20 shrink-0">
                      <FiFileText size={24} />
                    </div>
                    
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-3">
                        {editingId === item.id ? (
                          <div className="flex items-center gap-2">
                            <input 
                              type="text"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="px-3 py-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="Nome da lista"
                            />
                            <button 
                              disabled={renaming}
                              onClick={() => handleRename(item.id)}
                              className="p-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                              title="Salvar"
                            >
                              <FiCheck size={16} />
                            </button>
                            <button 
                              onClick={() => setEditingId(null)}
                              className="p-1.5 bg-gray-150 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                              title="Cancelar"
                            >
                              <FiX size={16} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <h3 className="text-base font-bold text-gray-900 dark:text-white leading-tight">
                              {item.filename}
                            </h3>
                            <button 
                              onClick={() => {
                                setEditingId(item.id);
                                setEditName(item.filename);
                              }}
                              className="p-1 text-gray-400 hover:text-blue-500 rounded-lg transition-colors"
                              title="Renomear lista"
                            >
                              <FiEdit2 size={14} />
                            </button>
                          </div>
                        )}

                        <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                          {dateLabel}: {dateStr}
                        </span>
                      </div>

                      {/* Progress details */}
                      {(item.status === 'processing' || item.status === 'pending' || item.status === 'completed') && total > 0 && (
                        <div className="space-y-2 max-w-xl">
                          <div className="w-full bg-gray-100 dark:bg-gray-700/50 rounded-full h-2 overflow-hidden shadow-inner">
                            <div 
                              className={`h-full transition-all duration-500 rounded-full ${
                                item.status === 'completed' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]'
                              }`}
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                          <div className="flex items-center gap-4 text-xs font-semibold text-gray-500 dark:text-gray-400">
                            <span className={item.status === 'completed' ? 'text-emerald-500' : 'text-blue-500'}>
                              {percentage}% Concluído
                            </span>
                            <span>•</span>
                            <span>{processed} de {total} contatos</span>
                            {item.error_rows > 0 && (
                              <>
                                <span>•</span>
                                <span className="text-red-500">{item.error_rows} erros</span>
                              </>
                            )}
                          </div>
                        </div>
                      )}

                      {item.status === 'failed' && (
                        <div className="p-3 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-800/20 rounded-xl max-w-xl flex items-start gap-2 text-red-600 dark:text-red-400 text-xs">
                          <FiAlertTriangle className="shrink-0 mt-0.5" />
                          <div>
                            <p className="font-bold">Falha no processamento:</p>
                            <p className="mt-0.5 font-medium">{item.error_message || 'Erro indefinido.'}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center justify-end gap-3">
                    <div className="flex flex-col items-end gap-1.5">
                      {item.status === 'pending' && (
                        <span className="px-3 py-1.5 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-800/30 rounded-xl text-xs font-bold flex items-center gap-2">
                          <FiLoader className="animate-spin" size={14} /> Aguardando fila
                        </span>
                      )}
                      {item.status === 'processing' && (
                        <span className="px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800/30 rounded-xl text-xs font-bold flex items-center gap-2">
                          <FiLoader className="animate-spin" size={14} /> Importando...
                        </span>
                      )}
                      {item.status === 'completed' && (
                        <span className="px-3 py-1.5 bg-emerald-50/80 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800/30 rounded-xl text-xs font-bold flex items-center gap-2">
                          <FiCheckCircle size={14} /> Concluída ({item.imported_rows} contatos)
                        </span>
                      )}
                      {item.status === 'failed' && (
                        <span className="px-3 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-800/30 rounded-xl text-xs font-bold flex items-center gap-2">
                          <FiAlertTriangle size={14} /> Importação Falhou
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => setDeleteModal({ isOpen: true, type: 'single', targetId: item.id })}
                      className="p-2 hover:bg-red-50 dark:hover:bg-red-950/20 text-gray-400 hover:text-red-650 rounded-xl transition-all"
                      title="Deletar este histórico"
                    >
                      <FiTrash size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Pagination Controls */}
      {limit !== 'all' && total > limit && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 bg-white/5 dark:bg-gray-800/20 border border-gray-150 dark:border-gray-700/60 p-4 rounded-2xl shadow-sm backdrop-blur-md">
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
            Mostrando {page * limit + 1} - {Math.min((page + 1) * limit, total)} de {total} listas
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(prev => Math.max(0, prev - 1))}
              disabled={page === 0}
              className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 transition-all shadow-sm"
            >
              Anterior
            </button>
            <button
              onClick={() => setPage(prev => ((prev + 1) * limit < total ? prev + 1 : prev))}
              disabled={(page + 1) * limit >= total}
              className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 transition-all shadow-sm"
            >
              Próxima
            </button>
          </div>
        </div>
      )}

      {/* Popup Modal de Confirmação de Deleção Premium */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100 dark:border-gray-700 animate-in zoom-in-95 duration-200 p-6">
            <div className="flex items-center gap-3 text-red-600 mb-4">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <FiAlertTriangle size={20} />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Confirmar Exclusão
              </h3>
            </div>
            
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
              Tem certeza que deseja apagar {deleteModal.type === 'bulk' ? `as ${selectedIds.length} listas selecionadas` : 'esta lista'} do histórico? Essa ação é permanente e não poderá ser desfeita. (Isso apagará apenas o registro do histórico de importação, não afetará os contatos criados).
            </p>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteModal({ isOpen: false, type: null, targetId: null })}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 text-xs font-semibold rounded-xl transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={executeDelete}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-red-500/20 flex items-center gap-1.5"
              >
                {deleting ? <FiLoader className="animate-spin" /> : <FiTrash2 />}
                Confirmar e Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
