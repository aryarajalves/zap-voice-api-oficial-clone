import React, { useEffect, useState, useRef } from 'react';
import { FiFileText, FiLoader, FiTrash2 } from 'react-icons/fi';
import { useClient } from '../../contexts/ClientContext';
import { API_URL } from '../../config';
import { fetchWithAuth } from '../../AuthContext';
import { toast } from 'react-hot-toast';
import ImportResultsModal from './components/ImportResultsModal';

// Subcomponentes Modulares
import ImportHistoryHeader from './components/ImportHistory/ImportHistoryHeader';
import ImportHistoryCard from './components/ImportHistory/ImportHistoryCard';
import ImportHistoryPagination from './components/ImportHistory/ImportHistoryPagination';
import DeleteImportHistoryModal from './components/ImportHistory/DeleteImportHistoryModal';

export default function ImportHistoryPage({ onNavigateToLeads }) {
  const { activeClient } = useClient();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [renaming, setRenaming] = useState(false);
  const [tick, setTick] = useState(0); // incrementado a cada segundo para atualizar o cronômetro

  // Guarda { importId → { time, rows } } para calcular taxa e ETA.
  // Inicializa do sessionStorage para sobreviver a navegações.
  const processingStartRef = useRef((() => {
    try {
      return JSON.parse(sessionStorage.getItem('import_start_times') || '{}');
    } catch {
      return {};
    }
  })());

  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);

  // States para deleção e seleção
  const [selectedIds, setSelectedIds] = useState([]);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, type: null, targetId: null });
  const [deleting, setDeleting] = useState(false);
  const [resultsModal, setResultsModal] = useState({ isOpen: false, item: null });

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

  // Registra o momento em que cada item entrou em "processing"
  useEffect(() => {
    let changed = false;
    history.forEach(item => {
      if (item.status === 'processing' && !processingStartRef.current[item.id]) {
        processingStartRef.current[item.id] = {
          time: Date.now(),
          rows: (item.imported_rows || 0) + (item.error_rows || 0)
        };
        changed = true;
      }
      if ((item.status === 'completed' || item.status === 'failed') && processingStartRef.current[item.id]) {
        delete processingStartRef.current[item.id];
        changed = true;
      }
    });
    if (changed) {
      try {
        sessionStorage.setItem('import_start_times', JSON.stringify(processingStartRef.current));
      } catch {}
    }
  }, [history]);

  // Tick de 1 segundo para atualizar o cronômetro ao vivo
  useEffect(() => {
    const hasProcessing = history.some(item => item.status === 'processing');
    if (!hasProcessing) return;
    const interval = setInterval(() => setTick(t => t + 1), 1000);
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
      <ImportHistoryHeader
        limit={limit}
        setLimit={setLimit}
        setPage={setPage}
        onNavigateToLeads={onNavigateToLeads}
        fetchHistory={fetchHistory}
        loading={loading}
      />

      {selectedIds.length > 0 && (
        <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30 p-4 rounded-2xl mb-6 animate-in slide-in-from-top-4 duration-200">
          <span className="text-xs font-semibold text-blue-700 dark:text-blue-400">
            {selectedIds.length} lista(s) selecionada(s)
          </span>
          <button
            onClick={() => setDeleteModal({ isOpen: true, type: 'bulk', targetId: null })}
            className="flex items-center gap-2 px-4 py-2 bg-red-650 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
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

          {/* tick usado para forçar re-render do cronômetro a cada segundo */}
          <div data-tick={tick} className="bg-white/5 dark:bg-gray-800/20 border border-gray-150 dark:border-gray-700/60 rounded-2xl overflow-hidden divide-y divide-gray-100 dark:divide-gray-700/40 shadow-sm backdrop-blur-md">
            {history.map((item) => (
              <ImportHistoryCard
                key={item.id}
                item={item}
                isSelected={selectedIds.includes(item.id)}
                onSelectItem={handleSelectItem}
                editingId={editingId}
                setEditingId={setEditingId}
                editName={editName}
                setEditName={setEditName}
                renaming={renaming}
                onRename={handleRename}
                startInfo={processingStartRef.current[item.id]}
                onOpenResultsModal={(it) => setResultsModal({ isOpen: true, item: it })}
                onOpenDeleteModal={(id) => setDeleteModal({ isOpen: true, type: 'single', targetId: id })}
              />
            ))}
          </div>
        </div>
      )}

      {/* Pagination Controls */}
      <ImportHistoryPagination
        limit={limit}
        total={total}
        page={page}
        setPage={setPage}
      />

      <ImportResultsModal
        isOpen={resultsModal.isOpen}
        importItem={resultsModal.item}
        onClose={() => setResultsModal({ isOpen: false, item: null })}
      />

      {/* Popup Modal de Confirmação de Deleção */}
      <DeleteImportHistoryModal
        isOpen={deleteModal.isOpen}
        type={deleteModal.type}
        selectedCount={selectedIds.length}
        deleting={deleting}
        onClose={() => setDeleteModal({ isOpen: false, type: null, targetId: null })}
        onConfirm={executeDelete}
      />
    </div>
  );
}
